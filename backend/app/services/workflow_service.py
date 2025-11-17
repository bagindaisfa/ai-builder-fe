from .nodes.HttpRequestNode import HttpRequestNode
from .nodes.DocumentExtractorNode import DocumentExtractorNode
from ..models import Workflow
from ..models.conversation_memory import ConversationMemory
from .. import db
from .llm_service import LLMService
from .knowledge_service import KnowledgeService
from .agent_service import AgentService
import logging
import os
import time
import uuid
from datetime import datetime
from ..utils.logging_utils import setup_logger, log_execution_time, get_request_id, get_process_id, set_process_id, create_process_banner, COLORS, ANSI_ENABLED

# Configure logger
logger = setup_logger('workflow_service')

class WorkflowService:
    def __init__(self):
        self.llm_service = LLMService()
        self.knowledge_service = KnowledgeService()
        self.agent_service = AgentService()
        self.max_depth = int(os.getenv('MAX_WORKFLOW_DEPTH', '50'))
        self.current_workflow_id = None
        self.execution_id = None
        self.node_count = 0
        self.nodes_executed = 0
        self.request_id = get_request_id()
        logger.info(f"Initializing WorkflowService with request_id={self.request_id}")

    @log_execution_time(logger)
    def create_workflow(self, name, description, nodes=None, edges=None):
        process_id = get_process_id()
        create_process_banner(logger, "WORKFLOW CREATION STARTED", process_id)
        
        logger.info(f"Creating new workflow with name: {name}")
        
        # Log nodes and edges count if provided
        if nodes:
            logger.info(f"Workflow contains {len(nodes)} nodes")
        if edges:
            logger.info(f"Workflow contains {len(edges)} edges")
            
        workflow = Workflow(
            name=name,
            description=description,
            nodes=nodes,
            edges=edges
        )
        db.session.add(workflow)
        db.session.commit()
        
        logger.info(f"Successfully created workflow with UUID: {workflow.uuid}")
        return workflow

    @log_execution_time(logger)
    def get_workflow(self, workflow_uuid):
        logger.info(f"Fetching workflow with UUID: {workflow_uuid}")
        workflow = Workflow.query.get_or_404(workflow_uuid)
        
        # Log more details about the retrieved workflow
        node_count = len(workflow.nodes) if workflow.nodes else 0
        edge_count = len(workflow.edges) if workflow.edges else 0
        logger.info(f"Successfully retrieved workflow {workflow_uuid} - '{workflow.name}' with {node_count} nodes and {edge_count} edges")
        return workflow

    @log_execution_time(logger)
    def list_workflows(self):
        logger.info("Fetching all workflows")
        start_time = time.time()
        workflows = Workflow.query.order_by(Workflow.created_at.desc()).all()
        query_time = time.time() - start_time
        logger.info(f"Found {len(workflows)} workflows in {query_time:.3f}s")
        return workflows
        
    @log_execution_time(logger)
    def list_workflows_paginated(self, page=1, per_page=10, keyword=''):
        """
        List workflows with pagination and optional keyword search.
        
        Args:
            page (int): Page number (1-based)
            per_page (int): Number of items per page
            keyword (str): Optional search keyword to filter by name or description
            
        Returns:
            SQLAlchemy query result with pagination
        """
        logger.info(f"Fetching workflows - page: {page}, per_page: {per_page}, keyword: {keyword}")
        
        start_time = time.time()
        query = Workflow.query
        
        # Apply keyword filter if provided
        if keyword:
            search = f"%{keyword}%"
            logger.info(f"Applying keyword filter: {keyword}")
            query = query.filter(
                db.or_(
                    Workflow.name.ilike(search),
                    Workflow.description.ilike(search)
                )
            )
        
        # Order by creation date (newest first) and apply pagination
        result = query.order_by(Workflow.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        query_time = time.time() - start_time
        logger.info(f"Found {result.total} workflows total, showing {len(result.items)} on this page in {query_time:.3f}s")
        
        # Log more detailed information about the results
        if result.items:
            logger.debug(f"First workflow on page: {result.items[0].name} (UUID: {result.items[0].uuid})")
            
        return result
        
    @log_execution_time(logger)
    def update_workflow(self, workflow_uuid, nodes=None, edges=None):
        process_id = get_process_id()
        create_process_banner(logger, "WORKFLOW UPDATE STARTED", process_id)
        
        logger.info(f"Updating workflow {workflow_uuid}")
        workflow = self.get_workflow(workflow_uuid)
        
        if nodes is not None:
            old_node_count = len(workflow.nodes) if workflow.nodes else 0
            new_node_count = len(nodes) if nodes else 0
            logger.info(f"Updating nodes for workflow {workflow_uuid}: {old_node_count} → {new_node_count} nodes")
            workflow.nodes = nodes
            
        if edges is not None:
            old_edge_count = len(workflow.edges) if workflow.edges else 0
            new_edge_count = len(edges) if edges else 0
            logger.info(f"Updating edges for workflow {workflow_uuid}: {old_edge_count} → {new_edge_count} edges")
            workflow.edges = edges
            
        db.session.commit()
        
        # Create completion banner with Windows compatibility
        if ANSI_ENABLED:
            completion_banner = f"{COLORS['MAGENTA']}{COLORS['BOLD']}" \
                    f"WORKFLOW UPDATE COMPLETED [PROCESS: {process_id}]\n" \
                    f"WORKFLOW: {workflow.name} (UUID: {workflow_uuid}){COLORS['RESET']}"
        else:
            completion_banner = f"WORKFLOW UPDATE COMPLETED [PROCESS: {process_id}]\n" \
                    f"WORKFLOW: {workflow.name} (UUID: {workflow_uuid})"
        logger.info(completion_banner)
        
        return workflow

    @log_execution_time(logger)
    def get_workflow_variables(self, workflow_uuid, current_node_id):
        """Get available variables from nodes that come before the current node.
        
        Args:
            workflow_uuid: UUID of the workflow
            current_node_id: ID of the current node
            
        Returns:
            List of dictionaries containing node information and available outputs
            
        Raises:
            ValueError: If workflow or node is not found, or if node_id is invalid
        """
        logger.info(f"Getting variables for workflow {workflow_uuid}, node {current_node_id}")
        
        try:
            workflow = self.get_workflow(workflow_uuid)
        except Exception as e:
            logger.error(f"Failed to get workflow {workflow_uuid}: {str(e)}")
            raise ValueError(f"Workflow {workflow_uuid} not found") from e
            
        if not workflow:
            logger.error(f"Workflow {workflow_uuid} not found")
            raise ValueError(f"Workflow {workflow_uuid} not found")
            
        nodes = workflow.nodes or []
        edges = workflow.edges or []
        logger.info(f"Workflow has {len(nodes)} nodes and {len(edges)} edges")

        # Find all nodes that come before the current node
        previous_nodes = []
        current_node = next((node for node in nodes if node['id'] == current_node_id), None)
        
        if not current_node:
            raise ValueError(f"Node {current_node_id} not found in workflow")

        def find_previous_nodes(node_id):
            incoming_edges = [edge for edge in edges if edge['target'] == node_id]
            for edge in incoming_edges:
                source_node = next((node for node in nodes if node['id'] == edge['source']), None)
                if source_node and source_node not in previous_nodes:
                    previous_nodes.append(source_node)
                    find_previous_nodes(source_node['id'])

        find_previous_nodes(current_node_id)

        # Map node outputs
        variables = []
        for node in previous_nodes:
            node_type = node.get('data', {}).get('nodeType')
            outputs = []

            if node_type == 'start':
                outputs.append({
                    'name': 'input',
                    'type': 'string',
                    'description': 'Initial workflow input'
                })
                
                # Add file variables for the Start node
                outputs.append({
                    'name': 'files',
                    'type': 'array',
                    'description': 'Uploaded files available to the workflow'
                })
                
                # Add individual file access
                outputs.append({
                    'name': 'file_content',
                    'type': 'string',
                    'description': 'Content of the first uploaded file (if any)'
                })
            elif node_type == 'llm':
                outputs.append({
                    'name': 'output',
                    'type': 'string',
                    'description': 'LLM generated text (supports both text-only and multimodal with images)'
                })
            elif node_type == 'knowledge':
                outputs.append({
                    'name': 'output',
                    'type': 'array',
                    'description': 'Retrieved knowledge chunks'
                })
            elif node_type == 'answer':
                outputs.append({
                    'name': 'answer',
                    'type': 'string',
                    'description': 'Answer text output'
                })
            elif node_type == 'agent':
                outputs.append({
                    'name': 'output',
                    'type': 'string',
                    'description': 'Agent generated output'
                })
            elif node_type == 'classifier':
                outputs.append({
                    'name': 'class_name',
                    'type': 'string',
                    'description': 'Classified category name'
                })
                outputs.append({
                    'name': 'usage',
                    'type': 'object',
                    'description': 'Model usage information'
                })
            elif node_type == 'http_request':
                outputs.append({
                    'name': 'output',
                    'type': 'object',
                    'description': 'HTTP response object'
                })
            elif node_type == 'doc_extractor':
                outputs.append({
                    'name': 'text',
                    'type': 'text',
                    'description': 'Extracted text from files'
                })
            if outputs:
                variables.append({
                    'node_id': node['id'],
                    'node_name': node.get('data', {}).get('label', node['id']),
                    'node_type': node_type,
                    'outputs': outputs
                })

        return variables

    @log_execution_time(logger)
    def execute_workflow(self, workflow_uuid, input_data=None, conversation_id=None, files=None):
        # Create a unique process ID for this workflow execution
        process_id = get_process_id()
        set_process_id(process_id)

        logger.info(f"Executing workflow {workflow_uuid} with process ID {process_id}")
        logger.info(f"Input data: {input_data}")
        logger.info(f"Conversation ID: {conversation_id}")
        logger.info(f"Files: {files}")
        
        # Get workflow
        logger.info(f"Starting execution of workflow {workflow_uuid}")
        workflow = self.get_workflow(workflow_uuid)
        if not workflow:
            logger.error(f"Workflow {workflow_uuid} not found")
            raise ValueError(f"Workflow {workflow_uuid} not found")

        # Get or create conversation memory
        logger.info(f"Retrieving conversation memory for workflow {workflow_uuid}")
        
        # If conversation_id is provided, try to find that specific conversation
        if conversation_id:
            logger.info(f"Looking for existing conversation with ID: {conversation_id}")
            memory = ConversationMemory.query.filter_by(
                uuid=conversation_id,
                workflow_uuid=workflow_uuid
            ).first()
            if memory:
                logger.info(f"Found existing conversation with ID: {conversation_id}")
                # DEBUG: Log the content of the conversation memory
                logger.info(f"DEBUG: Conversation memory contains {len(memory.messages)} messages")
                for idx, msg in enumerate(memory.messages):
                    logger.info(f"DEBUG: Memory message #{idx+1} - Role: {msg.get('role')}, Content: {msg.get('content')[:100]}{'...' if len(msg.get('content', '')) > 100 else ''}")
            else:
                logger.info(f"No conversation found with ID: {conversation_id}, creating new one")
                memory = ConversationMemory(
                    uuid=conversation_id,
                    workflow_uuid=workflow_uuid, 
                    messages=[]
                )
                db.session.add(memory)
                db.session.commit()
        else:
            # Create a new conversation if no conversation_id is provided
            logger.info(f"No conversation ID provided, creating new conversation")
            memory = ConversationMemory(workflow_uuid=workflow_uuid, messages=[])
            db.session.add(memory)
            db.session.commit()
            logger.info(f"Created new conversation with ID: {memory.uuid}")

        # Initialize input data
        if input_data is None:
            input_data = ''
            logger.info("No input data provided, using empty string")
        else:
            logger.info(f"Input data provided: '{input_data[:100]}{'...' if len(input_data) > 100 else ''}' ({len(input_data)} chars)")

        # Add user message to memory
        logger.info("Adding user message to conversation memory")
        memory.add_message('user', input_data)
        db.session.commit()
        
        # Initialize workflow execution
        self.current_workflow_uuid = workflow_uuid
        self.execution_id = process_id
        execution_start_time = time.time()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Initialize context
        context = {
            'input': input_data,
            'process_steps': [],
            'workflow_uuid': workflow_uuid,
            'execution_id': self.execution_id,
            'start_time': execution_start_time,
            'conversation_id': str(memory.uuid) if memory else None,
            'files': files or []
        }
        
        # Add file content if files are provided
        if files and len(files) > 0:
            # Separate text files and image files
            text_files = []
            image_files = []
            
            for file in files:
                file_path = file.get('path')
                if not file_path or not os.path.exists(file_path):
                    logger.warning(f"File path not found or invalid: {file_path}")
                    continue
                    
                # Check if file is an image
                try:
                    # Use file extension to determine if it's an image
                    import imghdr
                    import mimetypes
                    
                    # Initialize mimetypes if not already done
                    if not mimetypes.inited:
                        mimetypes.init()
                    
                    # Get file type using imghdr (more reliable for images)
                    img_type = imghdr.what(file_path)
                    
                    # If imghdr couldn't determine type, fall back to mimetypes
                    if img_type is None:
                        mime_type, _ = mimetypes.guess_type(file_path)
                        is_image = mime_type and mime_type.startswith('image/')
                    else:
                        is_image = True
                    
                    if is_image:
                        image_files.append(file_path)
                        logger.info(f"Added image file: {file.get('filename')}")
                    else:
                        text_files.append(file_path)
                        logger.info(f"Added text file: {file.get('filename')}")
                except Exception as e:
                    logger.error(f"Error determining file type for {file_path}: {str(e)}")
                    # Default to treating as text file if we can't determine type
                    text_files.append(file_path)
            
            # Add image paths to context for multimodal LLM processing
            context['image_paths'] = image_files
            logger.info(f"Added {len(image_files)} image files to context")
            
            # Add text content from the first text file
            if text_files:
                try:
                    with open(text_files[0], 'r') as f:
                        context['file_content'] = f.read()
                    logger.info(f"Added content from text file: {os.path.basename(text_files[0])}")
                except Exception as e:
                    logger.error(f"Error reading text file: {str(e)}")
                    context['file_content'] = ''
            else:
                context['file_content'] = ''
                if image_files:
                    logger.info("No text files found, only images")
                else:
                    logger.warning("No valid files found")

        
        # Create workflow header banner
        create_process_banner(logger, f"WORKFLOW EXECUTION STARTED - {workflow.name}", process_id)
        logger.info(f"Workflow: {workflow.name} (UUID: {workflow_uuid})")
        logger.info(f"Execution ID: {self.execution_id} | Timestamp: {timestamp}")
        
        try:
            # Count total nodes
            self.node_count = len(workflow.nodes)
            self.nodes_executed = 0
            logger.info(f"Workflow contains {self.node_count} nodes to execute")
            
            # Find start node
            logger.info("Looking for start node in workflow")
            start_node = next((node for node in workflow.nodes if node.get('data', {}).get('nodeType') == 'start'), None)
            if not start_node:
                logger.error("No start node found in workflow")
                raise ValueError("No start node found in workflow")
            
            logger.info(f"Found start node: {start_node['id']}")
            
            # Execute workflow using topological sorting
            logger.info("Beginning topological execution of workflow nodes")
            result = self._execute_workflow_topological(
                workflow=workflow,
                input_data=input_data,
                context=context,
                start_node=start_node
            )
            
            # Log completion
            execution_time = time.time() - execution_start_time
            
            # Create completion banner with Windows compatibility
            if ANSI_ENABLED:
                completion_banner = f"{COLORS['MAGENTA']}{COLORS['BOLD']}" \
                        f"WORKFLOW EXECUTION COMPLETED [UUID: {workflow_uuid}] [EXEC: {self.execution_id}]\n" \
                        f"WORKFLOW: {workflow.name} | TOTAL TIME: {execution_time:.2f}s | NODES: {self.nodes_executed}/{self.node_count}{COLORS['RESET']}"
            else:
                completion_banner = f"WORKFLOW EXECUTION COMPLETED [UUID: {workflow_uuid}] [EXEC: {self.execution_id}]\n" \
                        f"WORKFLOW: {workflow.name} | TOTAL TIME: {execution_time:.2f}s | NODES: {self.nodes_executed}/{self.node_count}"
            logger.info(completion_banner)
            
            # Add execution stats to result
            execution_stats = {
                'execution_time': execution_time,
                'nodes_executed': self.nodes_executed,
                'total_nodes': self.node_count,
                'execution_id': self.execution_id,
                'timestamp': timestamp,
                'conversation_id': str(memory.uuid) if memory else None
            }
            
            return {
                'result': result,
                'process_steps': context['process_steps'],
                'stats': execution_stats,
                'conversation_id': str(memory.uuid) if memory else None
            }
            
        except Exception as e:
            # Create error banner with Windows compatibility
            if ANSI_ENABLED:
                error_banner = f"{COLORS['RED']}{COLORS['BOLD']}" \
                        f"WORKFLOW EXECUTION FAILED [UUID: {workflow_uuid}] [EXEC: {self.execution_id}]\n" \
                        f"ERROR: {str(e)}{COLORS['RESET']}"
            else:
                error_banner = f"WORKFLOW EXECUTION FAILED [UUID: {workflow_uuid}] [EXEC: {self.execution_id}]\n" \
                        f"ERROR: {str(e)}"
            logger.error(error_banner)
            raise
        finally:
            self.current_workflow_uuid = None
            self.execution_id = None
            self.node_count = 0
            self.nodes_executed = 0
            
    def _execute_workflow_recursive(self, workflow, input_data, context, current_node=None, indent='', visited=None):
        """Execute workflow nodes recursively (legacy method, kept for reference)"""
        if not current_node:
            return None

        # Initialize visited nodes set
        if visited is None:
            visited = set()

        # Check if node has already been visited
        if current_node['id'] in visited:
            logger.warning(f"{indent}Node {current_node['id']} has already been executed, skipping")
            return input_data

        # Mark node as visited
        visited.add(current_node['id'])

        # Execute current node
        result = self._execute_node(current_node, workflow.nodes, workflow.edges, context, indent)
        self.nodes_executed += 1
        
        # Find next nodes
        next_nodes = []
        for edge in workflow.edges:
            if edge['source'] == current_node['id']:
                next_node = next((node for node in workflow.nodes if node['id'] == edge['target']), None)
                if next_node:
                    next_nodes.append(next_node)
        
        # Execute next nodes
        for next_node in next_nodes:
            result = self._execute_workflow_recursive(
                workflow=workflow,
                input_data=result,
                context=context,
                current_node=next_node,
                indent=indent + '  ',
                visited=visited
            )
        
        return result
        
    def _execute_workflow_topological(self, workflow, input_data, context, start_node=None, indent=''):
        """Execute workflow nodes in topological order to ensure proper execution sequence"""
        if not start_node:
            return None
            
        # Build dependency graph
        dependency_graph = {}
        incoming_edges_count = {}
        node_map = {}
        
        # Initialize graph
        for node in workflow.nodes:
            node_id = node['id']
            dependency_graph[node_id] = []
            incoming_edges_count[node_id] = 0
            node_map[node_id] = node
            
        # Build edges
        for edge in workflow.edges:
            source_id = edge['source']
            target_id = edge['target']
            dependency_graph[source_id].append(target_id)
            incoming_edges_count[target_id] = incoming_edges_count.get(target_id, 0) + 1
            
        # Find nodes with no incoming edges (start with start node)
        queue = [start_node['id']]
        visited = set()
        executed_nodes = []
        node_results = {}
        
        # Initial input
        node_results[start_node['id']] = input_data
        
        # Track conditional paths for classifier nodes
        conditional_paths = {}
        
        # Process nodes in topological order
        while queue:
            current_id = queue.pop(0)
            
            if current_id in visited:
                continue
                
            # Check if all dependencies are satisfied
            if incoming_edges_count[current_id] > 0:
                # Not all dependencies are executed yet, put it back in queue
                queue.append(current_id)
                continue
                
            # Get the node
            current_node = node_map[current_id]
            
            # Collect inputs from all incoming edges
            input_values = []
            for edge in workflow.edges:
                if edge['target'] == current_id and edge['source'] in node_results:
                    input_values.append(node_results[edge['source']])
            
            # Use the first input value or the original input
            node_input = input_values[0] if input_values else input_data
            
            # Execute the node
            logger.info(f"{indent}Executing node {current_id} with {len(input_values)} input sources")
            result = self._execute_node(current_node, workflow.nodes, workflow.edges, context, indent)
            self.nodes_executed += 1
            
            # Store the result
            node_results[current_id] = result
            visited.add(current_id)
            executed_nodes.append(current_id)
            
            # Check if this is a conditional node (classifier or ifelse) and handle conditional paths
            node_type = current_node.get('data', {}).get('nodeType')
            if node_type in ['classifier', 'ifelse']:
                # Find the process step for this node to get the result
                node_step = next((step for step in context.get('process_steps', []) 
                                 if step['node'] == current_id), None)
                
                if node_step and 'next_node_id' in node_step:
                    # Get the next node ID based on the result
                    next_node_id = node_step['next_node_id']
                    
                    if node_type == 'classifier':
                        logger.info(f"{indent}Classifier node {current_id} determined next node: {next_node_id} based on class '{node_step.get('class_name', '')}'")                        
                    elif node_type == 'ifelse':
                        logger.info(f"{indent}IF/ELSE node {current_id} determined next node: {next_node_id} based on branch '{node_step.get('branch_taken', '')}'")                        
                    
                    # Store the conditional path
                    conditional_paths[current_id] = next_node_id
                    
                    # Only add the specific next node to the queue
                    if next_node_id in node_map:
                        # Decrement the incoming edge count for the next node
                        incoming_edges_count[next_node_id] -= 1
                        
                        # Add to queue if all dependencies are satisfied
                        if incoming_edges_count[next_node_id] == 0 and next_node_id not in visited:
                            queue.append(next_node_id)
                    else:
                        logger.warning(f"{indent}Next node {next_node_id} not found in workflow")
                    
                    # Skip adding other successor nodes for this conditional node
                    continue
            
            # For non-classifier nodes or classifiers without conditional paths,
            # add all successor nodes to queue and decrement their incoming edge count
            for next_id in dependency_graph[current_id]:
                # Skip nodes that are not in the conditional path of a classifier
                skip = False
                for classifier_id, target_id in conditional_paths.items():
                    if current_id == classifier_id and next_id != target_id:
                        # This is a classifier node and the next_id is not the chosen path
                        logger.info(f"{indent}Skipping node {next_id} as it's not in the conditional path")
                        skip = True
                        break
                
                if skip:
                    continue
                    
                incoming_edges_count[next_id] -= 1
                if incoming_edges_count[next_id] == 0 and next_id not in visited:
                    queue.append(next_id)
        
        # Find terminal nodes (nodes with no outgoing edges or nodes that were executed last)
        terminal_nodes = []
        for node_id in executed_nodes:
            # Check if this node is a terminal node (no outgoing edges)
            is_terminal = not dependency_graph[node_id]
            
            # Or if it's the target of a conditional path and was executed
            is_conditional_target = node_id in conditional_paths.values() and node_id in visited
            
            if is_terminal or is_conditional_target:
                terminal_nodes.append(node_id)
        
        # Return result from terminal nodes, prioritizing 'answer' type nodes
        answer_nodes = [node_id for node_id in terminal_nodes 
                      if node_map[node_id].get('data', {}).get('nodeType') == 'answer']
        
        if answer_nodes:
            # If we have answer nodes, return the result from the last one
            return node_results[answer_nodes[-1]]
        elif terminal_nodes:
            # Otherwise return the last terminal node result
            return node_results[executed_nodes[-1]]
        else:
            # Fallback to input
            return input_data
            
    @log_execution_time(logger)
    def _execute_node(self, current_node, nodes, edges, context, indent=''):
        """Execute a single node in the workflow"""
        # Create a unique ID for this node execution
        node_execution_id = str(uuid.uuid4())[:6]
        node_start_time = time.time()
        
        # Get node details
        node_data = current_node.get('data', {})
        node_type = node_data.get('nodeType')
        node_label = node_data.get('label', current_node['id'])
        
        # Create node header banner with detailed information and Windows compatibility
        if ANSI_ENABLED:
            node_header = f"{COLORS['CYAN']}{COLORS['BOLD']}{indent}" \
                         f"NODE EXECUTION STARTED [ID: {node_execution_id}]\n" \
                         f"{indent}NODE: {node_label} ({current_node['id']}) | TYPE: {node_type} | PROGRESS: {self.nodes_executed}/{self.node_count}{COLORS['RESET']}"
        else:
            node_header = f"{indent}NODE EXECUTION STARTED [ID: {node_execution_id}]\n" \
                         f"{indent}NODE: {node_label} ({current_node['id']}) | TYPE: {node_type} | PROGRESS: {self.nodes_executed}/{self.node_count}"
        logger.info(node_header)
        
        # Log more detailed information about the node
        logger.info(f"{indent}Node depth: {indent.count('  ')} | Context steps: {len(context.get('process_steps', []))}")
        
        # Check for max depth to prevent infinite recursion
        if indent.count('  ') >= self.max_depth:
            error_msg = f"Maximum workflow depth {self.max_depth} exceeded at node {current_node['id']}"
            if ANSI_ENABLED:
                logger.error(f"{COLORS['RED']}{COLORS['BOLD']}ERROR: {error_msg}{COLORS['RESET']}")
            else:
                logger.error(f"ERROR: {error_msg}")
            raise RuntimeError(error_msg)
            
        # Get input from previous node if it exists
        prev_edges = [edge for edge in edges if edge['target'] == current_node['id']]
        input_data = context.get('input', '')
        if prev_edges and node_type != 'start':
            prev_node_id = prev_edges[0]['source']
            input_data = context.get(f'node_{prev_node_id}_result', input_data)
        
        # Execute based on node type with detailed logging
        result = None
        try:
            if node_type == 'llm':
                logger.info(f"{indent}Executing LLM node with ID: {current_node['id']}")
                settings = node_data.get('settings', {})
                context['settings'] = settings
                
                # Check if multimodal is enabled
                enable_multimodal = settings.get('enableMultimodal', False)
                image_paths = context.get('image_paths', [])
                has_images = enable_multimodal and image_paths and len(image_paths) > 0
                
                if has_images:
                    logger.info(f"{indent}Multimodal mode enabled with {len(image_paths)} images")
                
                # Log LLM settings
                settings_str = [f"{COLORS['CYAN']}{indent}LLM Settings:{COLORS['RESET']}"]
                
                # Log basic settings
                basic_settings = [                    
                    ('systemPrompt', ''),
                    ('userPrompt', ''),
                    ('ollamaBaseUrl', 'http://localhost:11434'),
                    ('model', 'default'),
                    ('temperature', 0.7),
                    ('numCtx', 8192),
                    ('enableMultimodal', False),
                ]
                
                for key, default in basic_settings:
                    value = settings.get(key, default)
                    # Truncate long text values
                    if isinstance(value, str) and len(value) > 100:
                        value = f"{value[:100]}..."
                    settings_str.append(f"{indent}  {key}: {COLORS['GREEN']}{value}{COLORS['RESET']}")
                
                # Log image paths if multimodal is enabled
                if has_images:
                    settings_str.append(f"{indent}  Images:")
                    for img_path in image_paths:
                        settings_str.append(f"{indent}    - {COLORS['GREEN']}{os.path.basename(img_path)}{COLORS['RESET']}")
                
                # Log advanced Ollama options if present
                options = settings.get('options', {})
                if options:
                    settings_str.append(f"{COLORS['CYAN']}{indent}Advanced Ollama Options:{COLORS['RESET']}")
                    for key, value in options.items():
                        if value is not None:  # Only log non-None values
                            settings_str.append(f"{indent}  {key}: {COLORS['GREEN']}{value}{COLORS['RESET']}")
                
                logger.info('\n'.join(settings_str))
                
                # Get conversation history - FIXED to use specific conversation_id
                # Get the current conversation ID from the context
                current_conversation_id = context.get('conversation_id')
                if not current_conversation_id:
                    logger.warning("No conversation ID found in context, conversation history will not be used")
                    conversation_history = []
                else:
                    # Get only the specific conversation memory by its ID
                    logger.info(f"Looking for conversation memory with ID: {current_conversation_id}")
                    memory = ConversationMemory.query.get(current_conversation_id)
                    conversation_history = []
                    if memory:
                        conversation_history = memory.messages
                        # DEBUG: Log the conversation history being passed to the LLM
                        logger.info(f"DEBUG: Passing {len(conversation_history)} messages to LLM from conversation {current_conversation_id}")
                        for idx, msg in enumerate(conversation_history):
                            logger.info(f"DEBUG: LLM history message #{idx+1} - Role: {msg.get('role')}, Content: {msg.get('content')[:100]}{'...' if len(msg.get('content', '')) > 100 else ''}")
                    else:
                        logger.warning(f"Conversation memory with ID {current_conversation_id} not found")  
                # Build prompt parts
                prompt_parts = []
                
                # Helper function to replace variables in prompts
                import re
                def replace_prompt_variables(text):
                    if not text:
                        return text
                        
                    def replace_var(match):
                        var_ref = match.group(1).strip()
                        try:
                            node_id, var_name = var_ref.split('.')
                            
                            # Special handling for start node variables
                            # Check if the node_id starts with 'start-'
                            is_start_node = node_id.startswith('start-')
                            
                            # Special handling for files and file_content from context
                            if is_start_node and var_name == 'files':
                                files = context.get('files', [])
                                if files:
                                    file_list = [f"{f.get('filename', 'unnamed')} ({f.get('size', 0)} bytes)" for f in files]
                                    return "\n".join([f"Files available ({len(files)}):"] + file_list)
                                return "No files available"
                                
                            if is_start_node and var_name == 'file_content':
                                file_content = context.get('file_content', '')
                                files = context.get('files', [])
                                if file_content:
                                    filename = files[0].get('filename', 'unnamed') if files else 'unknown'
                                    header = f"File Content ({filename}):\n\n"
                                    return header + file_content
                                return "No file content available"
                                
                            # Handle input from start node
                            if is_start_node and var_name == 'input':
                                input_data = context.get('input', '')
                                if input_data:
                                    return str(input_data)
                                return ""
                            
                            # Find the referenced node in process steps
                            for step in context.get('process_steps', []):
                                if step['node'] == node_id:
                                    # Handle input/output variables
                                    if var_name in ['input', 'output']:
                                        value = step.get(var_name)
                                        if value is not None:
                                            logger.info(f"{indent}  Found variable {node_id}.{var_name} = {str(value)[:50]}...")
                                            return str(value)
                        except Exception as e:
                            logger.error(f"Error replacing variable {var_ref}: {str(e)}")
                            
                        logger.info(f"{indent}  Variable {var_ref} not found or invalid")
                        return f"{{{{Variable {var_ref} not found}}}}"
                    
                    # Replace all variable references
                    return re.sub(r'\{\{\s*([^}]+?)\s*\}\}', replace_var, text)
                
                # Add system prompt if provided
                system_prompt = settings.get('systemPrompt', '')
                if system_prompt:
                    system_prompt = replace_prompt_variables(system_prompt)
                    logger.info(f"{indent}System prompt after variable replacement: {system_prompt[:100]}{'...' if len(system_prompt) > 100 else ''}")
                    prompt_parts.append(system_prompt)
                
                # Add user prompt if provided
                user_prompt = settings.get('userPrompt', '')
                if user_prompt:
                    user_prompt = replace_prompt_variables(user_prompt)
                    logger.info(f"{indent}User prompt after variable replacement: {user_prompt[:100]}{'...' if len(user_prompt) > 100 else ''}")
                    prompt_parts.append(user_prompt)
                
                # Add input data
                if input_data:
                    # Also replace variables in input data if it's a string
                    if isinstance(input_data, str) and '{{' in input_data:
                        input_data = replace_prompt_variables(input_data)
                        logger.info(f"{indent}Input data after variable replacement: {input_data[:100]}{'...' if len(input_data) > 100 else ''}")
                    prompt_parts.append(str(input_data))
                
                final_prompt = '\n\n'.join(prompt_parts)

                try:
                    # Use multimodal generation if enabled and images are available
                    if has_images:
                        try:
                            # Get the model name
                            model = settings.get('model', 'default')
                            
                            # Check if the model supports multimodal capabilities
                            is_multimodal = self.llm_service.is_multimodal_model(model)
                            if not is_multimodal:
                                logger.warning(f"{indent}Model {model} may not support multimodal capabilities. Proceeding anyway.")
                                
                            logger.info(f"{indent}Using multimodal LLM generation with {len(image_paths)} images")
                            result = self.llm_service.generate_multimodal(
                                prompt=final_prompt,
                                image_paths=image_paths,
                                settings=settings,
                                conversation_history=conversation_history
                            )
                        except Exception as e:
                            # Provide more user-friendly error message for multimodal failures
                            error_msg = str(e)
                            
                            # Check for common multimodal errors
                            if "model doesn't support multimodal" in error_msg.lower() or "bad request" in error_msg.lower():
                                error_msg = f"The selected model '{settings.get('model', 'default')}' may not support multimodal inputs. Try using a compatible model like 'gemma3:12b' or 'llava:34b'."
                            elif "file not found" in error_msg.lower() or "no such file" in error_msg.lower():
                                error_msg = f"One or more image files could not be found. The files may have been moved or deleted."
                            elif "too large" in error_msg.lower():
                                error_msg = "One or more images are too large. Try using smaller images (under 10MB)."
                            elif "not a recognized image format" in error_msg.lower():
                                error_msg = "One or more files are not valid images. Only standard image formats (JPEG, PNG, etc.) are supported."
                            
                            logger.error(f"{indent}Multimodal LLM generation failed: {error_msg}")
                            raise RuntimeError(f"Multimodal LLM generation failed: {error_msg}")
                    else:
                        # Use standard text-only generation
                        result = self.llm_service.generate(
                            prompt=final_prompt,
                            settings=settings,
                            conversation_history=conversation_history
                        )
                    
                    # Handle structured output results
                    structured_output = settings.get('structuredOutput', {})
                    use_structured_output = structured_output.get('enabled', False)
                    
                    if use_structured_output and isinstance(result, dict) and 'content' in result:
                        # Extract structured output metadata
                        schema_valid = result.get('schema_valid', False)
                        validation_error = result.get('validation_error', None)
                        schema = result.get('schema', {})
                        
                        # Log structured output validation results
                        if schema_valid:
                            logger.info(f"{indent}Structured output validation successful")
                        else:
                            logger.warning(f"{indent}Structured output validation failed: {validation_error}")
                        
                        # Use the content as the result
                        result = result['content']
                    
                    # Step will be added in the general step addition code below
                    
                except Exception as e:
                    error_msg = f"LLM node {current_node['id']} failed: {str(e)}"
                    if ANSI_ENABLED:
                        logger.error(f"{COLORS['RED']}{indent}{error_msg}{COLORS['RESET']}")
                    else:
                        logger.error(f"{indent}{error_msg}")
                    raise RuntimeError(error_msg)
                    
            elif node_type == 'agent':
                logger.info(f"{indent}Executing agent node with ID: {current_node['id']}")
                settings = node_data.get('settings', {})
                query = input_data
                
                # Log agent settings
                settings_str = [
                    f"{COLORS['CYAN']}{indent}Agent Settings:{COLORS['RESET']}",
                    f"{indent}  System Prompt: {COLORS['GREEN']}{settings.get('systemPrompt', '')[:100]}{'...' if len(settings.get('systemPrompt', '')) > 100 else ''}{COLORS['RESET']}",
                    f"{indent}  User Prompt: {COLORS['GREEN']}{settings.get('userPrompt', '')[:100]}{'...' if len(settings.get('userPrompt', '')) > 100 else ''}{COLORS['RESET']}",
                    f"{indent}  Model: {COLORS['GREEN']}{settings.get('model', 'llama2')}{COLORS['RESET']}",
                    f"{indent}  Temperature: {COLORS['GREEN']}{settings.get('temperature', 0.7)}{COLORS['RESET']}"
                ]
                logger.info('\n'.join(settings_str))
                
                try:
                    # Get conversation history
                    current_conversation_id = context.get('conversation_id')
                    conversation_history = []
                    if current_conversation_id:
                        memory = ConversationMemory.query.get(current_conversation_id)
                        if memory:
                            conversation_history = memory.messages
                    
                    # Execute agent
                    result = self.agent_service.execute_agent(
                        input_data=query,
                        settings=settings,
                        conversation_history=conversation_history
                    )
                    
                except Exception as e:
                    error_msg = f"Agent node {current_node['id']} failed: {str(e)}"
                    if ANSI_ENABLED:
                        logger.error(f"{COLORS['RED']}{indent}{error_msg}{COLORS['RESET']}")
                    else:
                        logger.error(f"{indent}{error_msg}")
                    raise RuntimeError(error_msg)
                    
            elif node_type == 'knowledge':
                logger.info(f"{indent}Executing knowledge retrieval node with ID: {current_node['id']}")
                settings = node_data.get('settings', {})
                # Get knowledge base ID - standardizing on knowledge_id
                knowledge_id = node_data.get('knowledge_id')
                
                # For backward compatibility, check other possible locations
                if not knowledge_id:
                    if 'knowledgeBase' in node_data:
                        knowledge_id = node_data.get('knowledgeBase')
                    elif 'knowledge_uuid' in node_data:
                        knowledge_id = node_data.get('knowledge_uuid')
                    elif 'knowledgeBases' in node_data and len(node_data.get('knowledgeBases', [])) > 0:
                        knowledge_id = node_data.get('knowledgeBases')[0].get('id')
                query = context.get('input', '')
                
                # Log knowledge retrieval settings
                settings_str = [
                    f"{COLORS['CYAN']}{indent}Knowledge Retrieval Settings:{COLORS['RESET']}",
                    f"{indent}  Knowledge Base ID: {COLORS['GREEN']}{knowledge_id}{COLORS['RESET']}",
                    f"{indent}  Query: {COLORS['GREEN']}{query[:100]}{'...' if len(query) > 100 else ''}{COLORS['RESET']}"
                ]
                logger.info('\n'.join(settings_str))
                
                logger.info(f"{indent}Knowledge base: {knowledge_id}")
                logger.info(f"{indent}Query: {query[:100]}{'...' if len(query) > 100 else ''}")
                
                # Import KnowledgeRetrievalService for consistent results with studio
                from app.services.knowledge_retrieval_service import KnowledgeRetrievalService, RetrievalMethod
                
                # Get retrieval method from settings or node data
                retrieval_method = settings.get('retrieval_method')
                
                # If not in settings, check for method in node data
                if not retrieval_method:
                    method_name = node_data.get('method', '').lower()
                    if method_name in ['semantic', 'vector', 'embedding']:
                        retrieval_method = RetrievalMethod.SEMANTIC_SEARCH
                    elif method_name in ['hybrid', 'combined']:
                        retrieval_method = RetrievalMethod.HYBRID_SEARCH
                    else:  # Default to full-text
                        retrieval_method = RetrievalMethod.FULL_TEXT_SEARCH
                
                # Get limit from settings or default to 5
                limit = settings.get('limit', node_data.get('top_k', 5))
                
                # Log retrieval method and limit
                logger.info(f"{indent}Retrieval method: {retrieval_method}")
                logger.info(f"{indent}Result limit: {limit}")
                
                # Use KnowledgeRetrievalService for consistent results with studio
                retrieval_results = KnowledgeRetrievalService.retrieve(
                    retrieval_method=retrieval_method,
                    dataset_id=knowledge_id,
                    query=query,
                    top_k=limit
                )
                
                # Process results from KnowledgeRetrievalService
                if retrieval_results:
                    # Extract text content from results to create a combined context
                    documents = [doc.get('text_content', '') for doc in retrieval_results]
                    
                    # Create a combined context string from the documents
                    combined_context = "\n\n".join(documents) if documents else ""
                    
                    # Just return the combined context as the result
                    result = combined_context
                    
                    logger.info(f"{indent}Retrieved {len(retrieval_results)} knowledge chunks")
                    logger.info(f"{indent}Combined context length: {len(combined_context)} characters")
                else:
                    # Handle case where no results were found
                    result = ""
                    logger.info(f"{indent}No knowledge chunks retrieved")
                    
                # The complete result object will be available as output
                
            elif node_type == 'answer':
                logger.info(f"{indent}Executing answer node with ID: {current_node['id']}")
                settings = node_data.get('settings', {})
                
                # Get answer text template
                answer_text = settings.get('answerText', '')
                
                # Log answer text before interpolation
                logger.info(f"{indent}Answer text before interpolation: {answer_text}")
                
                # Replace variables in the format {{nodeId.variableName}}
                import re
                def replace_variable(match):
                    var_ref = match.group(1).strip()
                    node_id, var_name = var_ref.split('.')
                    
                    # Find the referenced node in process steps
                    for step in context.get('process_steps', []):
                        if step['node'] == node_id:
                            # Handle input/output variables
                            if var_name in ['input', 'output']:
                                value = step.get(var_name)
                                if value is not None:
                                    logger.info(f"{indent}  Found variable {node_id}.{var_name} = {str(value)[:50]}...")
                                    return str(value)
                            
                            # Handle classifier-specific variables
                            if step['type'] == 'classifier':
                                if var_name == 'class_name' and 'class_name' in step:
                                    logger.info(f"{indent}  Found classifier variable {node_id}.{var_name} = {step['class_name']}")
                                    return str(step['class_name'])
                                elif var_name == 'usage' and 'usage' in step:
                                    logger.info(f"{indent}  Found classifier variable {node_id}.{var_name} = {step['usage']}")
                                    return str(step['usage'])
                    logger.info(f"{indent}  Variable {node_id}.{var_name} not found")
                    return ''
                
                # Replace all variable references
                result = re.sub(r'\{\{\s*([^}]+?)\s*\}\}', replace_variable, answer_text)
                
                # Log answer text after interpolation
                logger.info(f"{indent}Answer text after interpolation: {result}")
                
                # Step will be added in the general step addition code below
                
            elif node_type == 'start':
                logger.info(f"{indent}Executing start node with ID: {current_node['id']}")
                # Start node simply passes through the input data
                result = input_data
                logger.info(f"{indent}Start node passing through input: {str(input_data)[:100]}{'...' if len(str(input_data)) > 100 else ''}")
                
            elif node_type == 'classifier':
                logger.info(f"{indent}Executing classifier node with ID: {current_node['id']}")
                settings = node_data.get('settings', {})
                
                # Use input variable from settings if provided, otherwise fall back to original input
                input_variable = settings.get('input_variable', '')
                if input_variable:
                    # Extract node_id and var_name from input_variable (format: node_id.var_name)
                    try:
                        node_id, var_name = input_variable.split('.')
                        # Find the referenced node in process steps
                        for step in context.get('process_steps', []):
                            if step['node'] == node_id and var_name in step:
                                query = step[var_name]
                                logger.info(f"{indent}Using input from {input_variable}: {str(query)[:100]}{'...' if len(str(query)) > 100 else ''}")
                                break
                        else:
                            query = context.get('input', '')
                            logger.warning(f"{indent}Could not find variable {input_variable}, falling back to original input")
                    except Exception as e:
                        query = context.get('input', '')
                        logger.error(f"{indent}Error processing input variable {input_variable}: {str(e)}, falling back to original input")
                else:
                    # Fall back to original input if no input_variable is set
                    query = context.get('input', '')
                    logger.info(f"{indent}No input variable set, using original input")
                
                # Log classifier settings
                settings_str = [
                    f"{COLORS['CYAN']}{indent}Classifier Settings:{COLORS['RESET']}",
                    f"{indent}  Model: {COLORS['GREEN']}{settings.get('model', 'llama2')}{COLORS['RESET']}",
                    f"{indent}  LLM Base URL: {COLORS['GREEN']}{settings.get('ollamaBaseUrl', 'http://localhost:11434')}{COLORS['RESET']}",
                    f"{indent}  Classes: {COLORS['GREEN']}{[c.get('name') for c in settings.get('classes', [])]}{COLORS['RESET']}",
                    f"{indent}  Vision Enabled: {COLORS['GREEN']}{settings.get('visionEnabled', False)}{COLORS['RESET']}",
                    f"{indent}  Memory Enabled: {COLORS['GREEN']}{settings.get('memoryEnabled', False)}{COLORS['RESET']}"
                ]
                logger.info('\n'.join(settings_str))
                
                try:
                    # Get conversation history if memory is enabled
                    conversation_history = []
                    if settings.get('memoryEnabled', False):
                        current_conversation_id = context.get('conversation_id')
                        if current_conversation_id:
                            memory = ConversationMemory.query.get(current_conversation_id)
                            if memory:
                                conversation_history = memory.messages
                    
                    # Get classes from settings
                    classes = settings.get('classes', [])
                    class_names = [c.get('name') for c in classes]
                    class_descriptions = [c.get('description') for c in classes]
                    
                    # Build prompt for classification
                    instruction = settings.get('instruction', '')
                    prompt = f"""You are a question classifier. Classify the following input into one of these categories:
{', '.join(class_names)}

"""
                    
                    # Add class descriptions if available
                    for i, (name, desc) in enumerate(zip(class_names, class_descriptions)):
                        if desc:
                            prompt += f"Class '{name}': {desc}\n"
                    
                    # Add custom instruction if provided
                    if instruction:
                        prompt += f"\n{instruction}\n"
                    
                    # Add the input to classify
                    prompt += f"\nInput to classify: {query}\n\nOutput only the class name without any explanation."

                    # Log prompt before classification
                    logger.info(f"{indent}Classification prompt: {prompt}")
                    
                    # Use LLM service to classify
                    classification_result = self.llm_service.generate(
                        prompt=prompt,
                        settings={
                            'model': settings.get('model', 'llama2'),
                            'ollamaBaseUrl': settings.get('ollamaBaseUrl', 'http://localhost:11434'),
                            'temperature': 0.1,  # Lower temperature for more deterministic classification
                        },
                        conversation_history=conversation_history if settings.get('memoryEnabled', False) else []
                    )
                    
                    # Extract the class name from the result
                    class_name = classification_result.strip()
                    
                    # Check if the class name is in the list of valid classes
                    if class_name not in class_names:
                        # Try to find the closest match
                        for name in class_names:
                            if name.lower() in class_name.lower():
                                class_name = name
                                break
                        else:
                            # If still not found, use the first class as default
                            logger.warning(f"{indent}Classification result '{class_name}' not in valid classes {class_names}. Using first class as default.")
                            class_name = class_names[0] if class_names else "Unknown"
                    
                    # Create result object with class name and usage info
                    result = {
                        'class_name': class_name,
                        'usage': {
                            'prompt_tokens': len(prompt.split()),
                            'completion_tokens': len(class_name.split()),
                            'total_tokens': len(prompt.split()) + len(class_name.split())
                        }
                    }
                    
                    logger.info(f"{indent}Classification result: {class_name}")
                    
                except Exception as e:
                    error_msg = f"Classifier node {current_node['id']} failed: {str(e)}"
                    if ANSI_ENABLED:
                        logger.error(f"{COLORS['RED']}{indent}{error_msg}{COLORS['RESET']}")
                    else:
                        logger.error(f"{indent}{error_msg}")
                    raise RuntimeError(error_msg)
                
            # Knowledge retrieval is handled in the earlier case

            #HTTP Request
            elif node_type == 'http_request':
                logger.info(f"{indent}Executing HTTP Request node with ID: {current_node['id']}")
                ### please utilize HttpRequestNode class to execute http request
                httpRequestNode = HttpRequestNode(current_node['id'], node_data, context)
                result = httpRequestNode.execute()
            
            #DOC EXTRACTOR
            elif node_type == 'doc_extractor':
                logger.info(f"{indent}Executing Document Extractor node with ID: {current_node['id']}")
                ### please utilize DocumentExtractorNode class to extract text from document
                documentExtractorNode = DocumentExtractorNode(current_node['id'], node_data, context)
                result = documentExtractorNode.execute()
            
            # IF/ELSE Node
            elif node_type == 'ifelse':
                logger.info(f"{indent}Executing IF/ELSE node with ID: {current_node['id']}")
                settings = node_data.get('settings', {})
                
                # Log IF/ELSE settings
                settings_str = [
                    f"{COLORS['CYAN']}{indent}IF/ELSE Settings:{COLORS['RESET']}",
                    f"{indent}  Conditions: {COLORS['GREEN']}{len(settings.get('conditions', []))}{COLORS['RESET']}"
                ]
                logger.info('\n'.join(settings_str))
                
                # Get conditions from settings
                conditions = settings.get('conditions', [])
                if not conditions:
                    logger.warning(f"{indent}No conditions found in IF/ELSE node {current_node['id']}")
                    result = {
                        'branch_taken': 'else',
                        'condition_result': False,
                        'reason': 'No conditions defined'
                    }
                else:
                    # Evaluate conditions
                    branch_taken = 'else'  # Default to else
                    condition_result = False
                    reason = 'All conditions evaluated to false'
                    
                    # Helper function to replace variables in condition values
                    import re
                    def replace_condition_variables(text):
                        if not isinstance(text, str):
                            return text
                            
                        def replace_var(match):
                            var_ref = match.group(1).strip()
                            try:
                                node_id, var_name = var_ref.split('.')
                                
                                # Find the referenced node in process steps
                                for step in context.get('process_steps', []):
                                    if step['node'] == node_id:
                                        # Handle input/output variables
                                        if var_name in ['input', 'output']:
                                            value = step.get(var_name)
                                            if value is not None:
                                                logger.info(f"{indent}  Found variable {node_id}.{var_name} = {str(value)[:50]}...")
                                                return str(value)
                            except Exception as e:
                                logger.error(f"Error replacing variable {var_ref}: {str(e)}")
                                
                            logger.info(f"{indent}  Variable {var_ref} not found or invalid")
                            return f"{{{{Variable {var_ref} not found}}}}"
                        
                        # Replace all variable references
                        return re.sub(r'\{\{\s*([^}]+?)\s*\}\}', replace_var, text)
                    
                    # Helper function to evaluate a single condition
                    def evaluate_condition(condition):
                        left = condition.get('left', '')
                        operator = condition.get('operator', 'eq')
                        right = condition.get('right', '')
                        
                        # Replace variables in left and right values
                        left = replace_condition_variables(left)
                        right = replace_condition_variables(right)
                        
                        # Log the condition being evaluated
                        logger.info(f"{indent}Evaluating condition: {left} {operator} {right}")
                        
                        # Handle special case for 'truthy' operator
                        if operator == 'truthy':
                            # Check if left is truthy (not empty, not zero, not False, not None)
                            result = bool(left)
                            logger.info(f"{indent}Truthy evaluation result: {result}")
                            return result, f"'{left}' is {'truthy' if result else 'not truthy'}"
                        
                        # Convert to strings for comparison
                        left_str = str(left)
                        right_str = str(right)
                        
                        # Evaluate based on operator
                        if operator == 'eq':
                            result = left_str == right_str
                            reason = f"'{left_str}' {'equals' if result else 'does not equal'} '{right_str}'"
                        elif operator == 'neq':
                            result = left_str != right_str
                            reason = f"'{left_str}' {'does not equal' if result else 'equals'} '{right_str}'"
                        elif operator == 'contains':
                            result = right_str in left_str
                            reason = f"'{left_str}' {'contains' if result else 'does not contain'} '{right_str}'"
                        elif operator == 'ncontains':
                            result = right_str not in left_str
                            reason = f"'{left_str}' {'does not contain' if result else 'contains'} '{right_str}'"
                        elif operator == 'starts':
                            result = left_str.startswith(right_str)
                            reason = f"'{left_str}' {'starts with' if result else 'does not start with'} '{right_str}'"
                        elif operator == 'ends':
                            result = left_str.endswith(right_str)
                            reason = f"'{left_str}' {'ends with' if result else 'does not end with'} '{right_str}'"
                        elif operator == 'gt':
                            # Try numeric comparison if possible
                            try:
                                left_num = float(left_str)
                                right_num = float(right_str)
                                result = left_num > right_num
                                reason = f"{left_num} {'is' if result else 'is not'} greater than {right_num}"
                            except ValueError:
                                # Fall back to string comparison
                                result = left_str > right_str
                                reason = f"'{left_str}' {'is' if result else 'is not'} greater than '{right_str}' (string comparison)"
                        elif operator == 'lt':
                            # Try numeric comparison if possible
                            try:
                                left_num = float(left_str)
                                right_num = float(right_str)
                                result = left_num < right_num
                                reason = f"{left_num} {'is' if result else 'is not'} less than {right_num}"
                            except ValueError:
                                # Fall back to string comparison
                                result = left_str < right_str
                                reason = f"'{left_str}' {'is' if result else 'is not'} less than '{right_str}' (string comparison)"
                        elif operator == 'regex':
                            try:
                                import re
                                pattern = re.compile(right_str)
                                result = bool(pattern.search(left_str))
                                reason = f"'{left_str}' {'matches' if result else 'does not match'} regex pattern '{right_str}'"
                            except Exception as e:
                                result = False
                                reason = f"Regex error: {str(e)}"
                        else:
                            result = False
                            reason = f"Unknown operator: {operator}"
                        
                        logger.info(f"{indent}Condition result: {result} - {reason}")
                        return result, reason
                    
                    # Evaluate the IF condition first
                    if conditions:
                        if_condition = conditions[0]
                        if_result, if_reason = evaluate_condition(if_condition)
                        
                        if if_result:
                            branch_taken = 'if'
                            condition_result = True
                            reason = if_reason
                        else:
                            # Evaluate ELIF conditions if any
                            for i, elif_condition in enumerate(conditions[1:]):
                                elif_result, elif_reason = evaluate_condition(elif_condition)
                                
                                if elif_result:
                                    branch_taken = f'elif-{i}'
                                    condition_result = True
                                    reason = elif_reason
                                    break
                    
                    # Result contains the branch taken and evaluation details
                    result = {
                        'branch_taken': branch_taken,
                        'condition_result': condition_result,
                        'reason': reason
                    }
                    
                    logger.info(f"{indent}IF/ELSE evaluation complete. Branch taken: {branch_taken}")
                    logger.info(f"{indent}Reason: {reason}")
                
            else:
                if ANSI_ENABLED:
                    logger.warning(f"{COLORS['YELLOW']}{indent}Unknown node type: {node_type}{COLORS['RESET']}")
                else:
                    logger.warning(f"{indent}Unknown node type: {node_type}")
                result = input_data

            # Calculate node execution time and log results
            node_execution_time = time.time() - node_start_time
            truncated_result = str(result)[:100] + '...' if len(str(result)) > 100 else str(result)
            
            logger.info(f"{COLORS['GREEN']}{indent}Node {current_node['id']} completed in {node_execution_time:.3f}s{COLORS['RESET']}")
            logger.info(f"{indent}Result: {truncated_result}")
            
            # Store assistant responses in conversation memory for LLM and Agent nodes
            if node_type in ['llm', 'agent'] and result:
                current_conversation_id = context.get('conversation_id')
                if current_conversation_id:
                    memory = ConversationMemory.query.get(current_conversation_id)
                    if memory:
                        logger.info(f"{indent}Adding assistant response to conversation memory with role_type: {node_type}")
                        memory.add_message('assistant', str(result), role_type=node_type)
                        db.session.commit()
                        logger.info(f"{indent}Assistant response added to conversation memory with role_type: {node_type}")
                    else:
                        logger.warning(f"{indent}Conversation memory with ID {current_conversation_id} not found, cannot store assistant response")
                else:
                    logger.warning(f"{indent}No conversation ID in context, cannot store assistant response")
            
            # Update context with result and execution metadata
            context[f'node_{current_node["id"]}_result'] = result
            context[f'node_{current_node["id"]}_input'] = input_data
            context[f'node_{current_node["id"]}_time'] = node_execution_time
            
            # Add process step if not already added
            if 'process_steps' not in context:
                context['process_steps'] = []
                
            # Check if this node already has a step recorded
            existing_step = next((s for s in context['process_steps'] if s['node'] == current_node['id']), None)
            
            if not existing_step:
                # Create step with additional structured output metadata if applicable
                step = {
                    'node': current_node['id'],
                    'type': node_type,
                    'label': node_data.get('label', ''),
                    'time': round(node_execution_time * 1000),  # Convert to milliseconds
                    'input': input_data if node_type == 'start' else context.get('input', ''),
                    'output': result,
                    'status': 'completed'
                }
                
                # Special handling for classifier node output
                if node_type == 'classifier' and isinstance(result, dict):
                    # Store the class_name as a separate field for easier access
                    step['class_name'] = result.get('class_name', '')
                    step['usage'] = result.get('usage', {})
                    
                    # Log the classification result
                    logger.info(f"{indent}Classification result stored in process step: {step['class_name']}")
                    
                    # Store the next step mapping based on the classification result
                    settings = node_data.get('settings', {})
                    next_steps = settings.get('nextSteps', {})
                    if step['class_name'] in next_steps:
                        step['next_node_id'] = next_steps[step['class_name']]
                        logger.info(f"{indent}Next step for class '{step['class_name']}': {step['next_node_id']}")
                    else:
                        logger.info(f"{indent}No next step mapping found for class '{step['class_name']}'")                
                
                # Special handling for ifelse node output
                elif node_type == 'ifelse' and isinstance(result, dict):
                    # Store the branch taken and condition result
                    step['branch_taken'] = result.get('branch_taken', 'else')
                    step['condition_result'] = result.get('condition_result', False)
                    step['reason'] = result.get('reason', '')
                    
                    # Log the branch taken
                    logger.info(f"{indent}IF/ELSE branch taken stored in process step: {step['branch_taken']}")
                    
                    # Store the next step mapping based on the branch taken
                    settings = node_data.get('settings', {})
                    next_steps = settings.get('nextSteps', {})
                    
                    # Determine the next node based on the branch taken
                    next_node_id = None
                    if step['branch_taken'] == 'if' and 'if' in next_steps:
                        next_node_id = next_steps['if']
                    elif step['branch_taken'].startswith('elif-'):
                        # Extract the elif index from the branch name
                        try:
                            elif_idx = int(step['branch_taken'].split('-')[1])
                            if 'elif' in next_steps and isinstance(next_steps['elif'], list) and elif_idx < len(next_steps['elif']):
                                next_node_id = next_steps['elif'][elif_idx]
                        except (ValueError, IndexError):
                            logger.warning(f"{indent}Invalid ELIF index in branch taken: {step['branch_taken']}")
                    elif step['branch_taken'] == 'else' and 'else' in next_steps:
                        next_node_id = next_steps['else']
                    
                    if next_node_id:
                        step['next_node_id'] = next_node_id
                        logger.info(f"{indent}Next step for branch '{step['branch_taken']}': {step['next_node_id']}")
                    else:
                        logger.info(f"{indent}No next step mapping found for branch '{step['branch_taken']}'")                
                
                # Add structured output metadata if this is an LLM node with structured output enabled
                if node_type == 'llm':
                    settings = node_data.get('settings', {})
                    structured_output = settings.get('structuredOutput', {})
                    use_structured_output = structured_output.get('enabled', False)
                    
                    # Add multimodal information if enabled
                    enable_multimodal = settings.get('enableMultimodal', False)
                    image_paths = context.get('image_paths', [])
                    has_images = enable_multimodal and image_paths and len(image_paths) > 0
                    
                    if has_images:
                        step['multimodal_enabled'] = True
                        step['image_count'] = len(image_paths)
                        step['image_paths'] = [os.path.basename(path) for path in image_paths]
                    
                    if use_structured_output:
                        step['structured_output_enabled'] = True
                        step['structured_output_schema'] = structured_output.get('properties', [])
                        
                        # If we have validation results, include them
                        if isinstance(result, dict) and 'schema_valid' in result:
                            step['structured_output_valid'] = result.get('schema_valid', False)
                            if not result.get('schema_valid', False):
                                step['structured_output_error'] = result.get('validation_error', 'Unknown validation error')

                context['process_steps'].append(step)
            else:
                # Use the existing step for logging
                step = existing_step
            
            # Log process step details
            logger.info(f"{indent}Adding process step:")
            logger.info(f"{indent}  Node: {step['node']}")
            logger.info(f"{indent}  Type: {step['type']}")
            logger.info(f"{indent}  Input: {step['input']}")
            logger.info(f"{indent}  Output: {step['output']}")
            
            # Step is already stored in context
            
            # Log completion
            logger.info(f"{COLORS['BOLD']}{indent}Node {current_node['id']} execution completed{COLORS['RESET']}")
            
            # Create node footer with Windows compatibility
            if ANSI_ENABLED:
                node_footer = f"{COLORS['CYAN']}{indent}{'-' * 70}{COLORS['RESET']}"
            else:
                node_footer = f"{indent}{'-' * 70}"
            logger.info(node_footer)
            
            return result
            
        except Exception as e:
            # Log node failure with detailed error information and Windows compatibility
            if ANSI_ENABLED:
                node_failure = f"{COLORS['RED']}{COLORS['BOLD']}{indent}" \
                              f"NODE FAILED: {current_node['id']} | ERROR: {str(e)}{COLORS['RESET']}"
            else:
                node_failure = f"{indent}NODE FAILED: {current_node['id']} | ERROR: {str(e)}"
            logger.error(node_failure)
            raise
