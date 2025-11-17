# AI Builder Backend

Flask-based backend for AI Builder, providing API endpoints for workflow management and knowledge base operations.

## Project Structure

```
/
├── app/           # Core application code
│   ├── __init__.py  # Flask app initialization
│   ├── config.py    # Configuration settings
│   ├── models/      # Database models
│   ├── routes/      # API endpoints
│   ├── services/    # Business logic
│   └── utils/       # Helper functions
├── migrations/    # Database migrations
├── tests/        # Test suite
├── vector_db/    # Vector storage
└── instance/     # Instance-specific files
```

## API Endpoints

### Studio API (`/api/v1/studio`)
- `POST /workflow` - Save workflow
- `GET /workflow/{id}` - Get workflow
- `POST /workflow/execute` - Execute workflow
- `GET /workflow/list` - List workflows

### Knowledge API (`/api/v1/knowledge`)
- `POST /knowledge-base` - Create knowledge base
- `GET /knowledge-base/{id}` - Get knowledge base
- `POST /document` - Upload document
- `GET /documents` - List documents
- `POST /embedding` - Generate embeddings

## Tech Stack

- Flask & Flask-RESTful
- SQLAlchemy ORM
- Langchain for LLM integration
- ChromaDB/Qdrant for vector storage
- PyPDF2 for document processing

## Setup

1. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables in `.env`:
   ```env
   FLASK_APP=app
   FLASK_ENV=development
   DATABASE_URL=sqlite:///app.db
   VECTOR_DB_PATH=vector_db
   ```

4. Initialize database:
   ```bash
   flask db upgrade
   ```

5. Run development server:
   ```bash
   flask run
   ```

## Development

### Adding New Models
```bash
# Create migration
flask db migrate -m "description"

# Apply migration
flask db upgrade
```

### Running Tests
```bash
pytest tests/
```

## Services

- **WorkflowService**: Handles workflow execution
- **KnowledgeService**: Manages knowledge bases
- **LLMService**: Interfaces with language models
- **EmbeddingService**: Handles document embeddings
- **VectorDBService**: Manages vector storage

## Contributing

1. Follow PEP 8 style guide
2. Write tests for new features
3. Update documentation as needed
4. Submit PRs for review

## Features

### Studio (Workflow Management)
- Create, retrieve, and execute AI workflows
- Support for different node types (LLM, Knowledge Retrieval, etc.)
- Workflow execution engine with context management

### Knowledge Management
- Create and manage knowledge bases
- Upload and process documents (PDF, text)
- Generate embeddings for semantic search using Ollama
- Query knowledge bases with vector similarity search via PostgreSQL/pgvector

## Project Structure

```
backend/
├── app/                    # Main application code
│   ├── __init__.py         # App initialization
│   ├── config.py           # Configuration settings
│   ├── models/             # Database models
│   │   ├── __init__.py
│   │   ├── document_vector.py  # Vector storage model for pgvector
│   │   ├── knowledge.py  # Knowledge base models
│   │   └── workflow.py     # Workflow models
│   ├── routes/             # API routes
│   │   ├── __init__.py
│   │   ├── knowledge.py    # Knowledge API endpoints
│   │   └── studio.py       # Studio API endpoints
│   └── services/           # Business logic
│       ├── __init__.py
│       ├── embedding_service.py  # Embedding generation
│       ├── knowledge_service.py  # Knowledge base operations
│       ├── llm_service.py        # LLM integration
│       └── workflow_service.py   # Workflow operations
├── .env.example            # Example environment variables
├── requirements.txt        # Python dependencies
└── run.py                  # Application entry point
```

## API Endpoints

### Studio API
- `POST /workflow`: Create a new workflow
- `GET /workflow/<workflow_id>`: Get workflow details
- `GET /workflow/list`: List all workflows
- `POST /workflow/execute/<workflow_id>`: Execute a workflow

### Knowledge API
- `POST /knowledge`: Create a new knowledge base
- `GET /knowledge/<knowledge_id>`: Get knowledge base details
- `GET /knowledge/list`: List all knowledge bases
- `POST /document/<knowledge_id>`: Upload a document to a knowledge base
- `POST /query/<knowledge_id>`: Query a knowledge base

## Setup and Installation

1. Clone the repository
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and configure environment variables
5. Ensure PostgreSQL is running with pgvector extension installed
6. Run the SQL migration to create the pgvector extension:
   ```bash
   psql -U postgres -d ai_builder -f migrations/create_pgvector_extension.sql
   ```
7. Run the application:
   ```bash
   python run.py
   ```

## Environment Variables

- `FLASK_APP`: Set to `run.py`
- `FLASK_ENV`: Set to `development` or `production`
- `DATABASE_URI`: PostgreSQL database connection string (e.g., postgresql://postgres:postgres@localhost/ai_builder)
- `OLLAMA_BASE_URL`: URL for Ollama API (for embeddings and LLM)
- `DEFAULT_LLM_MODEL`: Default Ollama model for LLM capabilities
- `DEFAULT_EMBEDDING_MODEL`: Default Ollama model for generating embeddings

## Dependencies

- Flask: Web framework
- SQLAlchemy: ORM for database operations
- PostgreSQL: Database with pgvector extension for vector operations
- psycopg2: PostgreSQL adapter for Python
- PyPDF2: PDF processing
- NumPy/scikit-learn: For vector similarity calculations
- Requests: For Ollama API integration

## Development

To contribute to the backend:

1. Set up the development environment as described above
2. Make your changes
3. Test your changes locally
4. Submit a pull request

## Future Enhancements

- Add more document processing capabilities (DOCX, HTML, etc.)
- Implement more sophisticated chunking strategies
- Add support for more embedding models
- Enhance workflow execution with better error handling
- Add user authentication and authorization
