from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.tools import Tool
from langchain_core.prompts import PromptTemplate
from langchain_community.llms import Ollama
from langchain.callbacks.base import BaseCallbackHandler
from langchain.schema import AgentAction, AgentFinish, LLMResult
from typing import Dict, List, Any, Optional, Union
from .database_service import DatabaseService
import os
import logging
import threading
import requests
import json
import re
import time
from langchain.agents.agent import AgentOutputParser
from langchain.schema import OutputParserException
from ..utils.logging_utils import setup_logger, log_execution_time, get_request_id, get_process_id, create_process_banner, COLORS, ANSI_ENABLED

# Configure logger
logger = setup_logger('agent_service')

class JsonAwareOutputParser(AgentOutputParser):
    """Output parser that can handle JSON responses from LLMs."""
    
    def __init__(self, base_parser):
        """Initialize with a base parser to delegate to for non-JSON responses."""
        self.base_parser = base_parser
        
    def parse(self, text: str) -> Union[AgentAction, AgentFinish]:
        """Parse the output of an LLM call.
        
        Args:
            text: LLM output
            
        Returns:
            AgentAction or AgentFinish
        """
        # Check if this is a Final Answer
        if "Final Answer:" in text:
            try:
                return self.base_parser.parse(text)
            except Exception as e:
                logger.warning(f"Error parsing final answer: {str(e)}")
                # Extract the final answer and create a proper AgentFinish
                final_answer_match = re.search(r"Final Answer:\s*(.+?)(?:\n|$)", text, re.DOTALL)
                if final_answer_match:
                    final_answer = final_answer_match.group(1).strip()
                    return AgentFinish(
                        return_values={"output": final_answer},
                        log=text
                    )
        
        # Check if the response appears to be JSON
        if ('{' in text and '}' in text) or ('```json' in text.lower()):
            try:
                # Try to extract JSON content - either from code blocks or directly
                json_match = None
                if '```json' in text.lower():
                    json_match = re.search(r'```json\s*(.+?)\s*```', text, re.DOTALL)
                    if json_match:
                        json_content = json_match.group(1).strip()
                else:
                    json_match = re.search(r'\{.+?\}', text, re.DOTALL)
                    if json_match:
                        json_content = json_match.group(0).strip()
                
                if json_match:
                    # Try to parse the JSON to validate it
                    try:
                        json_data = json.loads(json_content)
                        logger.info("Successfully parsed JSON response")
                        
                        # Check if the JSON has the expected fields
                        if isinstance(json_data, dict):
                            # If JSON contains a Final Answer, return it directly
                            if "Final Answer" in json_data:
                                return AgentFinish(
                                    return_values={"output": json_data["Final Answer"]},
                                    log=text
                                )
                            
                            # If JSON contains Action and Action Input, use them
                            if "Action" in json_data and "Action Input" in json_data:
                                return AgentAction(
                                    tool=json_data["Action"],
                                    tool_input=json_data["Action Input"],
                                    log=f"Thought: {json_data.get('Thought', 'Processing JSON data')}\nAction: {json_data['Action']}\nAction Input: {json_data['Action Input']}"
                                )
                    except json.JSONDecodeError:
                        logger.warning("Failed to parse extracted JSON content")
                    
                    # Convert JSON to proper format
                    logger.info("Converting JSON response to proper format")
                    formatted_text = "Thought: I found some data in JSON format\n"
                    formatted_text += "Action: database\n"
                    formatted_text += f"Action Input: Process the following JSON data: {json_content}\n"
                    
                    # Parse with the base parser
                    try:
                        return self.base_parser.parse(formatted_text)
                    except Exception as e:
                        logger.warning(f"Failed to parse formatted JSON: {str(e)}")
                        # Create a default action as a fallback
                        return AgentAction(
                            tool="database",
                            tool_input=f"Process this JSON data: {json_content[:100]}...",
                            log=formatted_text
                        )
            except Exception as e:
                logger.warning(f"Failed to process JSON response: {str(e)}")
        
        # If not JSON or parsing failed, use the base parser
        try:
            return self.base_parser.parse(text)
        except OutputParserException as e:
            # If the base parser fails, try to recover
            if "Missing 'Action:'" in str(e):
                # Add a default action if missing
                logger.warning("Adding default action to malformed response")
                formatted_text = text.strip()
                if formatted_text.startswith("Thought:"):
                    formatted_text += "\nAction: database\n"
                    formatted_text += "Action Input: Process the data from the previous step\n"
                    try:
                        return self.base_parser.parse(formatted_text)
                    except Exception as inner_e:
                        logger.warning(f"Failed to parse with added action: {str(inner_e)}")
            # Try to extract any action-like content
            action_match = re.search(r"Action:\s*(.+?)(?:\n|$)", text)
            action_input_match = re.search(r"Action Input:\s*(.+?)(?:\n|$)", text)
            if action_match and action_input_match:
                action = action_match.group(1).strip()
                action_input = action_input_match.group(1).strip()
                return AgentAction(
                    tool=action,
                    tool_input=action_input,
                    log=text
                )
            # Re-raise if we can't recover
            raise
        except Exception as e:
            # Catch any other exceptions and provide a more helpful error message
            logger.error(f"Unexpected error in output parser: {str(e)}")
            # Create a default action as a fallback
            return AgentAction(
                tool="database",
                tool_input="Process the data and provide a summary",
                log="Thought: There was an error parsing the output, falling back to default action\nAction: database\nAction Input: Process the data and provide a summary"
            )

class AgentService:
    def __init__(self, base_url=None, model=None, timeout=None):
        self.base_url = base_url or os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model = model or os.getenv('DEFAULT_LLM_MODEL', 'gemma3:12b')
        self.timeout = timeout or int(os.getenv('LLM_TIMEOUT_SECONDS', '30'))
        self.cancel_event = None
        self.request_id = get_request_id()
        self.database_service = DatabaseService()
        # Initialize action tracking for loop detection
        self.action_history = []
        self.max_repeated_actions = 3  # Maximum number of consecutive identical actions allowed
        self.loop_detected = False
        self.loop_message = None
        # Add thread lock for thread safety
        self.lock = threading.RLock()  # Reentrant lock for thread safety
        logger.info(f"Initializing AgentService with base_url={self.base_url}, model={self.model}, timeout={self.timeout}, request_id={self.request_id}")

    class CancellationHandler(BaseCallbackHandler):
        def __init__(self, cancel_event):
            self.cancel_event = cancel_event

        def on_llm_start(self, *args, **kwargs):
            if self.cancel_event and self.cancel_event.is_set():
                raise RuntimeError("Agent request was cancelled")
                
    class ConciseLoggingHandler(BaseCallbackHandler):
        """Custom callback handler for more concise agent logging."""
        def __init__(self, agent_service=None):
            super().__init__()
            self.action_count = 0
            self.thinking_steps = []
            self.agent_service = agent_service  # Reference to the parent AgentService
            self.last_check_time = time.time()  # Track when we last checked for loops
            
        def _format_log(self, prefix, message, color=None):
            """Format log message with optional color."""
            if ANSI_ENABLED and color:
                return f"{COLORS[color]}{prefix}: {message}{COLORS['RESET']}"
            return f"{prefix}: {message}"
            
        def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs) -> Any:
            """Log when LLM starts thinking."""
            logger.debug("Agent is thinking...")
            
        def on_agent_action(self, action: AgentAction, **kwargs) -> Any:
            """Log agent actions in a concise format."""
            self.action_count += 1
            tool = action.tool
            tool_input = action.tool_input
            
            # Handle case where 'Action:' is missing in the log
            if 'Action:' in action.log:
                thought = action.log.split('Action:')[0].strip()
            else:
                # If 'Action:' is missing, use the entire log as the thought
                thought = action.log.strip()
                logger.warning(f"Missing 'Action:' after 'Thought:' in agent response")
                
            if thought.startswith('Thought:'):
                thought = thought[8:].strip()
                
            # Store thinking step for later reference
            self.thinking_steps.append(thought)
            
            # Track action for loop detection
            if self.agent_service:
                action_key = f"{tool}:{tool_input}"
                
                # Use lock for thread safety when accessing shared data
                with self.agent_service.lock:
                    self.agent_service.action_history.append(action_key)
                    
                    # Check for loops - detect if the same action is being repeated too many times
                    if len(self.agent_service.action_history) >= self.agent_service.max_repeated_actions:
                        recent_actions = self.agent_service.action_history[-self.agent_service.max_repeated_actions:]
                        if len(set(recent_actions)) == 1:  # All recent actions are identical
                            logger.warning(f"Detected action loop: {action_key} repeated {self.agent_service.max_repeated_actions} times")
                            # Instead of raising an exception, set a flag to indicate loop detection
                            self.agent_service.loop_detected = True
                            self.agent_service.loop_message = f"Agent stuck in a loop repeating the same action: {tool} with input: {tool_input}"
                            # Return early without executing the action
                            return None
            
            # Log the action with color
            action_log = self._format_log(
                f"🔧 TOOL #{self.action_count}", 
                f"{tool} | Input: {tool_input}",
                "BLUE"
            )
            logger.info(action_log)
            
            # Log the thought process
            thought_log = self._format_log("💭 Thought", thought, "CYAN")
            logger.info(thought_log)
            
        def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs) -> Any:
            """Log when a tool starts."""
            tool_name = serialized.get("name", "unknown_tool")
            logger.debug(f"Starting tool: {tool_name}")
            
        def on_tool_end(self, output: str, **kwargs) -> Any:
            """Log tool output in a concise format."""
            # Format the output for better readability
            if isinstance(output, str):
                # Truncate long outputs
                if len(output) > 150:
                    truncated_output = output[:150] + "..."
                else:
                    truncated_output = output
                    
                # Clean up the output
                truncated_output = truncated_output.replace('\n', ' ').strip()
                
                # Log with color
                output_log = self._format_log("📊 Result", truncated_output, "GREEN")
                logger.info(output_log)
            else:
                # Handle non-string outputs
                logger.info(self._format_log("📊 Result", str(output)[:100], "GREEN"))
            
        def on_agent_finish(self, finish: AgentFinish, **kwargs) -> Any:
            """Log agent finish in a concise format."""
            # Check if we're in a loop before finishing - use lock for thread safety
            loop_detected = False
            if self.agent_service:
                with self.agent_service.lock:
                    loop_detected = self.agent_service.loop_detected
                    
            if loop_detected:
                logger.warning("Agent finish called but loop was detected earlier")
                # The main thread will handle the loop detection
                return
                
            output = finish.return_values.get('output', '')
            
            # Get the final thought if available
            final_thought = ""
            if finish.log:
                thought_match = re.search(r"Thought:(.+?)(?:Final Answer:|$)", finish.log, re.DOTALL)
                
            # Log the final answer with color
            final_answer = finish.return_values.get('output', '')
            final_log = self._format_log("✅ FINAL ANSWER", final_answer, "GREEN")
            logger.info(final_log)
            
            # Add a visual separator
            if ANSI_ENABLED:
                logger.info("="*50)
            else:
                logger.info("="*50)
            
        def on_llm_error(self, error: Union[Exception, KeyboardInterrupt], **kwargs) -> Any:
            """Log LLM errors."""
            error_log = self._format_log("❌ ERROR", str(error), "RED")
            logger.error(error_log)

    def _create_llm(self, settings):
        """Create an LLM instance based on settings."""
        # Extract settings with defaults
        base_url = settings.get('ollamaBaseUrl', self.base_url)
        model = settings.get('model', self.model)
        temperature = float(settings.get('temperature', 0.7))
        
        # Create callback handlers
        callbacks = []
        if self.cancel_event:
            callbacks.append(self.CancellationHandler(self.cancel_event))
            
        # Create LLM instance
        llm = Ollama(
            base_url=base_url,
            model=model,
            temperature=temperature,
            callbacks=callbacks
        )
        
        # Add additional Ollama parameters if provided
        options = settings.get('options', {})
        if options:
            for key, value in options.items():
                if value is not None and hasattr(llm, key):
                    setattr(llm, key, value)
                    
        return llm

    def _create_default_tools(self, selected_tools=None, settings=None):
        """Create a set of default tools for the agent.
        
        Args:
            selected_tools: List of tool names to include, or None for all tools
            settings: Agent settings to pass to tool functions
        """
        all_tools = {
            "search": Tool(
                name="search",
                func=lambda query: f"Search results for: {query}",
                description="Useful for searching information on the internet."
            ),
            "calculator": Tool(
                name="calculator",
                func=lambda expression: eval(expression),
                description="Useful for performing mathematical calculations."
            ),
            "database": Tool(
                name="database",
                func=lambda query: self._execute_database_query(query, settings),
                description="Useful for querying databases. You can list tables, get schema information, or run SQL queries."
            )
        }
        
        # If no specific tools are selected, return all tools
        if not selected_tools:
            return list(all_tools.values())
            
        # Otherwise, return only the selected tools
        tools = []
        for tool_name in selected_tools:
            if tool_name in all_tools:
                tools.append(all_tools[tool_name])
                
        return tools

    def _create_custom_tools(self, tool_configs):
        """Create custom tools based on configuration."""
        custom_tools = []
        
        if not tool_configs:
            return custom_tools
            
        for config in tool_configs:
            if 'name' not in config or 'description' not in config:
                continue
                
            # Log the custom tool being created
            logger.info(f"Creating custom tool: {config['name']}")
                
            # Create a tool with dynamic function
            tool = Tool(
                name=config['name'],
                func=lambda query, config=config: f"Custom tool {config['name']} executed with: {query}",
                description=config['description']
            )
            custom_tools.append(tool)
            
        return custom_tools

    @log_execution_time(logger)
    def execute_agent(self, input_data, settings, conversation_history=None):
        """Execute an agent with the given input and settings."""
        process_id = get_process_id()
        create_process_banner(logger, "AGENT EXECUTION STARTED", process_id)
        
        start_time = time.time()
        
        # Create LLM
        llm = self._create_llm(settings)
        
        # Get selected tools from settings
        selected_default_tools = settings.get('selectedTools', None)
        
        # Get tools
        default_tools = self._create_default_tools(selected_default_tools, settings)
        tools = default_tools
        
        # Log which tools are being used
        tool_names = [tool.name for tool in tools]
        logger.info(f"Using tools: {', '.join(tool_names)}")
        
        # Create agent prompt
        system_prompt = settings.get('systemPrompt', '')
        user_prompt = settings.get('userPrompt', '')
        
        # Process conversation history if available
        conversation_context = ""
        if conversation_history and len(conversation_history) > 0:
            # Get conversation history limits from settings
            history_settings = settings.get('conversationHistory', {})
            max_messages = history_settings.get('maxMessages', 5)  # Default to 5 messages
            max_message_length = history_settings.get('maxMessageLength', 500)  # Default to 500 chars
            include_history = history_settings.get('enabled', True)  # Default to enabled
            
            if not include_history:
                logger.info("Conversation history disabled in settings")
            else:
                # Log that we're using conversation history
                logger.info(f"Using conversation history with {len(conversation_history)} messages (limit: {max_messages})")
                
                # Format the conversation history with configurable limits
                recent_history = conversation_history[-max_messages:] if len(conversation_history) > max_messages else conversation_history
                formatted_history = []
                
                for msg in recent_history:
                    role = msg.get('role', 'user')
                    content = msg.get('content', '')
                    if content and len(content) > 0:
                        # Truncate very long messages based on settings
                        if len(content) > max_message_length:
                            content = content[:max_message_length] + "..."
                        formatted_history.append(f"{role.capitalize()}: {content}")
                
                if formatted_history:
                    conversation_context = "\n\nPrevious conversation:\n" + "\n".join(formatted_history) + "\n\n"
                    logger.info(f"Added {len(formatted_history)} messages from conversation history to agent context (max length: {max_message_length})")
                    logger.debug(f"Total conversation context length: {len(conversation_context)} characters")
        
        # Build the prompt template
        # Use user_prompt if provided, otherwise use default prompt
        if user_prompt:
            # Combine system prompt, conversation context, and user prompt
            prompt_template = f"""
{system_prompt}

You are an AI assistant that can use tools to help answer questions.
You have access to the following tools:

{{tools}}

IMPORTANT: You MUST follow this exact format for all responses:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of {{tool_names}}
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

NOTE: If you receive JSON data, DO NOT just return the raw JSON. Instead, follow the format above:
1. Start with "Thought: I received JSON data..."
2. Then "Action: [appropriate tool]"
3. Then "Action Input: [what to do with the JSON]"

Even if you want to return JSON data to the user, you MUST wrap it in the format above.
{conversation_context}
{user_prompt}

Question: {{input}}
{{agent_scratchpad}}
"""
        else:
            # Default prompt template with conversation context
            prompt_template = f"""
{system_prompt}

You are an AI assistant that can use tools to help answer questions.
You have access to the following tools:

{{tools}}

IMPORTANT: You MUST follow this exact format for all responses:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of {{tool_names}}
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

NOTE: If you receive JSON data, DO NOT just return the raw JSON. Instead, follow the format above:
1. Start with "Thought: I received JSON data..."
2. Then "Action: [appropriate tool]"
3. Then "Action Input: [what to do with the JSON]"

Even if you want to return JSON data to the user, you MUST wrap it in the format above.
{conversation_context}
Question: {{input}}
{{agent_scratchpad}}
"""

        prompt = PromptTemplate.from_template(prompt_template)
        
        try:
            # Create the agent
            agent = create_react_agent(llm=llm, tools=tools, prompt=prompt)
            
            # In newer versions of LangChain, the agent might be a RunnableSequence
            # We need to check the agent type before accessing output_parser
            try:
                if hasattr(agent, 'output_parser'):
                    # Direct access for older versions
                    original_parser = agent.output_parser
                    agent.output_parser = JsonAwareOutputParser(original_parser)
                    logger.info("Using direct output parser replacement")
                else:
                    # For newer versions where agent is a RunnableSequence
                    logger.info("Agent is a RunnableSequence, skipping custom output parser")
                    # We'll rely on the handle_parsing_errors parameter in AgentExecutor instead
            except Exception as e:
                logger.warning(f"Could not set custom output parser: {str(e)}")
            
            # Create callback handlers
            callbacks = []
            if self.cancel_event:
                callbacks.append(self.CancellationHandler(self.cancel_event))
            callbacks.append(self.ConciseLoggingHandler(agent_service=self))
            
            # Create agent executor with custom callbacks
            agent_executor = AgentExecutor(
                agent=agent, 
                tools=tools, 
                verbose=False,  # Turn off default verbose output
                callbacks=callbacks,
                handle_parsing_errors=True,  # Handle parsing errors gracefully
                max_iterations=10  # Limit iterations to prevent infinite loops
            )
            
            # Execute the agent with retry mechanism
            logger.info(f"Executing agent with input: {input_data[:100]}{'...' if len(input_data) > 100 else ''}")
            
            max_retries = 3
            retry_count = 0
            last_error = None
            
            while retry_count < max_retries:
                try:
                    # Set a timeout for the agent execution using a thread-safe approach
                    # Execute with timeout to prevent hanging
                    try:
                        # Reset action history for this execution
                        self.action_history = []
                        
                        # Use threading.Timer for a thread-safe timeout implementation
                        import threading
                        import queue
                        
                        # Create a queue to hold the result
                        result_queue = queue.Queue()
                        timeout_occurred = threading.Event()
                        
                        # Function to execute in a separate thread
                        def execute_agent():
                            try:
                                # Reset loop detection flag before execution
                                self.loop_detected = False
                                self.loop_message = None
                                
                                # Execute the agent
                                agent_result = agent_executor.invoke({"input": input_data})
                                
                                # Check if a loop was detected during execution
                                if self.loop_detected:
                                    logger.warning(f"Loop detected during execution: {self.loop_message}")
                                    if not timeout_occurred.is_set():
                                        result_queue.put((False, "loop_detected"))
                                elif not timeout_occurred.is_set():
                                    result_queue.put((True, agent_result))
                            except Exception as e:
                                if not timeout_occurred.is_set():
                                    result_queue.put((False, e))
                        
                        # Create and start the execution thread
                        execution_thread = threading.Thread(target=execute_agent)
                        execution_thread.daemon = True  # Allow the thread to be terminated when the main thread exits
                        execution_thread.start()
                        
                        # Wait for the thread to complete or timeout
                        timeout_seconds = 120  # 2 minute timeout
                        
                        # Check periodically for loop detection or timeout
                        start_time = time.time()
                        while execution_thread.is_alive() and (time.time() - start_time) < timeout_seconds:
                            # Check if loop was detected - use lock for thread safety
                            loop_detected = False
                            loop_message = None
                            with self.lock:
                                loop_detected = self.loop_detected
                                loop_message = self.loop_message
                                
                            if loop_detected:
                                timeout_occurred.set()  # Signal to the thread that we're stopping
                                logger.warning(f"Loop detected: {loop_message}")
                                return "I noticed I was repeating the same actions without making progress. Please provide more specific instructions."
                            
                            # Sleep briefly before checking again
                            time.sleep(0.5)
                        
                        # Check if the thread is still alive (timeout occurred)
                        if execution_thread.is_alive():
                            timeout_occurred.set()  # Signal to the thread that a timeout occurred
                            logger.warning(f"Agent execution timed out after {timeout_seconds} seconds")
                            return "Agent execution timed out. Please try again with a more specific query."
                        
                        # Get the result from the queue if available
                        if not result_queue.empty():
                            success, value = result_queue.get(block=False)
                            if success:
                                result = value
                            elif value == "loop_detected":
                                # Handle loop detection gracefully
                                logger.warning("Agent was stuck in a loop and has been stopped")
                                return "I noticed I was repeating the same actions without making progress. Let me try a different approach or please provide more specific instructions."
                            else:
                                # Check if this is a loop detection error from another source
                                if isinstance(value, Exception) and "stuck in a loop" in str(value):
                                    logger.warning(f"Loop detected via exception: {str(value)}")
                                    return "I noticed I was repeating the same actions without making progress. Please provide more specific instructions."
                                # Re-raise the exception that occurred in the thread
                                raise value
                        else:
                            # Check if loop was detected but not properly communicated through the queue
                            if self.loop_detected:
                                logger.warning(f"Loop detected but not in queue: {self.loop_message}")
                                return "I noticed I was repeating the same actions without making progress. Please provide more specific instructions."
                            logger.warning("Agent execution completed but no result was returned")
                            return "Agent execution completed but no result was returned. Please try again."
                            
                    except queue.Empty:
                        logger.warning("Agent execution result queue was empty")
                        return "Agent execution failed to return a result. Please try again."
                    
                    # Check if result is None or empty
                    if not result or not result.get('output'):
                        logger.warning("Agent returned empty result")
                        if retry_count < max_retries - 1:
                            retry_count += 1
                            continue
                        else:
                            return "Agent stopped due to iteration limit or time limit."
                    
                    break  # Success, exit the retry loop
                except Exception as e:
                    retry_count += 1
                    last_error = e
                    logger.warning(f"Agent execution failed (attempt {retry_count}/{max_retries}): {str(e)}")
                    
                    if retry_count < max_retries:
                        # Add more explicit instructions for the next attempt
                        if "format" in str(e).lower() or "parsing" in str(e).lower():
                            logger.info("Retrying with more explicit format instructions")
                            # Create a new prompt with more explicit instructions
                            new_prompt_template = prompt_template + "\n\nREMEMBER: You MUST follow the exact format specified above. DO NOT return raw JSON or skip any sections."
                            new_prompt = PromptTemplate.from_template(new_prompt_template)
                            
                            # Create a new agent with the updated prompt
                            agent = create_react_agent(llm=llm, tools=tools, prompt=new_prompt)
                            
                            # Create a new executor with the updated agent
                            agent_executor = AgentExecutor(
                                agent=agent,
                                tools=tools,
                                verbose=False,
                                callbacks=callbacks,
                                handle_parsing_errors=True,
                                max_iterations=10
                            )
                        elif "iteration limit" in str(e).lower() or "max iterations" in str(e).lower():
                            # Handle iteration limit errors
                            logger.warning("Agent reached maximum iterations")
                            return "Agent reached maximum number of steps. Please try a more specific query."
                    else:
                        # Max retries reached, return a user-friendly message instead of raising
                        logger.error(f"All retry attempts failed: {str(last_error)}")
                        return "Agent execution failed after multiple attempts. Please try again with a different query."
            
            # Log completion
            execution_time = time.time() - start_time
            logger.info(f"Agent execution completed in {execution_time:.2f}s")
            
            # Format the result
            output = result.get('output', '')
            
            # Create completion banner
            if ANSI_ENABLED:
                completion_banner = f"{COLORS['MAGENTA']}{COLORS['BOLD']}" \
                        f"AGENT EXECUTION COMPLETED [PROCESS: {process_id}]\n" \
                        f"EXECUTION TIME: {execution_time:.2f}s{COLORS['RESET']}"
            else:
                completion_banner = f"AGENT EXECUTION COMPLETED [PROCESS: {process_id}]\n" \
                        f"EXECUTION TIME: {execution_time:.2f}s"
            logger.info(completion_banner)
            
            return output
            
        except Exception as e:
            # Create error banner
            if ANSI_ENABLED:
                error_banner = f"{COLORS['RED']}{COLORS['BOLD']}" \
                        f"AGENT EXECUTION FAILED [PROCESS: {process_id}]\n" \
                        f"ERROR: {str(e)}{COLORS['RESET']}"
            else:
                error_banner = f"AGENT EXECUTION FAILED [PROCESS: {process_id}]\n" \
                        f"ERROR: {str(e)}"
            logger.error(error_banner)
            raise
            
    def _execute_database_query(self, query, settings=None):
        """Execute a database query using the DatabaseService.
        
        Args:
            query: Natural language query or SQL query with 'SQL:' prefix
            settings: Agent settings containing database configuration
            
        Returns:
            Formatted string with query results
        """
        try:
            logger.info(f"Executing database query: {query}")
            
            # Initialize connection variables
            connection_id = 'default'
            connection_name = 'Default Connection'
            connection_string = None
            
            # Get connection details from settings if provided
            if settings and settings.get('selectedTools', []) and 'database' in settings.get('selectedTools', []):
                connection_id = settings.get('dbConnectionId', 'default')
                connection_name = settings.get('dbConnectionName', 'Default Connection')
                connection_string = settings.get('dbConnectionString')
            
            # If no connection string in settings, try to get from environment
            if not connection_string:
                connection_string = os.getenv('DATABASE_URI')
                
            # If still no connection string, return error
            if not connection_string:
                return "Error: No database connection string provided in settings or environment variables"
                
            # Add or update the connection
            logger.info(f"Setting up database connection {connection_id} for database query")
            connection_added = self.database_service.add_connection(
                connection_id=connection_id,
                connection_string=connection_string,
                name=connection_name
            )
            
            if not connection_added:
                return f"Error: Failed to establish database connection to {connection_string}"
            
            # Execute the query with the configured connection
            result = self.database_service.execute_database_tool(query, connection_id)
            
            # Format the result for the agent
            if "error" in result:
                return f"Error: {result['error']}"
                
            if result.get("result_type") == "connections":
                connections = result.get("connections", [])
                conn_info = [f"{conn['name']} (ID: {conn['id']})" for conn in connections]
                return f"Available database connections:\n" + "\n".join(conn_info)
                
            elif result.get("result_type") == "tables":
                tables = result.get("tables", [])
                return f"Available tables: {', '.join(tables)}"
                
            elif result.get("result_type") == "schema":
                schema = result.get("schema", {})
                table_name = schema.get("table_name")
                columns = schema.get("columns", [])
                
                column_info = [f"{col['name']} ({col['type']})" for col in columns]
                pk_info = f"Primary keys: {', '.join(schema.get('primary_keys', []))}" if schema.get('primary_keys') else ""
                
                result_text = f"Schema for table {table_name}:\n" + "\n".join(column_info)
                if pk_info:
                    result_text += f"\n\n{pk_info}"
                    
                # Add foreign key information if available
                if schema.get('foreign_keys'):
                    fk_info = []
                    for fk in schema.get('foreign_keys', []):
                        fk_info.append(f"{', '.join(fk['column'])} → {fk['references']['table']}({', '.join(fk['references']['column'])})")
                    result_text += f"\n\nForeign keys:\n" + "\n".join(fk_info)
                    
                return result_text
                
            elif result.get("result_type") == "count":
                count = result.get("count", 0)
                return f"Count: {count}"
                
            elif result.get("result_type") == "query_results":
                results = result.get("results", [])
                
                if not results:
                    return "Query executed successfully. No results returned."
                    
                # Format as a table
                if isinstance(results, list) and len(results) > 0:
                    # Get column names from first row
                    columns = list(results[0].keys())
                    
                    # Calculate column widths for better formatting
                    col_widths = {col: len(col) for col in columns}
                    for row in results[:10]:
                        for col in columns:
                            val_str = str(row.get(col, ""))
                            col_widths[col] = max(col_widths[col], min(len(val_str), 30))
                    
                    # Format header
                    header = " | ".join(col.ljust(col_widths[col]) for col in columns)
                    separator = "-" * len(header)
                    
                    # Format rows
                    rows = []
                    for row in results[:10]:  # Limit to 10 rows
                        row_values = [str(row.get(col, ""))[:30].ljust(col_widths[col]) for col in columns]
                        rows.append(" | ".join(row_values))
                    
                    result_str = f"{header}\n{separator}\n" + "\n".join(rows)
                    
                    if len(results) > 10:
                        result_str += f"\n... and {len(results) - 10} more rows"
                        
                    # Include the SQL if it was generated from NL
                    if result.get("sql"):
                        result_str += f"\n\nGenerated SQL: {result.get('sql')}"
                        
                    return result_str
                else:
                    return str(results)
            else:
                return str(result)
                
        except Exception as e:
            logger.error(f"Error executing database query: {str(e)}")
            return f"Error executing database query: {str(e)}"
    
    def cancel_execution(self):
        """Cancel the current agent execution."""
        if not self.cancel_event:
            self.cancel_event = threading.Event()
        self.cancel_event.set()
        logger.info("Agent execution cancellation requested")
