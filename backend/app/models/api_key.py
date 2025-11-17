from datetime import datetime
import uuid
from .. import db

class APIKey(db.Model):
    __tablename__ = "api_key"
    
    uuid = db.Column(db.UUID, primary_key=True, default=uuid.uuid4)
    workflow_uuid = db.Column(db.UUID, db.ForeignKey('workflow.uuid', ondelete='CASCADE'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False, default='')
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, nullable=True)
    
    # Relationship with Workflow
    workflow = db.relationship("Workflow", back_populates="api_keys")
    
    def __init__(self, workflow_uuid, name='', description=None):
        self.workflow_uuid = workflow_uuid
        self.token = f"app-{uuid.uuid4()}"
        self.name = name
        self.description = description
        
    def to_dict(self):
        return {
            'uuid': str(self.uuid),
            'workflow_uuid': str(self.workflow_uuid),
            'token': self.token,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None
        }
