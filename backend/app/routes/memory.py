from flask import Blueprint, jsonify, request
from ..models.conversation_memory import ConversationMemory
from ..services.auth_service import auth_service
from .. import db
import logging
import uuid
from flask_restx import Namespace, Resource, fields

# Configure logger
logger = logging.getLogger('memory_routes')

bp = Blueprint('memory', __name__)

# Flask-RESTX namespace for Swagger docs
api = Namespace('Memory', description='Conversation memory operations')

# Models for Swagger
message_model = api.model('Message', {
    'id': fields.String(description='Message ID (UUID)'),
    'role': fields.String(required=True, description='Role of message author (user/assistant/system)'),
    'role_type': fields.String(description='Subtype of role (e.g., agent, llm)'),
    'content': fields.String(required=True, description='Message content'),
    'timestamp': fields.String(description='Creation time (ISO 8601)'),
    'processSteps': fields.Raw(description='Optional processing steps metadata'),
})

summary_model = api.model('ConversationSummary', {
    'total_messages': fields.Integer,
    'by_role': fields.Raw,
    'by_role_type': fields.Raw,
})

memory_model = api.model('ConversationMemory', {
    'uuid': fields.String,
    'workflow_uuid': fields.String,
    'messages': fields.List(fields.Nested(message_model)),
    'created_at': fields.String,
    'updated_at': fields.String,
    'title': fields.String(description='Computed conversation title'),
    'summary': fields.Nested(summary_model, skip_none=True),
})

conversation_list_item = api.model('ConversationListItem', {
    'uuid': fields.String(description='Conversation UUID'),
    'created_at': fields.String,
    'updated_at': fields.String,
    'message_count': fields.Integer,
    'title': fields.String(description='Computed title for this conversation')
})

pagination_model = api.model('ConversationPagination', {
    'page': fields.Integer(description='Current page number', default=1, min=1),
    'per_page': fields.Integer(description='Number of items per page', default=10, min=1, max=100),
    'total': fields.Integer(description='Total number of items'),
    'pages': fields.Integer(description='Total number of pages')
})

conversation_list_response = api.model('ConversationListResponse', {
    'items': fields.List(fields.Nested(conversation_list_item)),
    'pagination': fields.Nested(pagination_model)
})

add_message_model = api.model('AddMessageRequest', {
    'role': fields.String(required=True, enum=['user', 'assistant', 'system']),
    'content': fields.String(required=True),
    'processSteps': fields.Raw(required=False),
    'role_type': fields.String(required=False),
})


@api.route('/<uuid:workflow_uuid>')
class MemoryResource(Resource):
    method_decorators = [auth_service.dual_auth_required]

    @api.response(200, 'Success', model=memory_model)
    def get(self, workflow_uuid, current_user=None):
        """Get conversation memory for a workflow (creates if missing)."""
        memory = ConversationMemory.query.filter_by(workflow_uuid=workflow_uuid).first()
        if not memory:
            memory = ConversationMemory(workflow_uuid=workflow_uuid, messages=[])
            db.session.add(memory)
            db.session.commit()
        return memory.to_dict()


@api.route('/<uuid:workflow_uuid>/messages')
class AddMessageResource(Resource):
    method_decorators = [auth_service.dual_auth_required]

    @api.expect(add_message_model, validate=True)
    @api.response(200, 'Message added', model=memory_model)
    def post(self, workflow_uuid, current_user=None):
        """Add a message to a workflow's conversation memory."""
        data = request.get_json()
        memory = ConversationMemory.query.filter_by(workflow_uuid=workflow_uuid).first()
        if not memory:
            memory = ConversationMemory(workflow_uuid=workflow_uuid, messages=[])
            db.session.add(memory)
        process_steps = data.get('processSteps')
        role_type = data.get('role_type')
        memory.add_message(data['role'], data['content'], process_steps=process_steps, role_type=role_type)
        db.session.commit()
        return memory.to_dict()


@api.route('/debug/<uuid:workflow_uuid>')
class MemoryDebugResource(Resource):
    method_decorators = [auth_service.dual_auth_required]

    @api.response(200, 'Debug info')
    def get(self, workflow_uuid, current_user=None):
        """Dump debug info for all conversation memories of a workflow."""
        logger.info(f"DEBUG: Dumping all conversation memories for workflow {workflow_uuid}")
        memories = ConversationMemory.query.filter_by(workflow_uuid=workflow_uuid).all()
        result = {
            "workflow_uuid": str(workflow_uuid),
            "conversation_count": len(memories),
            "conversations": []
        }
        for memory in memories:
            conversation = {
                "conversation_id": str(memory.uuid),
                "created_at": memory.created_at.isoformat(),
                "updated_at": memory.updated_at.isoformat(),
                "message_count": len(memory.messages),
                "messages": []
            }
            for idx, msg in enumerate(memory.messages):
                message = {
                    "id": msg.get('id', ''),
                    "index": idx,
                    "role": msg.get('role', ''),
                    "timestamp": msg.get('timestamp', ''),
                    "content": msg.get('content', ''),
                    "content_length": len(msg.get('content', '')),
                    "has_process_steps": msg.get('processSteps') is not None
                }
                conversation["messages"].append(message)
            result["conversations"].append(conversation)
        logger.info(f"DEBUG: Found {len(memories)} conversations for workflow {workflow_uuid}")
        return result


@api.route('/backfill/<uuid:workflow_uuid>')
class BackfillResource(Resource):
    method_decorators = [auth_service.dual_auth_required]

    @api.response(200, 'Backfill completed')
    def post(self, workflow_uuid, current_user=None):
        """Assign IDs to any legacy messages missing one for the workflow."""
        logger.info(f"Backfilling message IDs for workflow: {workflow_uuid}")
        memories = ConversationMemory.query.filter_by(workflow_uuid=workflow_uuid).all()
        if not memories:
            return {
                "status": "success",
                "message": f"No conversation memories found for workflow {workflow_uuid}",
                "conversations_scanned": 0,
                "messages_scanned": 0,
                "messages_updated": 0
            }
        conversations_scanned = 0
        messages_scanned = 0
        messages_updated = 0
        for memory in memories:
            conversations_scanned += 1
            updated = False
            new_messages = []
            for msg in memory.messages:
                messages_scanned += 1
                if not msg.get('id'):
                    msg['id'] = str(uuid.uuid4())
                    messages_updated += 1
                    updated = True
                new_messages.append(msg)
            if updated:
                memory.messages = new_messages
        db.session.commit()
        logger.info(
            f"Backfilled IDs for workflow {workflow_uuid}: conv={conversations_scanned}, "
            f"scanned={messages_scanned}, updated={messages_updated}"
        )
        return {
            "status": "success",
            "message": "Backfill completed",
            "workflow_uuid": str(workflow_uuid),
            "conversations_scanned": conversations_scanned,
            "messages_scanned": messages_scanned,
            "messages_updated": messages_updated
        }

@api.route('/clear/<uuid:conversation_id>')
class ClearConversationResource(Resource):
    method_decorators = [auth_service.dual_auth_required]

    @api.response(200, 'Conversation cleared')
    def delete(self, conversation_id, current_user=None):
        """Clear a specific conversation memory by its ID."""
        logger.info(f"Clearing conversation memory with ID: {conversation_id}")
        memory = ConversationMemory.query.get_or_404(conversation_id)
        workflow_uuid = memory.workflow_uuid
        message_count = len(memory.messages)
        memory.messages = []
        db.session.commit()
        logger.info(f"Cleared {message_count} messages from conversation {conversation_id}")
        return {
            "status": "success",
            "message": f"Cleared {message_count} messages from conversation {conversation_id}",
            "conversation_id": str(conversation_id),
            "workflow_uuid": str(workflow_uuid)
        }

@api.route('/clear/workflow/<uuid:workflow_uuid>')
class ClearWorkflowResource(Resource):
    method_decorators = [auth_service.dual_auth_required]

    @api.response(200, 'Workflow conversations cleared')
    def delete(self, workflow_uuid, current_user=None):
        """Clear all conversation memories for a workflow."""
        logger.info(f"Clearing all conversation memories for workflow: {workflow_uuid}")
        memories = ConversationMemory.query.filter_by(workflow_uuid=workflow_uuid).all()
        if not memories:
            return {
                "status": "success",
                "message": f"No conversation memories found for workflow {workflow_uuid}",
                "count": 0
            }
        conversation_count = len(memories)
        message_count = 0
        for memory in memories:
            message_count += len(memory.messages)
            memory.messages = []
        db.session.commit()
        logger.info(f"Cleared {message_count} messages from {conversation_count} conversations for workflow {workflow_uuid}")
        return {
            "status": "success",
            "message": f"Cleared {message_count} messages from {conversation_count} conversations",
            "workflow_uuid": str(workflow_uuid),
            "conversation_count": conversation_count,
            "message_count": message_count
        }

@api.route('/conversations/<uuid:workflow_uuid>')
class ConversationsListResource(Resource):
    method_decorators = [auth_service.dual_auth_required]

    @api.doc(params={
        'page': 'Page number for pagination (default: 1)',
        'per_page': 'Number of items per page (default: 10, max: 100)',
        'keyword': 'Keyword to search in title or messages (optional)',
        'sort': 'Sort by one of: updated_at (default), created_at, message_count, title',
        'order': 'Sort order: asc or desc (default: desc)'
    })
    @api.response(200, 'Success', model=conversation_list_response)
    def get(self, workflow_uuid, current_user=None):
        """List conversations for a workflow with sorting, pagination, and search."""
        # Query params aligned with API keys
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        keyword = (request.args.get('keyword') or '').strip()
        sort = (request.args.get('sort') or 'updated_at').lower()
        order = (request.args.get('order') or 'desc').lower()

        if page < 1 or per_page < 1:
            page = 1
            per_page = 10

        if sort not in {'updated_at', 'created_at', 'message_count', 'title'}:
            sort = 'updated_at'
        if order not in {'asc', 'desc'}:
            order = 'desc'

        # Load all conversations for this workflow
        memories = ConversationMemory.query.filter_by(workflow_uuid=workflow_uuid).all()

        # Build items with computed title
        items = []
        for mem in memories:
            try:
                title = mem.get_conversation_title()
            except Exception:
                title = None
            items.append({
                'uuid': str(mem.uuid),
                'created_at': mem.created_at.isoformat() if getattr(mem, 'created_at', None) else None,
                'updated_at': mem.updated_at.isoformat() if getattr(mem, 'updated_at', None) else None,
                'message_count': len(mem.messages or []),
                'title': title or ''
            })

        # Search filter (case-insensitive) over title and message contents
        if keyword:
            q_lower = keyword.lower()
            msgs_map = {str(mem.uuid): (mem.messages or []) for mem in memories}
            def matches(item):
                if q_lower in (item['title'] or '').lower():
                    return True
                for m in msgs_map.get(item['uuid'], []):
                    if q_lower in (m.get('content') or '').lower():
                        return True
                return False
            items = [it for it in items if matches(it)]

        total = len(items)

        # Sorting
        def sort_key(item):
            if sort in ('updated_at', 'created_at'):
                return item.get(sort) or ''
            if sort == 'message_count':
                return item.get('message_count', 0)
            if sort == 'title':
                return (item.get('title') or '').lower()
            return ''
        reverse = (order == 'desc')
        items.sort(key=sort_key, reverse=reverse)

        # Pagination (page/per_page)
        start = (page - 1) * per_page
        end = start + per_page
        paged = items[start:end]
        pages = (total + per_page - 1) // per_page if per_page else 0

        return {
            'items': paged,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': pages
            }
        }

@api.route('/conversation/<uuid:conversation_id>')
class ConversationByIdResource(Resource):
    method_decorators = [auth_service.dual_auth_required]

    @api.response(200, 'Success', model=memory_model)
    @api.response(404, 'Conversation not found')
    def get(self, conversation_id, current_user=None):
        """Fetch a single conversation by its UUID."""
        memory = ConversationMemory.query.get_or_404(conversation_id)
        return memory.to_dict()

@api.route('/aggregate/<uuid:workflow_uuid>')
class AggregateMemoryResource(Resource):
    method_decorators = [auth_service.dual_auth_required]

    @api.response(200, 'Success', model=memory_model)
    def get(self, workflow_uuid, current_user=None):
        """Return a single aggregated memory by merging all messages across conversations for a workflow.
        Messages are merged and sorted by timestamp.
        """
        memories = ConversationMemory.query.filter_by(workflow_uuid=workflow_uuid).all()
        if not memories:
            # Do NOT create a DB row; return a synthesized empty memory
            temp = ConversationMemory(workflow_uuid=workflow_uuid, messages=[])
            return temp.to_dict()

        # Merge messages from all conversations
        merged = []
        for mem in memories:
            merged.extend(mem.messages or [])

        # Sort by timestamp if available
        def ts_key(m):
            return m.get('timestamp') or ''
        merged.sort(key=ts_key)

        # Use a transient ConversationMemory to compute title/summary and format
        temp = ConversationMemory(workflow_uuid=workflow_uuid, messages=merged)
        # temp.uuid intentionally left None for aggregated response
        return temp.to_dict()

 

 

 

 
