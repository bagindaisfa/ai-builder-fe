from datetime import datetime
import uuid
from sqlalchemy import Column, String, ForeignKey, Text, DateTime, JSON, UUID
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, FLOAT
from sqlalchemy.sql import func
import sqlalchemy as sa
from sqlalchemy.types import UserDefinedType
from .. import db

class VectorType(UserDefinedType):
    """PostgreSQL vector type for pgvector extension"""
    
    def get_col_spec(self, **kw):
        return "vector"
    
    def bind_processor(self, dialect):
        def process(value):
            if value is None:
                return None
            return value
        return process
    
    def result_processor(self, dialect, coltype):
        def process(value):
            return value
        return process

class DocumentVector(db.Model):
    """Model for document vectors using PostgreSQL pgvector extension"""
    __tablename__ = 'document_vectors'
    
    uuid = db.Column(db.UUID, primary_key=True, default=uuid.uuid4)
    user_uuid = db.Column(db.UUID, nullable=True)  # Optional user association
    document_uuid = db.Column(db.UUID, nullable=False)
    knowledge_uuid = db.Column(db.UUID, nullable=False)
    chunk_index = db.Column(db.Integer, nullable=False, default=0)  # For documents split into chunks
    total_chunks = db.Column(db.Integer, nullable=True, default=1)  # Total chunks for this document
    position = db.Column(db.Integer)
    word_count = db.Column(db.Integer)
    hit_count = db.Column(db.Integer, default=0)
    enable = db.Column(db.Boolean, default=True)
    document_type = db.Column(db.String(255), nullable=True)
    text_content = db.Column(db.Text, nullable=False)  # The actual text chunk
    embedding = db.Column(VectorType, nullable=False)  # Vector embedding using pgvector
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    bots_uuid = db.Column(db.UUID, nullable=True)  # Optional bot association    
    
    def to_dict(self):
        return {
            'uuid': str(self.uuid),
            'user_uuid': str(self.user_uuid) if self.user_uuid else None,
            'document_uuid': str(self.document_uuid),
            'chunk_index': self.chunk_index,
            'total_chunks': self.total_chunks,
            'document_type': self.document_type,
            'text_content': self.text_content,
            'embedding': self.embedding,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'bots_uuid': str(self.bots_uuid) if self.bots_uuid else None,
            'position': self.position,
            'word_count': self.word_count,
            'hit_count': self.hit_count,
            'enable': self.enable
        }
