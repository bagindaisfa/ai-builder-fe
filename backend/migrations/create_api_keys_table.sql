-- Create api_key table
CREATE TABLE IF NOT EXISTS api_key (
    uuid VARCHAR(36) PRIMARY KEY,
    workflow_uuid UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (workflow_uuid) REFERENCES workflow(uuid) ON DELETE CASCADE
);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_key_token ON api_key(token);

-- Create index on workflow_uuid for faster filtering by workflow
CREATE INDEX IF NOT EXISTS idx_api_key_workflow_uuid ON api_key(workflow_uuid);
