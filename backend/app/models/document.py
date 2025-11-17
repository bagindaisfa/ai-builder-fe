from datetime import datetime
import uuid
from .. import db

class Document(db.Model):
    uuid = db.Column(db.UUID, primary_key=True, default=uuid.uuid4)
    filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255))
    content_type = db.Column(db.String(255))
    content = db.Column(db.Text)
    embedding_status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed
    extension = db.Column(db.String(100))
    size = db.Column(db.Integer)
    path = db.Column(db.String(255))
    mime_type = db.Column(db.String(255))
    doc_metadata = db.Column(db.JSON)
    word_count = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(50))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.String(50))
    knowledge_uuid = db.Column(db.UUID, db.ForeignKey('knowledge.uuid'), nullable=True)
    
    def to_dict(self):
        return {
            'uuid': str(self.uuid),
            'filename': self.filename,
            'content_type': self.content_type,
            'embedding_status': self.embedding_status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'knowledge_uuid': str(self.knowledge_uuid),
            'stored_filename': self.stored_filename,
            'extension': self.extension,
            'size': self.size,
            'path': self.path,
            'mime_type': self.mime_type,
            'doc_metadata': self.doc_metadata,
            'word_count': self.word_count
        }
