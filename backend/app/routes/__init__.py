from .studio import bp as studio_bp
from .knowledge import bp as knowledge_bp
from .api_key import api as api_key_api
from .file_upload import api as file_upload_api

def register_blueprints(app):
    """Register all blueprints with the Flask application."""
    from .auth import bp as auth_bp
    from .knowledge import bp as knowledge_bp
    from .studio import bp as studio_bp
    from .api_key import api as api_key_api
    
    # Register Flask blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(knowledge_bp)
    app.register_blueprint(studio_bp)
    
    # Register Flask-RESTX API
    from .. import api
    api.add_namespace(api_key_api, path='/api')
