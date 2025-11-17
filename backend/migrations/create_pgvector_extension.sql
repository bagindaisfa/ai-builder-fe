-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create similarity search functions
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector) 
RETURNS float 
AS $$
  SELECT 1 - (a <=> b) AS result
$$ LANGUAGE SQL IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION euclidean_distance(a vector, b vector) 
RETURNS float 
AS $$
  SELECT a <-> b AS result
$$ LANGUAGE SQL IMMUTABLE STRICT;

-- Create index on document_vectors table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'document_vectors'
  ) THEN
    -- Check if index already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'document_vectors' AND indexname = 'document_vectors_embedding_idx'
    ) THEN
      -- Create index for faster similarity search
      CREATE INDEX document_vectors_embedding_idx ON document_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    END IF;
  END IF;
END
$$;
