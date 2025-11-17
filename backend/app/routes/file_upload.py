import os
from flask_restx import Namespace, Resource, fields
from flask import request, current_app, jsonify, send_file
from werkzeug.utils import secure_filename
from werkzeug.exceptions import BadRequest, RequestEntityTooLarge
from datetime import datetime
import uuid
import logging
from app.config import Config

from app.services.file_upload_service import FileUploadService

# Configure logger
logger = logging.getLogger(__name__)

api = Namespace('File-Upload', description='File upload operations')

# Configure allowed file extensions
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'csv', 'json', 'md', 'py'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@api.route('/upload/<string:uuid>')
class FileUpload(Resource):
    def __init__(self, api=None, *args, **kwargs):
        super().__init__(api, *args, **kwargs)
        self.upload_service = FileUploadService()

    @api.doc('upload_file')
    @api.response(201, 'File uploaded successfully', api.model('UploadResponse', {
        'message': fields.String(description='Upload status message'),
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
    }))
    def post(self, uuid):
        """
        Upload one or more files to the server
        """
        try:
            # Check if the post request has the file part
            if 'files' not in request.files:
                raise BadRequest('No file part in the request')
                
            files = request.files.getlist('files')
            if not files or not files[0].filename:
                raise BadRequest('No selected file')
            
            saved_files = []
            
            for file in files:
                if not file or file.filename == '':
                    continue
                    
                if not allowed_file(file.filename):
                    logger.warning(f'File type not allowed: {file.filename}')
                    continue
                
                try:
                    # Use the upload service to handle file upload
                    result, status_code = self.upload_service.upload_file(file, uuid)
                    if status_code == 201:  # Only append successfully uploaded files
                        saved_files.append(result)
                        logger.info(f'Successfully uploaded file: {file.filename}')
                except Exception as e:
                    logger.error(f"Error processing file {file.filename}: {str(e)}", exc_info=True)
                    continue
            
            if not saved_files:
                return {'message': 'No files were successfully uploaded. Please check file types and try again.'}, 400
                
            return {
                'message': f'Successfully uploaded {len(saved_files)} file(s)',
                'files': saved_files
            }, 201
            
        except RequestEntityTooLarge:
            raise BadRequest('File size exceeds the maximum allowed limit')
        except Exception as e:
            logger.error(f'Unexpected error in file upload: {str(e)}', exc_info=True)
            return {'message': 'An error occurred while processing your request'}, 500

@api.route("/download/<filename>")
class FileDownload(Resource):
    def get(self, filename):
        upload_folder = os.path.join(Config.CHAT_UPLOAD_FOLDER, 'chat-uploads')
        full_path = os.path.abspath(os.path.join(upload_folder, filename))

        current_app.logger.info(f"Trying to serve file: {full_path}")

        if not os.path.exists(full_path):
             current_app.logger.error(f"File not found: {full_path}")
             return {"message": f"File not found: {filename}"}, 404
        return send_file(full_path, as_attachment=False)