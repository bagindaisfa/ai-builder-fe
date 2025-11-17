from datetime import datetime
import uuid
from .. import db

class Knowledge(db.Model):
    uuid = db.Column(db.UUID, primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    embedding_model = db.Column(db.String(100), default='nomic-embed-text:v1.5')
    processing_config = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(50))
    updated_by = db.Column(db.String(50))
    documents = db.relationship('Document', backref='knowledge', lazy=True)

    
    def to_dict(self):
        return {
            'uuid': str(self.uuid),
            'name': self.name,
            'description': self.description,
            'embedding_model': self.embedding_model,
            'processing_config': self.processing_config,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
