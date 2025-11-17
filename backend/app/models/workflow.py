from datetime import datetime
import uuid
from .. import db

class Workflow(db.Model):
    uuid = db.Column(db.UUID, primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    nodes = db.Column(db.JSON, nullable=False)
    edges = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship with API keys
    api_keys = db.relationship("APIKey", back_populates="workflow", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'uuid': str(self.uuid),
            'name': self.name,
            'description': self.description,
            'nodes': self.nodes,
            'edges': self.edges,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
