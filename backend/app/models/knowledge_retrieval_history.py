from datetime import datetime
import uuid
from .. import db

class KnowledgeRetrievalHistory(db.Model):
    uuid = db.Column(db.UUID, primary_key=True, default=uuid.uuid4)
    knowledge_uuid = db.Column(db.UUID, db.ForeignKey('knowledge.uuid'), nullable=False)
    source = db.Column(db.String(255), nullable=False)
    query = db.Column(db.Text, nullable=False)
    top_k = db.Column(db.Integer, nullable=False)
    score_threshold = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(50))
    updated_by = db.Column(db.String(50))
    
    def to_dict(self):
        return {
            'uuid': str(self.uuid),
            'knowledge_uuid': str(self.knowledge_uuid),
            'source': self.source,
            'query': self.query,
            'top_k': self.top_k,
            'score_threshold': self.score_threshold,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
