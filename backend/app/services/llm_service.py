from langchain_community.llms import Ollama
from langchain.schema import HumanMessage, SystemMessage
from langchain.callbacks.base import BaseCallbackHandler
import os
import logging
import threading
import requests
import json
import re
import jsonschema
import time
from ..utils.logging_utils import setup_logger, log_execution_time, get_request_id, get_process_id, set_process_id, create_process_banner, COLORS, ANSI_ENABLED

# Configure logger
logger = setup_logger('llm_service')

class LLMService:
    def __init__(self, base_url=None, model=None, timeout=None):
        self.base_url = base_url or os.getenv('OLLAMA_BASE_URL', 'http://100.106.220.16:11434')
        self.model = model or os.getenv('DEFAULT_LLM_MODEL', 'gemma3:12b')
        self.timeout = timeout or int(os.getenv('LLM_TIMEOUT_SECONDS', '30'))
        self.cancel_event = None
        self.request_id = get_request_id()
        logger.info(f"Initializing LLMService with base_url={self.base_url}, model={self.model}, timeout={self.timeout}, request_id={self.request_id}")

    class CancellationHandler(BaseCallbackHandler):
        def __init__(self, cancel_event):
            self.cancel_event = cancel_event

        def on_llm_start(self, *args, **kwargs):
            if self.cancel_event and self.cancel_event.is_set():
                raise RuntimeError("LLM request was cancelled")

    @log_execution_time(logger)
    def generate(self, prompt, settings=None, conversation_history=None):
        # Generate a unique process ID for this LLM generation
        process_id = get_process_id()
        create_process_banner(logger, "LLM GENERATION STARTED", process_id)
        
        if not prompt:
            logger.error("Prompt cannot be empty")
            raise ValueError("Prompt cannot be empty")

        settings = settings or {}        
        system_prompt = settings.get('systemPrompt', '')
        user_prompt = settings.get('userPrompt', '')
        base_url = settings.get('ollamaBaseUrl', self.base_url)
        model = settings.get('model', self.model)
        temperature = settings.get('temperature', 0.8)
        num_ctx = settings.get('numCtx', 2048)        
        streaming = settings.get('streaming', True)        
        
        logger.info(f"LLM request - Model: {model}, Temperature: {temperature}, Streaming: {streaming}")
        logger.debug(f"System prompt length: {len(system_prompt)}, User prompt length: {len(user_prompt)}")
        
        # Get structured output schema if available
        structured_output = settings.get('structuredOutput', {})
        use_structured_output = structured_output.get('enabled', False)
        schema_properties = structured_output.get('properties', [])
        
        # Additional Ollama parameters
        options = settings.get('options', {})
        num_keep = options.get('num_keep', None)
        seed = options.get('seed', None)
        num_predict = options.get('num_predict', None)
        top_k = options.get('top_k', None)
        top_p = settings.get('topP', None)
        min_p = options.get('min_p', None)
        typical_p = options.get('typical_p', None)
        repeat_last_n = options.get('repeat_last_n', None)
        repeat_penalty = options.get('repeat_penalty', None)
        presence_penalty = options.get('presence_penalty', None)
        frequency_penalty = options.get('frequency_penalty', None)
        mirostat = options.get('mirostat', None)
        mirostat_tau = options.get('mirostat_tau', None)
        mirostat_eta = options.get('mirostat_eta', None)
        penalize_newline = options.get('penalize_newline', None)
        stop = options.get('stop', None)
        numa = options.get('numa', None)
        num_batch = options.get('num_batch', None)
        num_gpu = options.get('num_gpu', None)
        main_gpu = options.get('main_gpu', None)
        low_vram = options.get('low_vram', None)
        vocab_only = options.get('vocab_only', None)
        use_mmap = options.get('use_mmap', None)
        use_mlock = options.get('use_mlock', None)
        num_thread = options.get('num_thread', None)
        
        # Format conversation history into prompt
        conversation_context = ""
        if conversation_history:
            # Get conversation history limits from settings
            history_settings = settings.get('conversationHistory', {})
            max_messages = history_settings.get('maxMessages', 10)  # Default to 10 messages
            max_message_length = history_settings.get('maxMessageLength', 1000)  # Default to 1000 chars
            include_history = history_settings.get('enabled', True)  # Default to enabled
            
            if not include_history:
                logger.info("Conversation history disabled in settings")
            else:
                # Apply message count limit
                limited_history = conversation_history[-max_messages:] if len(conversation_history) > max_messages else conversation_history
                logger.info(f"DEBUG: Processing {len(limited_history)} of {len(conversation_history)} messages in conversation history (limit: {max_messages})")
                
                for idx, msg in enumerate(limited_history):
                    role = msg.get('role', '')
                    content = msg.get('content', '')
                    timestamp = msg.get('timestamp', '')
                    
                    # Apply message length limit
                    if content and len(content) > max_message_length:
                        content = content[:max_message_length] + "..."
                        
                    logger.info(f"DEBUG: History message #{idx+1} - Role: {role}, Timestamp: {timestamp}, Content: {content[:100]}{'...' if len(content) > 100 else ''}")
                    if role and content:
                        conversation_context += f"{role}: {content}\n"
                        
                logger.info(f"DEBUG: Final conversation context length: {len(conversation_context)} characters")
                logger.info(f"Using conversation history with limits: max_messages={max_messages}, max_message_length={max_message_length}")

        try:
            # Create new cancellation event
            self.cancel_event = threading.Event()
            handler = self.CancellationHandler(self.cancel_event)

            # Create Ollama client with all available parameters
            ollama_params = {
                'base_url': base_url,
                'model': model,
                'temperature': temperature,
                'timeout': self.timeout,
                'callbacks': [handler]
            }
            
            # Add additional parameters if they're provided
            if num_keep is not None: ollama_params['num_keep'] = num_keep
            if seed is not None: ollama_params['seed'] = seed
            if top_k is not None: ollama_params['top_k'] = top_k
            if min_p is not None: ollama_params['min_p'] = min_p
            if typical_p is not None: ollama_params['typical_p'] = typical_p
            if repeat_last_n is not None: ollama_params['repeat_last_n'] = repeat_last_n
            if repeat_penalty is not None: ollama_params['repeat_penalty'] = repeat_penalty
            if presence_penalty is not None: ollama_params['presence_penalty'] = presence_penalty
            if frequency_penalty is not None: ollama_params['frequency_penalty'] = frequency_penalty
            if mirostat is not None: ollama_params['mirostat'] = mirostat
            if mirostat_tau is not None: ollama_params['mirostat_tau'] = mirostat_tau
            if mirostat_eta is not None: ollama_params['mirostat_eta'] = mirostat_eta
            if penalize_newline is not None: ollama_params['penalize_newline'] = penalize_newline
            if stop is not None: ollama_params['stop'] = stop
            if numa is not None: ollama_params['numa'] = numa
            if num_ctx is not None: ollama_params['num_ctx'] = num_ctx
            if num_batch is not None: ollama_params['num_batch'] = num_batch
            if num_gpu is not None: ollama_params['num_gpu'] = num_gpu
            if main_gpu is not None: ollama_params['main_gpu'] = main_gpu
            if low_vram is not None: ollama_params['low_vram'] = low_vram
            if vocab_only is not None: ollama_params['vocab_only'] = vocab_only
            if use_mmap is not None: ollama_params['use_mmap'] = use_mmap
            if use_mlock is not None: ollama_params['use_mlock'] = use_mlock
            if num_thread is not None: ollama_params['num_thread'] = num_thread
            
            ollama = Ollama(**ollama_params)

            # Prepare system prompt with structured output schema if enabled
            modified_system_prompt = system_prompt
            if use_structured_output and schema_properties:
                # Generate JSON schema from properties
                schema = self._generate_schema_from_properties(schema_properties)
                
                # Add structured output instructions to system prompt
                schema_json = json.dumps(schema, indent=2)
                structured_output_instructions = f"\n\nYou must respond in the following JSON format that matches this JSON schema:\n{schema_json}\n\nYour response must be valid JSON that conforms to this schema."
                
                if modified_system_prompt:
                    modified_system_prompt += structured_output_instructions
                else:
                    modified_system_prompt = structured_output_instructions
                    
                logger.info(f"Using structured output schema with {len(schema['properties'])} properties")
                logger.debug(f"Schema: {schema_json}")
            
            # Combine system prompt, conversation history, and user prompt
            if conversation_context:
                full_prompt = f"{modified_system_prompt}\n\nConversation history:\n{conversation_context}\nCurrent message:\n{prompt}" if modified_system_prompt else f"Conversation history:\n{conversation_context}\nCurrent message:\n{prompt}"
                logger.info(f"Using conversation history with {conversation_context.count('\n')} messages")
                logger.info(f"DEBUG: Full prompt structure:\n1. System prompt: {len(modified_system_prompt) if modified_system_prompt else 0} chars\n2. Conversation history: {len(conversation_context)} chars\n3. Current message: {len(prompt)} chars")
            else:
                full_prompt = f"{modified_system_prompt}\n\n{prompt}" if modified_system_prompt else prompt
                logger.info("No conversation history used in prompt")
            
            # Prepare invoke parameters
            invoke_params = {
                'input': full_prompt,
                'temperature': temperature,
                'num_ctx': num_ctx,
                'stream': streaming
            }
            
            # Add additional parameters if they're provided
            if top_k is not None: invoke_params['top_k'] = top_k
            if min_p is not None: invoke_params['min_p'] = min_p
            if typical_p is not None: invoke_params['typical_p'] = typical_p
            if repeat_last_n is not None: invoke_params['repeat_last_n'] = repeat_last_n
            if repeat_penalty is not None: invoke_params['repeat_penalty'] = repeat_penalty
            if presence_penalty is not None: invoke_params['presence_penalty'] = presence_penalty
            if frequency_penalty is not None: invoke_params['frequency_penalty'] = frequency_penalty
            if stop is not None: invoke_params['stop'] = stop
            
            logger.info(f"Sending request to Ollama model {model}")
            start_time = time.time()
            response = ollama.invoke(**invoke_params)
            
            if streaming:
                result = ""
                chunk_count = 0
                for chunk in response:
                    chunk_count += 1
                    if isinstance(chunk, str):
                        result += chunk
                    elif hasattr(chunk, 'text'):
                        result += chunk.text
                logger.info(f"Received {chunk_count} streaming chunks from LLM")
            else:
                result = response
                
            completion_time = time.time() - start_time
            logger.info(f"LLM response received in {completion_time:.2f}s, length: {len(str(result))} chars")

            # Process the result if structured output is enabled
            if use_structured_output and schema_properties:
                # Try to extract JSON from the response
                try:
                    # Look for JSON pattern in the response
                    json_match = re.search(r'\{[\s\S]*\}', result)
                    if json_match:
                        json_str = json_match.group(0)
                        parsed_json = json.loads(json_str)
                        
                        # Validate against the schema
                        schema = self._generate_schema_from_properties(schema_properties)
                        
                        try:
                            jsonschema.validate(instance=parsed_json, schema=schema)
                            logger.info("Structured output validation successful")
                            logger.debug(f"Validated JSON: {json.dumps(parsed_json)[:200]}...")
                            return {
                                "content": parsed_json,
                                "schema_valid": True,
                                "schema": schema
                            }
                        except jsonschema.exceptions.ValidationError as e:
                            logger.error(f"Structured output validation failed: {str(e)}")
                            logger.debug(f"Invalid JSON: {json.dumps(parsed_json)[:200]}...")
                            return {
                                "content": parsed_json,
                                "schema_valid": False,
                                "validation_error": str(e),
                                "schema": schema
                            }
                    else:
                        logger.warning("Structured output requested but no JSON found in response")
                        logger.debug(f"Raw response (first 200 chars): {result[:200]}...")
                        return {
                            "content": result,
                            "schema_valid": False,
                            "validation_error": "No JSON found in response",
                            "raw_response": result
                        }
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON from LLM response: {str(e)}")
                    logger.debug(f"Invalid JSON content (first 200 chars): {result[:200]}...")
                    return {
                        "content": result,
                        "schema_valid": False,
                        "validation_error": f"Invalid JSON: {str(e)}",
                        "raw_response": result
                    }
            
            # Create completion banner with Windows compatibility
            if ANSI_ENABLED:
                completion_banner = f"{COLORS['MAGENTA']}{COLORS['BOLD']}" \
                        f"LLM GENERATION COMPLETED [PROCESS: {process_id}]\n" \
                        f"MODEL: {model} | TEMPERATURE: {temperature} | TIME: {completion_time:.2f}s | LENGTH: {len(str(result))} chars{COLORS['RESET']}"
            else:
                completion_banner = f"LLM GENERATION COMPLETED [PROCESS: {process_id}]\n" \
                        f"MODEL: {model} | TEMPERATURE: {temperature} | TIME: {completion_time:.2f}s | LENGTH: {len(str(result))} chars"
            logger.info(completion_banner)
            
            return result

        except Exception as e:
            if str(e) == "LLM request was cancelled":
                logger.info(f"LLM request was cancelled for process {process_id}")
                raise RuntimeError("LLM request was cancelled")
            logger.error(f"Error generating response: {str(e)}")
            # Create error banner with Windows compatibility
            if ANSI_ENABLED:
                error_banner = f"{COLORS['RED']}{COLORS['BOLD']}" \
                        f"LLM GENERATION FAILED [PROCESS: {process_id}]\n" \
                        f"MODEL: {model} | ERROR: {str(e)}{COLORS['RESET']}"
            else:
                error_banner = f"LLM GENERATION FAILED [PROCESS: {process_id}]\n" \
                        f"MODEL: {model} | ERROR: {str(e)}"
            logger.error(error_banner)
            raise RuntimeError(f"Failed to generate response: {str(e)}")
        finally:
            self.abort_controller = None
        
    @log_execution_time(logger)
    def generate_multimodal(self, prompt, image_paths=None, settings=None, conversation_history=None):
        """Generate text using a multimodal model with text and images
        
        Args:
            prompt (str): The text prompt to send to the model
            image_paths (list): List of paths to image files to include
            settings (dict): Dictionary of settings for the LLM
            conversation_history (list): List of previous conversation messages
            
        Returns:
            str or dict: The generated text or structured output
        """
        # Generate a unique process ID for this LLM generation
        process_id = get_process_id()
        create_process_banner(logger, "MULTIMODAL LLM GENERATION STARTED", process_id)
        
        if not prompt and not image_paths:
            logger.error("Both prompt and images cannot be empty")
            raise ValueError("Either prompt or images must be provided")

        settings = settings or {}        
        system_prompt = settings.get('systemPrompt', '')
        base_url = settings.get('ollamaBaseUrl', self.base_url)
        model = settings.get('model', self.model)
        temperature = settings.get('temperature', 0.8)
        num_ctx = settings.get('numCtx', 8192)        
        streaming = settings.get('streaming', False)  # Default to non-streaming for multimodal
        
        # Structured output configuration
        structured_output = settings.get('structuredOutput', {})
        use_structured_output = structured_output.get('enabled', False)
        schema_properties = structured_output.get('properties', [])
        schema = self._generate_schema_from_properties(schema_properties) if use_structured_output and schema_properties else None
        
        # Add schema instructions to system prompt if structured output is enabled
        if use_structured_output and schema:
            schema_json = json.dumps(schema, indent=2)
            schema_instructions = (
                "\n\nYou must respond in the following JSON format that matches this JSON schema:\n"
                f"{schema_json}\n\n"
                "Your response must be valid JSON that conforms to this schema. "
                "Do not include any text outside of the JSON object."
            )
            system_prompt = f"{system_prompt}{schema_instructions}" if system_prompt else schema_instructions
            logger.info(f"Using structured output schema with {len(schema['properties'])} properties")
            logger.debug(f"Schema: {schema_json}")
        
        # Check if the model supports multimodal capabilities
        if not self.is_multimodal_model(model):
            logger.warning(f"Model {model} may not support multimodal capabilities")
            # We'll continue anyway but log a warning, as the model list might not be exhaustive
        
        logger.info(f"Multimodal LLM request - Model: {model}, Temperature: {temperature}, Images: {len(image_paths) if image_paths else 0}")
        
        try:
            # Process images to base64
            images_base64 = []
            failed_images = []
            if image_paths and len(image_paths) > 0:
                import base64
                import imghdr
                import os
                
                for img_path in image_paths:
                    try:
                        # Verify the file exists
                        if not os.path.exists(img_path):
                            raise FileNotFoundError(f"Image file not found: {img_path}")
                        
                        # Verify it's actually an image
                        img_type = imghdr.what(img_path)
                        if img_type is None:
                            raise ValueError(f"File is not a recognized image format: {img_path}")
                        
                        # Check file size (limit to 10MB)
                        file_size = os.path.getsize(img_path)
                        if file_size > 10 * 1024 * 1024:  # 10MB
                            raise ValueError(f"Image file too large ({file_size / 1024 / 1024:.1f}MB): {img_path}. Maximum size is 10MB.")
                        
                        # Process the image
                        with open(img_path, "rb") as img_file:
                            # Read the image data and encode it as base64
                            image_data = img_file.read()
                            base64_image = base64.b64encode(image_data).decode('utf-8')
                            
                            # Add the base64 string to the list
                            images_base64.append(base64_image)
                            
                            # Log the image processing
                            logger.info(f"Processed image: {img_path} ({len(base64_image)} chars in base64, {file_size / 1024:.1f}KB)")
                            logger.debug(f"Image data type: {type(base64_image)}, first 30 chars: {base64_image[:30]}...")
                    
                    except Exception as e:
                        logger.error(f"Error processing image {img_path}: {str(e)}")
                        failed_images.append({"path": img_path, "error": str(e)})
                
                # If no images were successfully processed but images were provided, raise an error
                if not images_base64 and image_paths:
                    error_details = "\n".join([f"- {img['path']}: {img['error']}" for img in failed_images])
                    raise ValueError(f"Failed to process any of the provided images:\n{error_details}")
            
            # Prepare messages
            messages = []
            
            # Add system message if provided
            if system_prompt:
                # Check if the system prompt is a template variable that hasn't been replaced
                if system_prompt.startswith('{{') and system_prompt.endswith('}}'):
                    # If it's an unreplaced template variable, use a generic system prompt
                    messages.append({
                        "role": "system",
                        "content": "You are a helpful AI assistant that can analyze images and text. Please respond to the user's query."
                    })
                    logger.info(f"Using generic system prompt because the template variable '{system_prompt}' was not replaced")
                else:
                    # Use the provided system prompt, even if it was a template variable that got replaced
                    # with something like "No file content available"
                    messages.append({
                        "role": "system",
                        "content": system_prompt
                    })
                    logger.info(f"Using provided system prompt: {system_prompt[:50]}..." if len(system_prompt) > 50 else f"Using provided system prompt: {system_prompt}")
            else:
                # If no system prompt is provided, use a generic one
                messages.append({
                    "role": "system",
                    "content": "You are a helpful AI assistant that can analyze images and text. Please respond to the user's query."
                })
                logger.info("Using default system prompt because none was provided")
            
            # Add conversation history
            if conversation_history:
                # Get conversation history limits from settings
                history_settings = settings.get('conversationHistory', {})
                max_messages = history_settings.get('maxMessages', 10)  # Default to 10 messages
                max_message_length = history_settings.get('maxMessageLength', 1000)  # Default to 1000 chars
                include_history = history_settings.get('enabled', True)  # Default to enabled
                
                if include_history:
                    # Apply message count limit
                    limited_history = conversation_history[-max_messages:] if len(conversation_history) > max_messages else conversation_history
                    
                    for msg in limited_history:
                        role = msg.get('role', '')
                        content = msg.get('content', '')
                        
                        # Apply message length limit
                        if content and len(content) > max_message_length:
                            content = content[:max_message_length] + "..."
                        
                        if role and content:
                            messages.append({
                                "role": role,
                                "content": content
                            })
            
            # Add user message with prompt and images
            # For Ollama API, we need to format the message correctly for multimodal
            # The API expects a specific format for images
            
            # Create a simple user message
            user_message = {
                "role": "user",
                "content": prompt
            }
            
            # If we have images, add them to the user message
            if images_base64:
                # Add the images directly to the user message
                user_message["images"] = images_base64
                
                # Log the image count for debugging
                logger.info(f"Added {len(images_base64)} images to the user message")
                logger.debug(f"Image data type: {type(images_base64)}, length: {len(images_base64)}")
                if images_base64 and len(images_base64) > 0:
                    logger.debug(f"First image data type: {type(images_base64[0])}, length: {len(images_base64[0])}")
                
                # Make sure we're using a model that supports multimodal
                if not self.is_multimodal_model(model):
                    logger.warning(f"Model {model} may not support multimodal inputs, but proceeding anyway")
                    logger.info(f"Consider using a model like llava:7b, bakllava:7b, or llava-phi:7b for better multimodal support")
            
            # Add the user message to the messages array
            messages.append(user_message)
            
            # Prepare API request
            import requests
            
            payload = {
                "model": model,
                "messages": messages,
                "stream": streaming,
                "options": {
                    "temperature": temperature,
                    "num_ctx": num_ctx
                }
            }
            
            # Add structured output format if needed
            if use_structured_output:
                payload["format"] = "json"
            
            # Add additional options
            options = settings.get('options', {})
            for key, value in options.items():
                if value is not None:
                    payload["options"][key] = value
            
            # Make direct API call
            api_url = f"{base_url.rstrip('/')}/api/chat"
            logger.info(f"Sending multimodal request to {api_url}")
            
            # Create a copy of the payload for logging, but don't modify the original
            log_payload = json.loads(json.dumps(payload))
            
            # Sanitize the log payload to remove sensitive or large data
            for msg in log_payload.get('messages', []):
                # Handle the images field for multimodal messages
                if 'images' in msg:
                    # Replace the actual base64 data with a summary
                    image_count = len(msg['images'])
                    msg['images'] = f"[{image_count} base64 image(s)]"
                    
                    # Truncate long content for readability
                    if 'content' in msg and isinstance(msg['content'], str) and len(msg['content']) > 30:
                        msg['content'] = f"{msg['content'][:30]}..."
                
                # Handle the legacy content array format (if still present anywhere)
                if isinstance(msg.get('content'), list):
                    # Count different types of content
                    image_items = [item for item in msg['content'] if item.get('type') == 'image']
                    text_items = [item for item in msg['content'] if item.get('type') == 'text']
                    
                    # Create a summary
                    summary = []
                    if image_items:
                        summary.append(f"{len(image_items)} image(s)")
                    
                    # Add text content summaries
                    for text_item in text_items:
                        text = text_item.get('text', '')
                        if len(text) > 30:
                            summary.append(f"text: {text[:30]}...")
                        else:
                            summary.append(f"text: {text}")
                    
                    # Replace the content with the summary
                    msg['content'] = f"[{', '.join(summary)}]"
            
            # Log the sanitized payload
            logger.info(f"Request payload: {json.dumps(log_payload)}")
            
            # Debug the actual payload structure (without the actual image data)
            logger.debug(f"Payload structure: model={payload['model']}, messages={len(payload['messages'])} messages, options={payload['options']}")
            if 'images' in payload['messages'][-1]:
                logger.debug(f"Last message has {len(payload['messages'][-1]['images'])} images")
            
            start_time = time.time()
            
            try:
                response = requests.post(api_url, json=payload, timeout=self.timeout)
                
                # Handle different error status codes
                if response.status_code != 200:
                    error_message = "Unknown error"
                    
                    # Try to extract error message from response
                    try:
                        error_data = response.json()
                        if 'error' in error_data:
                            error_message = error_data['error']
                    except:
                        # If we can't parse JSON, use the text
                        error_message = response.text[:200] if response.text else f"HTTP {response.status_code}"
                    
                    # Handle specific status codes
                    if response.status_code == 404:
                        raise RuntimeError(f"Model not found or API endpoint incorrect. Check that the model '{model}' is available on your Ollama server.")
                    elif response.status_code == 400:
                        # For 400 errors, provide more specific guidance about multimodal models
                        if "multimodal" in error_message.lower() or "image" in error_message.lower():
                            raise RuntimeError(f"Multimodal error: {error_message}. Make sure you're using a model that supports multimodal inputs like 'llava:7b', 'llava:13b', or 'bakllava:7b'.")
                        else:
                            raise RuntimeError(f"Bad request: {error_message}. Check your model configuration and inputs.")
                    elif response.status_code == 413:
                        raise RuntimeError(f"Request too large: {error_message}. Try using smaller images or fewer images.")
                    elif response.status_code >= 500:
                        raise RuntimeError(f"Ollama server error: {error_message}. The server may be overloaded or the model may have crashed.")
                    else:
                        raise RuntimeError(f"Ollama API error ({response.status_code}): {error_message}")
                        
            except requests.exceptions.ConnectionError:
                logger.error(f"Connection error when connecting to {api_url}")
                raise RuntimeError(f"Could not connect to Ollama at {api_url}. Make sure Ollama is running and accessible.")
                
            except requests.exceptions.Timeout:
                logger.error(f"Timeout after {self.timeout}s when connecting to {api_url}")
                raise RuntimeError(f"Request to Ollama timed out after {self.timeout} seconds. The model may be too slow or the server overloaded.")
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error when connecting to {api_url}: {str(e)}")
                raise RuntimeError(f"Error communicating with Ollama: {str(e)}")
                
            # If we got here, the request was successful
            
            result_json = response.json()
            completion_time = time.time() - start_time
            
            # Extract result from response
            if "message" in result_json:
                result = result_json["message"]["content"]
            else:
                result = result_json.get("response", str(result_json))
            
            logger.info(f"LLM response received in {completion_time:.2f}s, length: {len(str(result))} chars")
            
            # Process the result if structured output is enabled
            if use_structured_output and schema_properties:
                schema = self._generate_schema_from_properties(schema_properties)
                return self._process_structured_response(result, schema, process_id=process_id)
            
            # Create completion banner with Windows compatibility
            if ANSI_ENABLED:
                completion_banner = f"{COLORS['MAGENTA']}{COLORS['BOLD']}" \
                        f"MULTIMODAL LLM GENERATION COMPLETED [PROCESS: {process_id}]\n" \
                        f"MODEL: {model} | TEMPERATURE: {temperature} | TIME: {completion_time:.2f}s | LENGTH: {len(str(result))} chars{COLORS['RESET']}"
            else:
                completion_banner = f"MULTIMODAL LLM GENERATION COMPLETED [PROCESS: {process_id}]\n" \
                        f"MODEL: {model} | TEMPERATURE: {temperature} | TIME: {completion_time:.2f}s | LENGTH: {len(str(result))} chars"
            logger.info(completion_banner)
            
            return result
            
        except Exception as e:
            if str(e) == "LLM request was cancelled":
                logger.info(f"LLM request was cancelled for process {process_id}")
                raise RuntimeError("LLM request was cancelled")
            logger.error(f"Error in multimodal generation: {str(e)}")
            # Create error banner with Windows compatibility
            if ANSI_ENABLED:
                error_banner = f"{COLORS['RED']}{COLORS['BOLD']}" \
                        f"MULTIMODAL LLM GENERATION FAILED [PROCESS: {process_id}]\n" \
                        f"MODEL: {model} | ERROR: {str(e)}{COLORS['RESET']}"
            else:
                error_banner = f"MULTIMODAL LLM GENERATION FAILED [PROCESS: {process_id}]\n" \
                        f"MODEL: {model} | ERROR: {str(e)}"
            logger.error(error_banner)
            raise RuntimeError(f"Failed to generate multimodal response: {str(e)}")

    def is_multimodal_model(self, model_name):
        """Check if a model supports multimodal capabilities
        
        Args:
            model_name (str): The name of the model to check
            
        Returns:
            bool: True if the model supports multimodal capabilities, False otherwise
        """
        if not model_name:
            return False
            
        # List of known multimodal models
        multimodal_models = [
            # Ollama models
            'llava', 'bakllava', 'llava-llama', 'llava-next', 'llava:7b', 'llava:13b', 'llava:34b',
            'bakllava:7b', 'llava-phi', 'llava-phi:3b', 'llava-phi:7b', 'llava-phi:34b',
            
            # Gemma models
            'gemma3', 'gemma3:12b', 'gemma3:2b', 'gemma3:7b',
            
            # Other models that may be available
            'moondream', 'phi3-vision', 'cogvlm', 'qwen-vl', 'idefics',
            'fuyu', 'claude3', 'gpt-4-vision', 'gpt-4v'
        ]
        
        # Check if the model name contains any of the multimodal model names
        model_name_lower = model_name.lower()
        for mm_model in multimodal_models:
            if mm_model in model_name_lower:
                return True
                
        return False
        
    def _generate_schema_from_properties(self, schema_properties):
        """Generate a JSON schema from property definitions"""
        schema = {
            "type": "object",
            "properties": {},
            "required": []
        }
        
        for prop in schema_properties:
            prop_name = prop.get('name', '')
            prop_type = prop.get('type', 'string')
            prop_description = prop.get('description', '')
            prop_required = prop.get('required', False)
            
            if prop_name:
                schema["properties"][prop_name] = {
                    "type": prop_type,
                    "description": prop_description
                }
                if prop_required:
                    schema["required"].append(prop_name)
        
        return schema

    def _process_structured_response(self, response, schema, process_id=None):
        """Process and validate structured response against schema.
        
        Args:
            response: The raw response from the LLM
            schema: The JSON schema to validate against
            process_id: Optional process ID for logging
            
        Returns:
            dict: Processed response with validation results
        """
        try:
            content_to_validate = None
            logger.debug(f"[{process_id or 'N/A'}] Processing structured response")
            
            # Handle different response formats
            if isinstance(response, str):
                # Try to extract JSON from string
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    try:
                        content_to_validate = json.loads(json_match.group(0))
                    except json.JSONDecodeError as e:
                        logger.warning(f"[{process_id or 'N/A'}] Failed to parse JSON from string: {e}")
                        content_to_validate = response
                else:
                    content_to_validate = response
            elif isinstance(response, dict):
                if 'message' in response and isinstance(response['message'], dict):
                    content = response['message'].get('content', '')
                    if isinstance(content, str):
                        try:
                            content_to_validate = json.loads(content)
                        except json.JSONDecodeError:
                            json_match = re.search(r'\{[\s\S]*\}', content)
                            if json_match:
                                try:
                                    content_to_validate = json.loads(json_match.group(0))
                                except json.JSONDecodeError:
                                    content_to_validate = content
                    else:
                        content_to_validate = content
                else:
                    content_to_validate = response
            
            # Validate against schema if we have content
            if content_to_validate is not None:
                try:
                    jsonschema.validate(instance=content_to_validate, schema=schema)
                    logger.info(f"[{process_id or 'N/A'}] Structured output validation successful")
                    logger.debug(f"[{process_id or 'N/A'}] Validated JSON: {json.dumps(content_to_validate, ensure_ascii=False)[:200]}...")
                    return {
                        "content": content_to_validate,
                        "schema_valid": True,
                        "schema": schema
                    }
                except jsonschema.exceptions.ValidationError as e:
                    logger.error(f"[{process_id or 'N/A'}] Schema validation failed: {str(e)}")
                    return {
                        "content": content_to_validate,
                        "schema_valid": False,
                        "error": str(e),
                        "schema": schema
                    }
            
            # If we get here, we couldn't validate the content
            error_msg = "Could not extract valid JSON from response"
            logger.error(f"[{process_id or 'N/A'}] {error_msg}")
            return {
                "content": response,
                "schema_valid": False,
                "error": error_msg,
                "schema": schema
            }
                
        except Exception as e:
            error_msg = f"Error processing structured response: {str(e)}"
            logger.error(f"[{process_id or 'N/A'}] {error_msg}")
            logger.debug(f"[{process_id or 'N/A'}] Response that caused error: {response}")
            return {
                "content": response,
                "schema_valid": False,
                "error": error_msg,
                "schema": schema
            }
    
    def cancel(self):
        """Cancel the current LLM request if one is in progress"""
        if self.cancel_event:
            logger.info(f"Cancelling LLM request {get_process_id()}")
            self.cancel_event.set()
            self.cancel_event = None
            logger.info("LLM request cancelled successfully")
