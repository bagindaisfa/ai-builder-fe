from typing import List, Optional
from datetime import datetime
from .. import db
from ..models.api_key import APIKey

def create_api_key(workflow_uuid: str, name: str = '', description: str = None) -> APIKey:
    """
    Create a new API key for the specified workflow.
    
    Args:
        workflow_uuid: The UUID of the workflow to create the API key for
        name: The name for the API key (required, max 100 chars)
        description: Optional description for the API key
        
    Returns:
        The created APIKey object
        
    Raises:
        ValueError: If workflow_uuid is invalid or name is missing/too long
        sqlalchemy.exc.SQLAlchemyError: If there's a database error
    """
    from sqlalchemy.exc import SQLAlchemyError, IntegrityError
    import logging
    
    logger = logging.getLogger(__name__)
    
    if not workflow_uuid:
        raise ValueError("workflow_uuid is required")
    if not name or not name.strip():
        raise ValueError("name is required")
    if len(name) > 100:
        raise ValueError("name must be 100 characters or less")
    
    try:
        # Convert string UUID to UUID object if needed
        import uuid
        if isinstance(workflow_uuid, str):
            workflow_uuid = uuid.UUID(workflow_uuid)
            
        logger.info(f"Creating API key for workflow: {workflow_uuid}")
        
        # Create new API key with name and description
        api_key = APIKey(
            workflow_uuid=workflow_uuid,
            name=name.strip(),
            description=description.strip() if description and description.strip() else None
        )
        db.session.add(api_key)
        db.session.commit()
        db.session.refresh(api_key)
        logger.info(f"Successfully created API key: {api_key.uuid}")
        return api_key
        
    except ValueError as ve:
        logger.error(f"Invalid UUID format: {workflow_uuid}", exc_info=True)
        db.session.rollback()
        raise ValueError(f"Invalid workflow UUID: {workflow_uuid}") from ve
    except SQLAlchemyError as se:
        logger.error(f"Database error creating API key: {str(se)}", exc_info=True)
        db.session.rollback()
        raise se
    except Exception as e:
        logger.error(f"Unexpected error creating API key: {str(e)}", exc_info=True)
        db.session.rollback()
        raise e

def get_api_key_by_token(token: str) -> Optional[APIKey]:
    """
    Get an API key by its token.
    
    Args:
        token: The API key token to look up
        
    Returns:
        The APIKey object if found, None otherwise
    """
    return APIKey.query.filter_by(token=token).first()

def get_api_keys_by_workflow(workflow_uuid: str) -> List[APIKey]:
    """
    Get all API keys for a specific workflow.
    
    Args:
        workflow_uuid: The UUID of the workflow
        
    Returns:
        List of APIKey objects for the specified workflow
    """
    return APIKey.query.filter_by(workflow_uuid=workflow_uuid).all()

def delete_api_key(api_key_uuid: str) -> bool:
    """
    Delete an API key by its UUID.
    
    Args:
        api_key_uuid: The UUID of the API key to delete
        
    Returns:
        True if the API key was deleted, False if it didn't exist
        
    Raises:
        ValueError: If api_key_uuid is invalid
        sqlalchemy.exc.SQLAlchemyError: If there's a database error
    """
    from sqlalchemy.exc import SQLAlchemyError
    import logging
    import uuid
    
    logger = logging.getLogger(__name__)
    
    try:
        # Validate UUID format
        try:
            if not api_key_uuid or not isinstance(api_key_uuid, str):
                raise ValueError("API key UUID is required and must be a string")
            uuid.UUID(api_key_uuid)  # Will raise ValueError if not a valid UUID
        except (ValueError, AttributeError) as ve:
            logger.error(f"Invalid API key UUID format: {api_key_uuid}")
            raise ValueError(f"Invalid API key UUID format: {api_key_uuid}") from ve
            
        logger.info(f"Deleting API key: {api_key_uuid}")
        
        # Try to find and delete the API key
        api_key = APIKey.query.get(api_key_uuid)
        if api_key:
            db.session.delete(api_key)
            db.session.commit()
            logger.info(f"Successfully deleted API key: {api_key_uuid}")
            return True
            
        logger.warning(f"API key not found: {api_key_uuid}")
        return False
        
    except SQLAlchemyError as se:
        logger.error(f"Database error deleting API key {api_key_uuid}: {str(se)}", exc_info=True)
        db.session.rollback()
        raise se
    except Exception as e:
        logger.error(f"Unexpected error deleting API key {api_key_uuid}: {str(e)}", exc_info=True)
        db.session.rollback()
        raise e

def update_last_used(api_key: APIKey) -> None:
    """
    Update the last_used_at timestamp for an API key.
    
    Args:
        api_key: The APIKey object to update
    """
    try:
        api_key.last_used_at = datetime.utcnow()
        db.session.add(api_key)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise e
