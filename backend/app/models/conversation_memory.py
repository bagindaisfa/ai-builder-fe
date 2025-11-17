from datetime import datetime
import uuid
from .. import db
import re

class ConversationMemory(db.Model):
    uuid = db.Column(db.UUID, primary_key=True, default=uuid.uuid4)
    workflow_uuid = db.Column(db.UUID, nullable=False)
    messages = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def add_message(self, role: str, content: str, process_steps=None, role_type: str = None):
        """Add a message to the conversation history with optional process steps and role type
        
        Args:
            role: The primary role (user, assistant, system)
            content: The message content
            process_steps: Optional processing steps information
            role_type: Optional role subtype (agent, llm, etc.) to distinguish different assistant types
        """
        message = {
            "id": str(uuid.uuid4()),
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "processSteps": process_steps if process_steps else None
        }
        
        # Add role_type if provided to distinguish between different assistant types
        if role_type:
            message["role_type"] = role_type
            
        self.messages = self.messages + [message]
        self.updated_at = datetime.utcnow()
        
    def get_messages(self, role=None, role_type=None):
        """Get messages in the conversation with optional filtering
        
        Args:
            role: Filter messages by primary role (user, assistant, system)
            role_type: Filter messages by role subtype (agent, llm, etc.)
            
        Returns:
            List of messages matching the filters, or all messages if no filters provided
        """
        if not role and not role_type:
            return self.messages
            
        filtered = self.messages
        
        if role:
            filtered = [msg for msg in filtered if msg.get('role') == role]
            
        if role_type:
            filtered = [msg for msg in filtered if msg.get('role_type') == role_type]
            
        return filtered
        
    def get_assistant_messages(self, role_type=None):
        """Get assistant messages with optional role_type filtering
        
        Args:
            role_type: Optional role subtype to filter by (agent, llm, etc.)
            
        Returns:
            List of assistant messages, optionally filtered by role_type
        """
        return self.get_messages(role='assistant', role_type=role_type)
        
    def get_last_message(self, role=None, role_type=None):
        """Get the last message in the conversation with optional filtering
        
        Args:
            role: Filter by primary role (user, assistant, system)
            role_type: Filter by role subtype (agent, llm, etc.)
            
        Returns:
            The last message matching the filters, or None if no matching messages
        """
        messages = self.get_messages(role=role, role_type=role_type)
        return messages[-1] if messages else None
    
    def get_conversation_summary(self):
        """Get a summary of the conversation with counts by role and role_type
        
        Returns:
            Dictionary with message counts by role and role_type
        """
        summary = {
            'total_messages': len(self.messages),
            'by_role': {},
            'by_role_type': {}
        }
        
        # Count by primary role
        for msg in self.messages:
            role = msg.get('role')
            if role not in summary['by_role']:
                summary['by_role'][role] = 0
            summary['by_role'][role] += 1
            
            # Count by role_type if present
            role_type = msg.get('role_type')
            if role_type:
                if role_type not in summary['by_role_type']:
                    summary['by_role_type'][role_type] = 0
                summary['by_role_type'][role_type] += 1
                
        return summary
    
    def get_conversation_title(self) -> str:
        """Create a concise title for the conversation based on its messages.
        Heuristics:
        - Prefer the earliest user question (ends with '?').
        - Otherwise, use the first non-empty user message clipped to a short phrase.
        - Fallback to a generic title if there are no messages.
        """
        if not self.messages:
            return "New Conversation"

        # Helper to clean and clip text for a title
        def clean_clip(text: str, limit: int = 60) -> str:
            if not text:
                return ""
            # Normalize whitespace
            t = re.sub(r"\s+", " ", text.strip())
            # Clip smartly
            if len(t) > limit:
                t = t[:limit].rstrip() + "…"
            return t

        # Gather user messages
        user_msgs = [m for m in self.messages if m.get('role') == 'user' and m.get('content')]
        if not user_msgs:
            # fallback to any message
            any_msg = next((m for m in self.messages if m.get('content')), None)
            return clean_clip(any_msg.get('content')) if any_msg else "Conversation"

        # 1) Prefer the earliest user question
        for m in user_msgs:
            content = m.get('content', '')
            if content.strip().endswith('?'):
                return clean_clip(content)

        # 2) Handle common self-introduction patterns leading to recall questions
        # Example: "My name is X" → later "What is my name?" becomes "What's My Name?"
        names = []
        for m in user_msgs:
            c = m.get('content', '')
            match = re.search(r"\bmy\s+name\s+is\s+([A-Za-z][\w'-]*)", c, flags=re.IGNORECASE)
            if match:
                names.append(match.group(1))
        for m in user_msgs:
            c = m.get('content', '').strip()
            if re.search(r"what\s+is\s+my\s+name\s*\?*$", c, flags=re.IGNORECASE):
                return "What's My Name?"

        # 3) Otherwise use the first non-empty user message
        return clean_clip(user_msgs[0].get('content', 'Conversation'))
    
    def to_dict(self, include_summary=True):
        """Convert the conversation memory to a dictionary
        
        Args:
            include_summary: Whether to include conversation summary statistics
            
        Returns:
            Dictionary representation of the conversation memory
        """
        result = {
            'uuid': str(self.uuid) if self.uuid is not None else None,
            'workflow_uuid': str(self.workflow_uuid) if self.workflow_uuid is not None else None,
            'messages': self.messages,
            'created_at': self.created_at.isoformat() if getattr(self, 'created_at', None) else None,
            'updated_at': self.updated_at.isoformat() if getattr(self, 'updated_at', None) else None,
            'title': self.get_conversation_title()
        }
        
        if include_summary:
            result['summary'] = self.get_conversation_summary()
            
        return result
