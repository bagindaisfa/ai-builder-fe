from flask import request, Blueprint, current_app
from flask_restx import Namespace, Resource, fields
from werkzeug.datastructures import FileStorage
from ..services import KnowledgeService, KnowledgeRetrievalService
from ..services.knowledge_retrieval_service import RetrievalMethod
from ..services.document_service import DocumentService
from ..models import Document, Knowledge
from ..services.auth_service import auth_service

# Keep the Blueprint for compatibility
bp = Blueprint('knowledge', __name__)
knowledge_service = KnowledgeService()
document_service = DocumentService()

# Create a namespace for knowledge routes
api = Namespace('Knowledge', description='Knowledge operations')

# Define models for request/response documentation
knowledge_input = api.model('KnowledgeInput', {
    'name': fields.String(required=True, description='Knowledge name'),
    'description': fields.String(description='Knowledge description'),
    'embedding_model': fields.String(description='Embedding model to use')
})

knowledge_model = api.model('Knowledge', {
    'uuid': fields.String(description='Knowledge  UUID'),
    'name': fields.String(description='Knowledge  name'),
    'description': fields.String(description='Knowledge description'),
    'embedding_model': fields.String(description='Embedding model used'),
    'document_count': fields.Integer(description='Number of documents in the knowledge base'),
    'created_at': fields.DateTime(description='Creation timestamp'),
    'updated_at': fields.DateTime(description='Last update timestamp')
})

document_model = api.model('Document', {
    'uuid': fields.String(description='Document UUID'),
    'filename': fields.String(description='Document filename'),
    'content_type': fields.String(description='Document content type'),
    'embedding_status': fields.String(description='Status of document embedding'),
    'created_at': fields.DateTime(description='Creation timestamp'),
    'updated_at': fields.DateTime(description='Last update timestamp')
})

query_input = api.model('QueryInput', {
    'query': fields.String(required=True, description='Search query'),
    'limit': fields.Integer(description='Maximum number of results to return', default=5)
})

query_result = api.model('QueryResult', {
    'text': fields.String(description='Text content'),
    'score': fields.Float(description='Relevance score'),
    'metadata': fields.Raw(description='Additional metadata')
})

initial_processing_model = api.model('InitialProcessingModel', {
    'name' : fields.String( description='Knowledge name'),
    'description' : fields.String(description='Knowledge description'),
    'processing_config': fields.Raw(required=True, description='Processing configuration'),
    'documents': fields.List(fields.Nested(api.model('DocumentItem', {
        'id': fields.String(required=True, description='Document ID'),
        'original_filename': fields.String(description='Original filename'),
        'stored_filename': fields.String(description='Stored filename'),
        'file_path': fields.String(description='File path'),
        'file_size': fields.Integer(description='File size in bytes'),
        'mime_type': fields.String(description='MIME type'),
        'created_at': fields.String(description='Creation timestamp'),
        'file_extension': fields.String(description='File extension')
    })),
    required=True,
    description='List of document objects')
})

initial_edit_processing_model = api.model('InitialProcessingModel', {
    'uuid' : fields.String( description='Knowledge uuid'),
    'name' : fields.String( description='Knowledge name'),
    'description' : fields.String(description='Knowledge description'),
    'processing_config': fields.Raw(required=True, description='Processing configuration'),
    'documents': fields.List(fields.Nested(api.model('DocumentItem', {
        'id': fields.String(required=True, description='Document ID'),
        'original_filename': fields.String(description='Original filename'),
        'stored_filename': fields.String(description='Stored filename'),
        'file_path': fields.String(description='File path'),
        'file_size': fields.Integer(description='File size in bytes'),
        'mime_type': fields.String(description='MIME type'),
        'created_at': fields.String(description='Creation timestamp'),
        'file_extension': fields.String(description='File extension')
    })),
    required=True,
    description='List of document objects')
})

initial_processing_model_response = api.model('InitialProcessingModelResponse', {
    'knowledge_uuid': fields.String(description='Knowledge ID'),
    'document_count': fields.Integer(description='Number of documents processed'),
    'documents': fields.List(
        fields.Nested(api.model('ProcessedDocument', {
            'id': fields.String(description='Document ID'),
            'original_filename': fields.String(description='Original filename'),
            'embedding_status': fields.String(description='Status of document processing')
        })),
        description='List of processed documents with status'
    )
})

# File upload parser
upload_parser = api.parser()
upload_parser.add_argument('file', location='files', type=FileStorage, required=True, help='Document file')

upload_parser_docs = api.parser()
upload_parser_docs.add_argument('files', location='files', type=FileStorage, required=True, action='append', help='Document files')

@api.route('/knowledges')
class KnowledgeBaseResource(Resource):
   
    @api.doc('list_knowledge')
    @api.response(200, 'Success', [knowledge_model])
    @auth_service.token_required
    def get(self, current_user=None):
        """List all knowledge"""
        knowledges = knowledge_service.list_knowledge()
        return [kb for kb in knowledges]

@api.route('/paginated')
class KnowledgeBaseResourcePaginated(Resource):
    @api.doc('list_knowledge_paginated', params={
        'page': 'Page number starting from 1',
        'per_page': 'Items per page',
        'keyword': 'Optional search keyword (matches name or description)'
    })
    @api.response(200, 'Success')
    @auth_service.token_required
    def get(self, current_user=None):
        """List knowledge with pagination"""
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

        result = knowledge_service.list_knowledge_paginated(page=page, per_page=per_page, keyword=keyword)
        return result, 200

@api.route('/knowledge/<uuid:knowledge_uuid>')
@api.param('knowledge_uuid', 'The knowledge  identifier')
class KnowledgeItem(Resource):
    @api.doc('get_knowledge')
    @api.response(200, 'Success', knowledge_model)
    @api.response(404, 'Knowledge not found')
    @auth_service.token_required
    def get(self, knowledge_uuid, current_user=None):
        """Get a specific knowledge """
        knowledge = knowledge_service.get_knowledge(knowledge_uuid)
        return knowledge, 200

    @api.doc('delete_knowledge')
    @api.response(200, 'Knowledge deleted successfully')
    @api.response(404, 'Knowledge not found')
    @auth_service.token_required
    def delete(self, knowledge_uuid, current_user=None):
        """Delete a specific knowledge """
        try:
            knowledge_service.delete_knowledge(knowledge_uuid)
            return {"message": "Knowledge deleted successfully"}, 200
        except ValueError as e:
            api.abort(404, str(e))

@api.route('/query/<uuid:knowledge_uuid>')
@api.param('knowledge_uuid', 'The knowledge identifier')
class KnowledgeQuery(Resource):
    @api.doc('query_knowledge')
    @api.expect(query_input)
    @api.response(200, 'Success', [query_result])
    @api.response(400, 'Validation Error')
    @api.response(404, 'Knowledge not found')
    @auth_service.token_required
    def post(self, knowledge_uuid, current_user=None):
        """Query a knowledge base"""
        data = request.get_json()
        if not data or 'query' not in data:
            api.abort(400, "Query is required")
        
        results = knowledge_service.query(
            knowledge_uuid=knowledge_uuid,
            query=data['query'],
            limit=data.get('limit', 5)
        )
        
        return results


@api.route('/retrieval-test/<uuid:knowledge_uuid>')
@api.param('knowledge_uuid', 'The knowledge identifier')
class KnowledgeRetrieveTesting(Resource):
    @api.doc('retrieve_testing_knowledge')
    @api.expect(query_input)
    @api.response(200, 'Success', [query_result])
    @api.response(400, 'Validation Error')
    @api.response(404, 'Knowledge not found')
    @auth_service.token_required
    def post(self, knowledge_uuid, current_user=None):
        """
        Retrieve relevant document chunks using keyword search
        
        This endpoint performs a keyword search across document chunks in the specified knowledge base.
        """
        data = request.get_json()
        if not data or 'query' not in data:
            api.abort(400, "Query is required")
        
        try:
            # Get retrieval method from request or default to full-text
            retrieval_method = data.get('retrieval_method', 'full-text')
            
            # Validate retrieval method
            valid_methods = [RetrievalMethod.FULL_TEXT_SEARCH, RetrievalMethod.SEMANTIC_SEARCH, RetrievalMethod.HYBRID_SEARCH, "keyword"]  # Include legacy 'keyword' value
            if retrieval_method not in valid_methods:
                retrieval_method = RetrievalMethod.FULL_TEXT_SEARCH
                
            results = KnowledgeRetrievalService.retrieve(
                retrieval_method=retrieval_method,
                dataset_id=str(knowledge_uuid),
                query=data['query'],
                top_k=data.get('limit', 5),
                score_threshold=data.get('score_threshold', 0.0)
            )
            
            # Format results to match the expected response format
            formatted_results = []
            for doc in results:
                try:
                    formatted_doc = {
                        'id': doc['uuid'],  # Already converted to string in the service
                        'text': doc['text_content'],
                        'knowledge_uuid': str(knowledge_uuid),
                        'score': doc.get('similarity_score', 1.0),  # Use get with default
                        'enable': doc['enable'],
                        'document_uuid': doc['document_uuid'],  # Already converted to string
                        'filename': doc['document']['filename'],
                        'metadata': {
                            'document_id': doc['document_uuid'],
                            'chunk_index': doc['chunk_index'],
                            'position': doc['position'],
                            'word_count': doc['word_count'],
                            'total_characters': len(doc['text_content'])
                        },
                        'document': doc['document']  # Include full document data
                    }
                    formatted_results.append(formatted_doc)
                except KeyError as e:
                    current_app.logger.error(f"Error formatting document result: {e}")
                    continue  # Skip malformed documents

            return formatted_results
            
        except ValueError as e:
            api.abort(404, str(e))
        except KeyError as e:
            api.abort(400, f"Missing required field: {e}")
        except Exception as e:
            current_app.logger.error(f"Error in retrieval-test: {str(e)}")
            api.abort(500, "An error occurred while processing your request")


@api.route('/documents')
class DocumentUploadMultiple(Resource):
    @api.doc('upload_document_multiple')
    @api.expect(upload_parser_docs)
    @api.response(201, 'Documents uploaded successfully')
    @api.response(400, 'Validation Error')
    @auth_service.token_required
    def post(self, current_user=None):
        """
        Upload multiple documents to the server.
        
        This endpoint accepts multiple files and saves them to the configured storage location.
        Each file is assigned a unique identifier and stored with its original extension.
        """
        
        args = upload_parser_docs.parse_args()
        files = args.get('files', [])
        
        if not files:
            api.abort(400, 'No files provided')
        
        # Save all uploaded files
        results = document_service.save_documents(files)
        
        # Check if any uploads failed
        failed_uploads = [r for r in results if not r['success']]
        
        if failed_uploads:
            # If all uploads failed, return error
            if len(failed_uploads) == len(results):
                api.abort(400, {
                    'message': 'Failed to upload all files',
                    'errors': [{'filename': f.get('filename', 'unknown'), 'error': f.get('error')} 
                              for f in failed_uploads]
                })
            # If some uploads failed, return success with warnings
            return {
                'message': 'Some files were not uploaded successfully',
                'success': True,
                'data': [r['data'] for r in results if r['success']],
                'errors': [{'filename': f.get('filename', 'unknown'), 'error': f.get('error')} 
                          for f in failed_uploads]
            }, 207  # 207 Multi-Status
        
        # If all uploads succeeded
        return {
            'message': 'All files uploaded successfully',
            'success': True,
            'data': [r['data'] for r in results]
        }, 200

@api.route('/documents')
class DocumentList(Resource):
    @api.doc('list_documents')
    @api.response(200, 'Success')
    @auth_service.token_required
    def get(self, current_user=None):
        """List all uploaded documents"""
        documents = document_service.list_documents()
        return {
            'success': True,
            'count': len(documents),
            'data': documents
        }

@api.route('/documents/<string:uuid>')
class DocumentResource(Resource):
    @api.doc('get_document')
    @api.response(200, 'Success')
    @api.response(404, 'Document not found')
    @auth_service.token_required
    def get(self, uuid, current_user=None):
        """Get a specific document by filename"""
        file_path = document_service.get_document_path_by_doc_id(uuid)
        if not file_path or not os.path.exists(file_path):
            api.abort(404, 'Document not found')
        
        # In a real application, you might want to use send_file here
        # For now, just return the file path
        return {
            'success': True,
            'data': {
                'filename': filename,
                'path': file_path,
                'url': f"/api/documents/{uuid}"  # This would be a real URL in production
            }
        }

    @api.doc('delete_document')
    @api.response(200, 'Document deleted')
    @api.response(404, 'Document not found')
    @auth_service.token_required
    def delete(self, uuid, current_user=None):
        """Delete a specific document by filename"""
        if document_service.delete_document_by_uuid(uuid):
            return {'success': True, 'message': 'Document deleted successfully'}
        api.abort(404, 'Document not found')\

@api.route('/document/chunks/<string:document_uuid>')
class DocumentChunksResource(Resource):
    @api.doc('get_document_chunks', params={
        'page': 'Page number starting from 1',
        'per_page': 'Items per page',
        'keyword': 'Optional search keyword (matches name or description)'
    })
    @api.response(200, 'Success')
    @api.response(404, 'Document not found')
    @auth_service.token_required
    def get(self, document_uuid, current_user=None):
        """Get chunks of a specific document by filename pageable"""
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

        result, document, total, total_pages = document_service.list_document_vector_chunks_paginated(
            document_uuid,
            page, 
            per_page, 
            keyword
        )
        
        return {
            'document': document,
            'items': [w.to_dict() for w in result],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages
        }

@api.route('/document/details/<string:document_uuid>')
class DocumentChunksResource(Resource):
    @api.doc('get_document_chunks', params={
        'page': 'Page number starting from 1',
        'per_page': 'Items per page',
        'keyword': 'Optional search keyword (matches name or description)'
    })
    @api.response(200, 'Success')
    @api.response(404, 'Document not found')
    @auth_service.token_required
    def get(self, document_uuid, current_user=None):
        """Get chunks of a specific document by filename pageable"""
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

        result, document, total, total_pages = document_service.list_document_vector_chunks_paginated(
            document_uuid,
            page, 
            per_page, 
            keyword
        )
        
        return {
            'document': document,
            'items': [w.to_dict() for w in result],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages
        }

@api.route('/retrieval/history/<string:knowledge_uuid>')
class DocumentRetrieveHistoryResource(Resource):
    @api.doc('get_knowledge_retrieval_history', params={
        'keyword': 'Optional search keyword (matches name or description)',
        'page': 'Page number starting from 1',
        'per_page': 'Items per page'
    })
    @api.response(200, 'Success')
    @api.response(404, 'Document not found')
    @auth_service.token_required
    def get(self, knowledge_uuid, current_user=None):
        """Get retrieve history of a specific document by knowledge UUID and pageable"""
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

        result = knowledge_service.get_document_retrieval_history(knowledge_uuid, page, per_page, keyword)

        return result

@api.route('/initiate')
class KnowledgeInitialization(Resource):
    @api.doc('initialize_knowledge')
    @api.expect(initial_processing_model)
    @api.response(200, 'Knowledge initialized successfully', initial_processing_model_response)
    @api.response(400, 'Invalid input')
    @auth_service.token_required
    def post(self, current_user=None):
        """
        Initialize a new knowledge with processing configuration and associate documents.
        
        This endpoint creates a new knowledge with the provided processing configuration
        and associates the specified documents with it.
        """
        if not api.payload:
            api.abort(400, 'Request body cannot be empty')
            
        data = api.payload
            
        # Validate required fields with specific error messages
        missing_fields = []
        if 'processing_config' not in data:
            missing_fields.append('processing_config')
        if 'documents' not in data or not isinstance(data['documents'], list) or not data['documents']:
            missing_fields.append('documents (must be a non-empty array)')
        if 'name' not in data:
            missing_fields.append('name')
        
        """
        convert chunk_overlap and max_chunk_len to int
        """
        data['processing_config']['chunk_setting']['chunk_overlap'] = int(data['processing_config']['chunk_setting']['chunk_overlap'])
        data['processing_config']['chunk_setting']['max_chunk_len'] = int(data['processing_config']['chunk_setting']['max_chunk_len'])
            
        if missing_fields:
            api.abort(400, f'Missing or invalid required fields: {", ".join(missing_fields)}')
            
        try:
            # Use KnowledgeService to handle the initialization
            knowledge, document_count, documents = knowledge_service.initialize_knowledge(
                data
            )
            
            # Convert UUIDs to strings in the response
            response_data = {
                'success': True,
                'message': 'Knowledge initialized successfully',
                'knowledge_uuid': str(knowledge.uuid),
                'documents_processed': document_count,
                'documents': [
                    {
                        **doc,
                        'id': str(doc['id']) if 'id' in doc else None,
                        'knowledge_uuid': str(knowledge.uuid) if 'id' in doc else None
                    }
                    for doc in documents
                ]
            }
            
            return response_data, 200
        except Exception as e:
            api.abort(500, str(e))

    @api.doc('initialize_edit_knowledge')
    @api.expect(initial_edit_processing_model)
    @api.response(200, 'Knowledge edited successfully', initial_processing_model_response)
    @api.response(400, 'Invalid input')
    @auth_service.token_required
    def put(self, current_user=None):
        """
        Initialize a new knowledge with processing configuration and associate documents.
        
        This endpoint creates a new knowledge with the provided processing configuration
        and associates the specified documents with it.
        """
        if not api.payload:
            api.abort(400, 'Request body cannot be empty')
            
        data = api.payload
            
        # Validate required fields with specific error messages
        missing_fields = []
        if 'processing_config' not in data:
            missing_fields.append('processing_config')
        if 'documents' not in data or not isinstance(data['documents'], list) or not data['documents']:
            missing_fields.append('documents (must be a non-empty array)')
        if 'uuid' not in data:
            missing_fields.append('uuid')
            
        if missing_fields:
            api.abort(400, f'Missing or invalid required fields: {", ".join(missing_fields)}')
            
        """
        convert chunk_overlap and max_chunk_len to int
        """
        data['processing_config']['chunk_setting']['chunk_overlap'] = int(data['processing_config']['chunk_setting']['chunk_overlap'])
        data['processing_config']['chunk_setting']['max_chunk_len'] = int(data['processing_config']['chunk_setting']['max_chunk_len'])
            

        try:
            # Use KnowledgeService to handle the initialization
            knowledge, document_count, documents = knowledge_service.initialize_knowledge(
                data
            )
            
            # Convert UUIDs to strings in the response
            response_data = {
                'success': True,
                'message': 'Knowledge initialized successfully',
                'knowledge_uuid': str(knowledge.uuid),
                'documents_processed': document_count,
                'documents': [
                    {
                        **doc,
                        'id': str(doc['id']) if 'id' in doc else None,
                        'knowledge_uuid': str(knowledge.uuid) if 'id' in doc else None
                    }
                    for doc in documents
                ]
            }
            
            return response_data, 200
        except Exception as e:
            api.abort(500, str(e))
