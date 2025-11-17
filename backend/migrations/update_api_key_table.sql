-- First, drop the existing table if it exists
DROP TABLE IF EXISTS api_key;

-- Recreate the table without the foreign key constraint
CREATE TABLE IF NOT EXISTS api_key (
    uuid VARCHAR(36) PRIMARY KEY,
    workflow_uuid VARCHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Recreate the index on token
CREATE INDEX IF NOT EXISTS idx_api_key_token ON api_key(token);

-- Recreate the index on workflow_uuid
CREATE INDEX IF NOT EXISTS idx_api_key_workflow_uuid ON api_key(workflow_uuid);
