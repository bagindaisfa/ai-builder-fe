from flask import request, Blueprint
from flask_restx import Namespace, Resource, fields
from ..services import WorkflowService
from werkzeug.exceptions import BadRequest
from ..services.auth_service import auth_service
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Keep the Blueprint for compatibility
bp = Blueprint('studio', __name__)
workflow_service = WorkflowService()

# Create a namespace for studio routes
api = Namespace('Studio', description='Studio operations')

# Define models for request/response documentation
workflow_input = api.model('WorkflowInput', {
    'name': fields.String(required=True, description='Workflow name'),
    'description': fields.String(description='Workflow description'),
    'nodes': fields.Raw(required=True, description='Workflow nodes'),
    'edges': fields.Raw(required=True, description='Workflow edges')
})

workflow_model = api.model('Workflow', {
    'id': fields.Integer(description='Workflow ID'),
    'name': fields.String(description='Workflow name'),
    'description': fields.String(description='Workflow description'),
    'nodes': fields.Raw(description='Workflow nodes'),
    'edges': fields.Raw(description='Workflow edges'),
    'created_at': fields.DateTime(description='Creation timestamp'),
    'updated_at': fields.DateTime(description='Last update timestamp')
})

execution_input = api.model('ExecutionInput', {
    'input': fields.String(description='Input data for the workflow'),
    'conversation_id': fields.String(description='Optional conversation memory UUID for continuing an existing conversation'),
    'files': fields.List(
            fields.Nested(api.model('UploadedFile', {
                'uuid': fields.String(description='File UUID'),
                'filename': fields.String(description='File name'),
                'original_filename': fields.String(description='Original file name'),
                'path': fields.String(description='File path'),
                'url': fields.String(description='File URL'),
                'size': fields.Integer(description='File size in bytes'),
                'extension': fields.String(description='File extension'),
                'mime_type': fields.String(description='File MIME type'),
                'created_at': fields.Integer(description='Upload timestamp in seconds since epoch')
            }), description='List of uploaded files')
        )
})

execution_result = api.model('ExecutionResult', {
    'result': fields.Raw(description='Result of the workflow execution'),
    'conversation_id': fields.String(description='Unique conversation memory UUID for this session')
})

# Define models for workflow variables
variable_output = api.model('VariableOutput', {
    'name': fields.String(description='Output variable name'),
    'type': fields.String(description='Output variable type'),
    'description': fields.String(description='Output variable description')
})

workflow_variable = api.model('WorkflowVariable', {
    'node_id': fields.String(description='Node identifier'),
    'node_name': fields.String(description='Node name'),
    'node_type': fields.String(description='Node type'),
    'outputs': fields.List(fields.Nested(variable_output), description='Node outputs')
})

@api.route('/workflows')
class WorkflowResource(Resource):
    @api.doc('create_workflow')
    @api.expect(workflow_input)
    @api.response(201, 'Workflow created successfully', workflow_model)
    @api.response(400, 'Validation Error')
    @auth_service.token_required
    def post(self, current_user=None):
        """Create a new workflow"""
        logging.info("Creating new workflow")
        data = request.get_json()
        if not data:
            logging.error("No input data provided")
            api.abort(400, "No input data provided")
        
        required = ['name', 'nodes', 'edges']
        if not all(k in data for k in required):
            missing = [k for k in required if k not in data]
            logging.error(f"Missing required fields: {missing}")
            api.abort(400, f"Missing required fields: {', '.join(missing)}")
        
        try:
            workflow = workflow_service.create_workflow(
                name=data['name'],
                description=data.get('description', ''),
                nodes=data['nodes'],
                edges=data['edges']
            )
            logging.info(f"Workflow created successfully with ID: {workflow.uuid}")
            return workflow.to_dict(), 201
        except Exception as e:
            logging.error(f"Failed to create workflow: {str(e)}")
            raise
    
    @api.doc('list_workflows')
    @api.response(200, 'Success', [workflow_model])
    @auth_service.token_required
    def get(self, current_user=None):
        """List all workflows (legacy endpoint, use /workflows/paginated instead)"""
        logging.info("Listing all workflows (legacy endpoint)")
        workflows = workflow_service.list_workflows()
        logging.info(f"Found {len(workflows)} workflows")
        return [w.to_dict() for w in workflows]

@api.route('/workflows/paginated')
class WorkflowPaginatedResource(Resource):
    @api.doc('list_workflows_paginated', params={
        'page': 'Page number starting from 1',
        'per_page': 'Items per page',
        'keyword': 'Optional search keyword (matches name or description)'
    })
    @api.response(200, 'Success')
    @auth_service.token_required
    def get(self, current_user=None):
        """List workflows with pagination"""
        try:
            page = int(request.args.get('page', 1))
        except Exception:
            page = 1

        keyword = request.args.get('keyword', '')
        keyword = keyword.strip() if keyword else ''

        try:
            per_page = int(request.args.get('per_page', 10))
        except Exception:
            per_page = 10

        result = workflow_service.list_workflows_paginated(
            page=page, 
            per_page=per_page, 
            keyword=keyword
        )
        
        return {
            'items': [w.to_dict() for w in result.items],
            'total': result.total,
            'page': page,
            'per_page': per_page,
            'total_pages': result.pages
        }

@api.route('/workflows/<uuid:workflow_uuid>')
@api.param('workflow_uuid', 'The workflow identifier')
class WorkflowItem(Resource):
    @api.doc('get_workflow')
    @api.response(200, 'Success', workflow_model)
    @api.response(404, 'Workflow not found')
    @auth_service.dual_auth_required
    def get(self, workflow_uuid, current_user=None):
        """Get a specific workflow"""
        logging.info(f"Fetching workflow with UUID: {workflow_uuid}")
        try:
            workflow = workflow_service.get_workflow(workflow_uuid)
            logging.info(f"Successfully retrieved workflow {workflow_uuid}")
            return workflow.to_dict()
        except Exception as e:
            logging.error(f"Failed to fetch workflow {workflow_uuid}: {str(e)}")
            raise

    @api.doc('update_workflow')
    @api.expect(workflow_input)
    @api.response(200, 'Success', workflow_model)
    @api.response(404, 'Workflow not found')
    @auth_service.token_required
    def put(self, workflow_uuid, current_user=None):
        """Update a specific workflow"""
        logging.info(f"Updating workflow with UUID: {workflow_uuid}")
        data = request.get_json()
        
        try:
            workflow = workflow_service.update_workflow(
                workflow_uuid,
                nodes=data.get('nodes'),
                edges=data.get('edges')
            )
            logging.info(f"Successfully updated workflow {workflow_uuid}")
            return workflow.to_dict()
        except Exception as e:
            logging.error(f"Failed to update workflow {workflow_uuid}: {str(e)}")
            raise

@api.route('/workflows/<uuid:workflow_uuid>/variables')
@api.param('workflow_uuid', 'The workflow identifier')
@api.param('current_node_id', 'ID of the current node to find variables for')
class WorkflowVariables(Resource):
    @api.doc('get_workflow_variables',
            description='Get available variables from nodes that come before the current node in the workflow')
    @api.response(200, 'Success', [workflow_variable])
    @api.response(400, 'Invalid request')
    @api.response(404, 'Workflow not found')
    @api.response(500, 'Internal server error')
    @auth_service.dual_auth_required
    def get(self, workflow_uuid, current_user=None):
        """Get available variables for a workflow node"""
        current_node_id = request.args.get('current_node_id')
        logging.info(f"Fetching variables for workflow {workflow_uuid}, node {current_node_id}")
        
        if not current_node_id:
            api.abort(400, "current_node_id is required")

        try:
            variables = workflow_service.get_workflow_variables(workflow_uuid, current_node_id)
            logging.info(f"Successfully retrieved variables for workflow {workflow_uuid}")
            return variables
        except ValueError as e:
            logging.error(f"Invalid request: {str(e)}")
            api.abort(400, str(e))
        except Exception as e:
            logging.error(f"Failed to fetch variables: {str(e)}")
            api.abort(500, "Internal server error")

@api.route('/workflows/execute/<uuid:workflow_uuid>')
@api.param('workflow_uuid', 'The workflow identifier')
class WorkflowExecution(Resource):
    @api.doc('cancel_workflow')
    @api.response(200, 'Success')
    @api.response(404, 'Workflow not found')
    @auth_service.dual_auth_required
    def delete(self, workflow_uuid, current_user=None):
        """Cancel a running workflow"""
        logging.info(f"Cancelling workflow {workflow_uuid}")
        
        try:
            cancelled = workflow_service.cancel_workflow(workflow_uuid)
            logging.info(f"{'Successfully cancelled' if cancelled else 'No active'} workflow {workflow_uuid}")
            return {'cancelled': cancelled}
        except Exception as e:
            logging.error(f"Failed to cancel workflow {workflow_uuid}: {str(e)}")
            api.abort(400, str(e))
    @api.doc('execute_workflow')
    @api.expect(execution_input)
    @api.response(200, 'Success', execution_result)
    @api.response(400, 'Execution error')
    @api.response(404, 'Workflow not found')
    @auth_service.dual_auth_required
    def post(self, workflow_uuid, current_user=None):
        """Execute a workflow"""
        logging.info(f"Executing workflow {workflow_uuid}")
        data = request.get_json() or {}
        input_data = data.get('input')
        conversation_id = data.get('conversation_id')
        files = data.get('files')
        
        # Log if conversation_id is provided
        if conversation_id:
            logging.info(f"Continuing conversation with ID: {conversation_id}")
        else:
            logging.info("No conversation ID provided, will create new conversation")
        
        try:
            result = workflow_service.execute_workflow(
                workflow_uuid=workflow_uuid, 
                input_data=input_data,
                conversation_id=conversation_id,
                files=files
            )
            logging.info(f"Successfully executed workflow {workflow_uuid}")
            return {'result': result}
        except Exception as e:
            logging.error(f"Failed to execute workflow {workflow_uuid}: {str(e)}")
            api.abort(400, str(e))
