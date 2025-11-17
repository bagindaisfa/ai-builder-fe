import os
from dotenv import load_dotenv

load_dotenv()

class Config:

    # Frontend URL
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-change-in-production')
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Vector DB settings
    VECTOR_DB_PATH = os.getenv('VECTOR_DB_PATH', './vector_db')
    
    # LLM settings
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    DEFAULT_LLM_MODEL = os.getenv('DEFAULT_LLM_MODEL', 'gemma3:12b')
    DEFAULT_EMBEDDING_MODEL = os.getenv('DEFAULT_EMBEDDING_MODEL', 'nomic-embed-text:v1.5')
    
    # File upload settings
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', './uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    CHAT_UPLOAD_FOLDER = os.getenv('CHAT_UPLOAD_FOLDER', '../../')
    
    # Keycloak Configuration
    KEYCLOAK_SERVER_URL = os.getenv('KEYCLOAK_SERVER_URL', 'http://localhost:8080')
    KEYCLOAK_REALM_NAME = os.getenv('KEYCLOAK_REALM_NAME', 'ai-builder')
    KEYCLOAK_CLIENT_ID = os.getenv('KEYCLOAK_CLIENT_ID', 'ai-builder-backend')
    KEYCLOAK_CLIENT_SECRET = os.getenv('KEYCLOAK_CLIENT_SECRET', '')
    KEYCLOAK_PUBLIC_KEY = os.getenv('KEYCLOAK_PUBLIC_KEY', '')
    KEYCLOAK_ADMIN_USERNAME = os.getenv('KEYCLOAK_ADMIN_USERNAME', 'admin')
    KEYCLOAK_ADMIN_PASSWORD = os.getenv('KEYCLOAK_ADMIN_PASSWORD', 'admin')

    # Log file settings
    LOG_FILE_PATH = os.getenv('LOG_FILE_PATH', './logs')

    # Email settings
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')  # alamat email kamu
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')  # password aplikasi gmail
    MAIL_DEFAULT_SENDER = ('Datacore Support', os.getenv('MAIL_USERNAME'))
