-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Convert conversation_memory table
ALTER TABLE conversation_memory 
    ALTER COLUMN id DROP DEFAULT,
    RENAME COLUMN id TO uuid,
    ALTER COLUMN uuid SET DATA TYPE uuid USING (uuid_generate_v4()),
    RENAME COLUMN workflow_id TO workflow_uuid,
    ALTER COLUMN workflow_uuid SET DATA TYPE uuid USING (uuid_generate_v4());

-- Convert document table
ALTER TABLE document
    ALTER COLUMN id DROP DEFAULT,
    RENAME COLUMN id TO uuid,
    ALTER COLUMN uuid SET DATA TYPE uuid USING (uuid_generate_v4());

-- Convert document_vectors table
ALTER TABLE document_vectors
    ALTER COLUMN id DROP DEFAULT,
    RENAME COLUMN id TO uuid,
    ALTER COLUMN uuid SET DATA TYPE uuid USING (uuid_generate_v4()),
    RENAME COLUMN document_id TO document_uuid,
    ALTER COLUMN document_uuid SET DATA TYPE uuid USING (uuid_generate_v4()),
    RENAME COLUMN user_id TO user_uuid,
    ALTER COLUMN user_uuid SET DATA TYPE uuid USING (uuid_generate_v4()),
    RENAME COLUMN bots_id TO bots_uuid,
    ALTER COLUMN bots_uuid SET DATA TYPE uuid USING (uuid_generate_v4());

-- Convert knowledge table
ALTER TABLE knowledge
    ALTER COLUMN id DROP DEFAULT,
    RENAME COLUMN id TO uuid,
    ALTER COLUMN uuid SET DATA TYPE uuid USING (uuid_generate_v4());

-- Convert workflow table
ALTER TABLE workflow
    ALTER COLUMN id DROP DEFAULT,
    RENAME COLUMN id TO uuid,
    ALTER COLUMN uuid SET DATA TYPE uuid USING (uuid_generate_v4());
