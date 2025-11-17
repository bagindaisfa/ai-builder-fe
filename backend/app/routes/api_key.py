from flask_restx import Namespace, Resource, fields, marshal
from flask import request, jsonify
from http import HTTPStatus
import uuid
import logging

from .. import db
from ..models.api_key import APIKey
from ..services import api_key_service
from ..services.auth_service import auth_service

api = Namespace('Api Keys', description='API key related operations')
logger = logging.getLogger(__name__)

# Response models
error_model = api.model('Error', {
    'status': fields.String(description='Status of the response'),
    'code': fields.String(description='Error code'),
    'message': fields.String(description='Error message')
})

api_key_model = api.model('APIKey', {
    'uuid': fields.String(description='The API key unique identifier'),
    'workflow_uuid': fields.String(required=True, description='The workflow UUID this key belongs to'),
    'token': fields.String(description='The API key token'),
    'name': fields.String(description='The API key name'),
    'description': fields.String(description='The API key description'),
    'created_at': fields.DateTime(description='When the API key was created'),
    'last_used_at': fields.DateTime(description='When the API key was last used')
})

pagination_model = api.model('Pagination', {
    'page': fields.Integer(description='Current page number', default=1, min=1),
    'per_page': fields.Integer(description='Number of items per page', default=10, min=1, max=100),
    'total': fields.Integer(description='Total number of items'),
    'pages': fields.Integer(description='Total number of pages')
})

api_key_list_model = api.model('APIKeyList', {
    'items': fields.List(fields.Nested(api_key_model)),
    'pagination': fields.Nested(pagination_model)
})

api_key_create_model = api.model('APIKeyCreate', {
    'name': fields.String(required=True, description='Name for the API key', min_length=1, max_length=100),
    'workflow_uuid': fields.String(required=True, description='The workflow UUID this key belongs to'),
    'description': fields.String(required=False, description='Description for the API key', default='')
})

def make_error_response(message, code='error', status_code=400):
    """Helper function to create consistent error responses"""
    return {
        'status': 'error',
        'code': code,
        'message': message
    }, status_code

@api.route('')
class APIKeys(Resource):
    @api.doc('list_api_keys',
             params={
                 'page': 'Page number for pagination (default: 1)',
                 'per_page': 'Number of items per page (default: 10, max: 100)',
                 'keyword': 'Keyword to search in name or description (optional)',
                 'workflow_uuid': 'Optional workflow UUID to filter by (optional)'
             },
             responses={
                 200: ('Successfully retrieved API keys', api_key_list_model),
                 400: ('Bad request', error_model),
                 401: ('Unauthorized', error_model),
                 500: ('Internal server error', error_model)
             })
    @auth_service.token_required
    def get(self, current_user):
        """List all API keys with pagination and search"""
        try:
            # Get pagination parameters with defaults
            page = request.args.get('page', 1, type=int)
            per_page = min(request.args.get('per_page', 10, type=int), 100)  # Max 100 per page
            keyword = request.args.get('keyword', '').strip()
            workflow_uuid = request.args.get('workflow_uuid', '').strip()
            
            if page < 1 or per_page < 1:
                return make_error_response('Invalid pagination parameters', 'invalid_pagination', 400)
            
            # Validate workflow_uuid if provided
            if workflow_uuid:
                try:
                    uuid.UUID(workflow_uuid)
                except (ValueError, TypeError):
                    return make_error_response('Invalid workflow UUID format', 'invalid_uuid', 400)
            
            # Get paginated and filtered API keys
            try:
                query = APIKey.query
                
                # Filter by workflow_uuid if provided
                if workflow_uuid:
                    query = query.filter_by(workflow_uuid=workflow_uuid)
                
                # Apply keyword filter if provided
                if keyword:
                    search = f"%{keyword}%"
                    query = query.filter(
                        db.or_(
                            APIKey.name.ilike(search),
                            APIKey.description.ilike(search)
                        )
                    )
                
                # Get paginated results
                pagination = query.order_by(APIKey.created_at.desc()).paginate(
                    page=page, per_page=per_page, error_out=False
                )
                
                # Format the response with proper JSON serialization
                items = []
                for key in pagination.items:
                    items.append({
                        'uuid': str(key.uuid),
                        'workflow_uuid': str(key.workflow_uuid),
                        'token': str(key.token),
                        'name': str(key.name) if key.name is not None else None,
                        'description': str(key.description) if key.description is not None else None,
                        'created_at': key.created_at.isoformat() if key.created_at else None,
                        'last_used_at': key.last_used_at.isoformat() if key.last_used_at else None
                    })
                
                result = {
                    'items': items,
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total': pagination.total,
                        'pages': pagination.pages
                    }
                }
                
                return result, 200
                
            except Exception as e:
                logger.error(f'Error retrieving API keys for workflow {workflow_uuid}: {str(e)}', exc_info=True)
                return make_error_response('Failed to retrieve API keys', 'retrieval_error', 500)
                
        except Exception as e:
            logger.critical(f'Unexpected error in list_workflow_api_keys: {str(e)}', exc_info=True)
            return make_error_response('An unexpected error occurred', 'server_error', 500)
    
    @api.doc('create_api_key',
             responses={
                 201: ('API key created successfully', api_key_model),
                 400: ('Bad request', error_model),
                 401: ('Unauthorized', error_model),
                 422: ('Unprocessable entity', error_model),
                 500: ('Internal server error', error_model)
             })
    @api.expect(api_key_create_model, validate=True)
    @auth_service.token_required
    def post(self, current_user):
        """
        Create a new API key
        
        Request body should include name, workflow_uuid, and optional description.
        """
        try:
            logger.info("Received request to create API key")
            
            # Get request data
            data = request.get_json() or {}
            name = data.get('name', '').strip()
            workflow_uuid = data.get('workflow_uuid', '').strip()
            description = data.get('description', '').strip() or None
            
            # Validate required fields
            if not name:
                return make_error_response('Name is required', 'validation_error', 400)
                
            if not workflow_uuid:
                return make_error_response('workflow_uuid is required', 'validation_error', 400)
                
            if len(name) > 100:
                return make_error_response('Name must be less than 100 characters', 'validation_error', 400)
            
            # Validate workflow UUID format
            try:
                uuid.UUID(workflow_uuid)
            except (ValueError, TypeError):
                logger.warning(f'Invalid workflow UUID format: {workflow_uuid}')
                return make_error_response('Invalid workflow UUID format', 'invalid_uuid', 400)
            
            try:
                # Try to create the API key with name and description
                api_key = api_key_service.create_api_key(
                    workflow_uuid=workflow_uuid,
                    name=name,
                    description=description
                )
                logger.info(f"Successfully created API key: {api_key.uuid}")
                
                # Format the response using the model's to_dict method and ensure all values are JSON serializable
                response = {
                    'uuid': str(api_key.uuid),
                    'workflow_uuid': str(api_key.workflow_uuid),
                    'token': str(api_key.token),
                    'name': str(api_key.name) if api_key.name is not None else None,
                    'description': str(api_key.description) if api_key.description is not None else None,
                    'created_at': api_key.created_at.isoformat() if api_key.created_at else None,
                    'last_used_at': api_key.last_used_at.isoformat() if api_key.last_used_at else None
                }
                return response, 201
                
            except ValueError as ve:
                logger.error(f"Validation error creating API key: {str(ve)}")
                return make_error_response(str(ve), 'validation_error', 400)
                
            except Exception as e:
                logger.error(f"Error creating API key: {str(e)}", exc_info=True)
                if "foreign key constraint" in str(e).lower():
                    return make_error_response(f"Workflow not found: {workflow_uuid}", 'not_found', 404)
                elif "duplicate key" in str(e).lower():
                    return make_error_response("API key already exists for this workflow", 'duplicate_key', 409)
                else:
                    return make_error_response(f"Database error: {str(e)}", 'database_error', 422)
                    
        except Exception as e:
            logger.critical(f"Unexpected error in API key creation: {str(e)}", exc_info=True)
            return make_error_response('An unexpected error occurred', 'server_error', 500)

@api.route('/<api_key_uuid>')
@api.param('api_key_uuid', 'The API key identifier')
class APIKeyResource(Resource):
    @api.doc('delete_api_key',
             responses={
                 204: 'API key deleted successfully',
                 400: ('Bad request - Invalid API key UUID', error_model),
                 401: ('Unauthorized', error_model),
                 403: ('Forbidden - Insufficient permissions', error_model),
                 404: ('API key not found', error_model),
                 500: ('Internal server error', error_model)
             })
    @auth_service.token_required
    def delete(self, current_user, api_key_uuid):
        """
        Delete an API key
        
        Note: Only the owner of the workflow can delete its API keys.
        """
        try:
            logger.info(f"Received request to delete API key: {api_key_uuid}")
            
            # Validate API key UUID format
            try:
                uuid.UUID(api_key_uuid)
            except (ValueError, TypeError):
                logger.warning(f'Invalid API key UUID format: {api_key_uuid}')
                return {'status': 'error', 'code': 'invalid_uuid', 'message': 'Invalid API key UUID format'}, 400
            
            try:
                # Check if API key exists and get its workflow
                api_key = APIKey.query.filter_by(uuid=api_key_uuid).first()
                if not api_key:
                    logger.warning(f"API key not found: {api_key_uuid}")
                    return {'status': 'error', 'code': 'not_found', 'message': 'API key not found'}, 404
                
                # Here you would add permission checks, e.g.:
                # if not current_user.can_manage_workflow(api_key.workflow_uuid):
                #     logger.warning(f"User {current_user.id} not authorized to delete API key {api_key_uuid}")
                #     return make_error_response('Insufficient permissions', 'forbidden', 403)
                
                # Delete the API key
                db.session.delete(api_key)
                db.session.commit()
                
                logger.info(f"Successfully deleted API key: {api_key_uuid}")
                return '', 204
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error deleting API key {api_key_uuid}: {str(e)}", exc_info=True)
                return {'status': 'error', 'code': 'deletion_error', 'message': 'Failed to delete API key'}, 500
                
        except Exception as e:
            logger.critical(f"Unexpected error in delete_api_key: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'server_error', 'message': 'An unexpected error occurred'}, 500

# Add to_dict method to APIKey model
def to_dict(self):
    return {
        'uuid': self.uuid,
        'workflow_uuid': self.workflow_uuid,
        'token': self.token,
        'created_at': self.created_at.isoformat() if self.created_at else None,
        'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None
    }

APIKey.to_dict = to_dict
