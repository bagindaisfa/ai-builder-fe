# PostgreSQL pgvector Integration

This document describes how AI Builder uses PostgreSQL with the pgvector extension for vector storage and similarity search.

## Overview

AI Builder now uses PostgreSQL with the pgvector extension for vector storage and similarity search, replacing the previous ChromaDB implementation. This provides several benefits:

- Single database for all data (both regular and vector)
- Simplified architecture and dependencies
- Better integration with the existing PostgreSQL setup
- Fewer dependency conflicts to manage
- Potentially better performance with properly indexed vector columns

## Requirements

- PostgreSQL 12+ with pgvector extension installed
- Python packages:
  - psycopg2-binary
  - sqlalchemy-utils

## Database Schema

The vector data is stored in a `document_vectors` table with the following schema:

| Column        | Type           | Description                                   |
|---------------|----------------|-----------------------------------------------|
| id            | serial4        | Primary key                                   |
| user_id       | text           | Optional user association                     |
| document_id   | text           | Foreign key to document table                 |
| chunk_index   | int4           | For documents split into chunks               |
| total_chunks  | int4           | Total chunks for this document                |
| document_type | text           | Type of document                              |
| text_content  | text           | The actual text chunk                         |
| embedding     | vector         | Vector embedding                              |
| metadata      | jsonb          | Any additional metadata                       |
| created_at    | timestamptz    | Creation timestamp                            |
| updated_at    | timestamp      | Update timestamp                              |
| bots_id       | uuid           | Optional bot association                      |

## Implementation Details

### Models

The `DocumentVector` model in `app/models/document_vector.py` defines the SQLAlchemy model for the vector data.

### Knowledge Service

The `KnowledgeService` class in `app/services/knowledge_service.py` has been refactored to:

1. Initialize pgvector extension if needed
2. Store document vectors in PostgreSQL
3. Perform similarity search using pgvector operators

### SQL Functions

Two SQL functions are created for similarity search:

- `cosine_similarity(a vector, b vector)`: Returns cosine similarity (1 - cosine distance)
- `euclidean_distance(a vector, b vector)`: Returns Euclidean distance

## Usage

The API interface remains the same, so existing code that uses the knowledge service doesn't need to be modified.

## Performance Optimization

For optimal performance, create an index on the embedding column:

```sql
CREATE INDEX document_vectors_embedding_idx ON document_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

This index is created automatically by the `_init_pgvector` method in the `KnowledgeService` class.
