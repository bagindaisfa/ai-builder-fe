from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_restx import Api
from flask_mail import Mail
from .config import Config

db = SQLAlchemy()
migrate = Migrate()
api = Api(
    title='AI Builder API',
    version='1.0',
    description='API for AI Builder Application',
    doc="/swagger",
    prefix="/api/v1"
)
mail = Mail()

def create_app(config_class=Config):
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config_class)
    
    # Configure logging
    import logging
    from logging.handlers import RotatingFileHandler
    import os
    
    # Ensure the logs directory exists
    log_dir = app.config.get('LOG_FILE_PATH', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    log_dir = os.path.join(log_dir, 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # # Configure file handler
    # file_handler = RotatingFileHandler(
    #     os.path.join(log_dir, 'app.log'),
    #     maxBytes=10240,
    #     backupCount=10
    # )
    # file_handler.setFormatter(logging.Formatter(
    #     '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    # ))
    # file_handler.setLevel(logging.DEBUG)
    
    # Configure console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    console_handler.setLevel(logging.DEBUG)
    
    # Add handlers to the app's logger
    # app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(logging.DEBUG)
    
    app.logger.info('Application startup')
    app.logger.debug(f'Keycloak URL: {app.config.get("KEYCLOAK_SERVER_URL")}')
    app.logger.debug(f'Keycloak Realm: {app.config.get("KEYCLOAK_REALM_NAME")}')
    app.logger.debug(f'Keycloak Client ID: {app.config.get("KEYCLOAK_CLIENT_ID")}')
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Configure CORS
    CORS(app, 
         resources={
             r"/api/*": {
                 "origins": ["*" ],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization"],
                 "supports_credentials": True
             }
         })
    
    # Initialize API with the app
    api.init_app(app)
    
    # Import and register API namespaces
    from .routes.auth import api as auth_ns
    from .routes.knowledge import api as knowledge_ns
    from .routes.studio import api as studio_ns
    from .routes.api_key import api as api_key_ns
    from .routes.file_upload import api as file_upload_ns
    from .routes.memory import api as memory_ns
    
    # Add namespaces to the API
    api.add_namespace(auth_ns, path='/auth')
    api.add_namespace(knowledge_ns, path='/knowledge')
    api.add_namespace(studio_ns, path='/studio')
    api.add_namespace(api_key_ns, path='/api-keys')
    api.add_namespace(file_upload_ns, path='/file-upload')
    api.add_namespace(memory_ns, path='/memory')
    
    # Inisialisasi mail
    mail.init_app(app)
    
    # Import and register blueprints
    from .routes import register_blueprints
    register_blueprints(app)
    
    # Initialize auth service for keycloak
    from .services.auth_service import auth_service
    auth_service.init_app(app)

    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app

from . import models