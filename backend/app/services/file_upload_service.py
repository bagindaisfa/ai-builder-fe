""" 
    create me service that hadle file uploads
    - store the files
    - insert to file_upload record
    - returnn the result like this
    {
        "uuid": "681eb8fb-843e-4144-8c08-cee30b11e1c9",
        "name": "ThinkPad_T14_Gen_1_Intel_Spec.pdf",
        "size": 542950,
        "extension": "pdf",
        "mime_type": "application/pdf",
        "created_by": "134146d5-8c26-4769-a154-ba6801902018",
        "created_at": 1757671465
    }
"""

from app.models.file_upload import FileUpload
from app import db
from datetime import datetime
from werkzeug.utils import secure_filename
import os
import uuid
from app.config import Config


class FileUploadService:
    def upload_file(self, file, workflow_uuid):
        """
        Handle file upload with proper validation and error handling
        
        Args:
            file: File object from Flask request.files
            workflow_uuid: UUID of the workflow this file belongs to
            
        Returns:
            tuple: (file_info, status_code) where file_info contains file metadata
        """
        if not file or not file.filename:
            return {'message': 'No file provided'}, 400
            
        try:
            # Generate a secure filename and unique path
            filename = secure_filename(file.filename)
            if not filename:
                return {'message': 'Invalid file name'}, 400
                
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            
            # Define upload folder and ensure it exists
            upload_folder = os.path.join(Config.CHAT_UPLOAD_FOLDER, 'chat-uploads')
            os.makedirs(upload_folder, exist_ok=True)
            
            # Create full file path
            filepath = os.path.abspath(os.path.join(upload_folder, unique_filename))
            
            # Security check: ensure the file is saved within the intended directory
            if not os.path.abspath(filepath).startswith(os.path.abspath(upload_folder)):
                return {'message': 'Invalid file path'}, 400
            
            # Save the file
            file.save(filepath)
            
            # Get file info
            file_size = os.path.getsize(filepath)
            file_extension = os.path.splitext(filename)[1][1:].lower()
            
            # Prepare file metadata
            file_info = {
                'uuid': str(uuid.uuid4()),
                'filename': filename,
                'original_filename': file.filename,
                'size': file_size,
                'extension': file_extension,
                'mime_type': file.content_type or 'application/octet-stream',
                'created_at': int(datetime.utcnow().timestamp()),
                'path': filepath,
                'url': f'/download/{unique_filename}'  # Public URL if needed
            }
            
            # Create database record
            file_upload = FileUpload(
                uuid=file_info['uuid'],
                filename=file_info['filename'],
                size=file_info['size'],
                path=file_info['path'],
                extension=file_info['extension'],
                mime_type=file_info['mime_type'],
                metadata=file_info,
                knowledge_uuid=workflow_uuid,
                created_at=datetime.utcnow()
            )
            
            # Save to database
            db.session.add(file_upload)
            db.session.commit()
            
            return file_info, 201
            
        except Exception as e:
            # Clean up the file if it was partially saved
            if 'filepath' in locals() and os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception as cleanup_error:
                    current_app.logger.error(f"Error cleaning up file {filepath}: {str(cleanup_error)}")
            
            # Rollback database changes
            if 'db' in locals():
                db.session.rollback()
                
            current_app.logger.error(f"File upload error: {str(e)}", exc_info=True)
            return {'message': f'Error processing file: {str(e)}'}, 500