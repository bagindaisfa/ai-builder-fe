// src/api/apiContracts.js

export const STATIC_API_CONTRACTS = [
  {
    category: "Chat",
    method: "POST",
    path: "/v1/chat-messages",
    description:
      "Send a message to a conversation and receive AI-generated reply.",
    authRequired: true,
    parameters: [
      {
        name: "inputs",
        type: "object",
        required: false,
        description: "Additional inputs (model-specific)",
      },
      {
        name: "query",
        type: "string",
        required: true,
        description: "User message content",
      },
      {
        name: "response_mode",
        type: "string",
        required: false,
        description: "Response mode, e.g., streaming or blocking",
      },
      {
        name: "conversation_id",
        type: "string",
        required: false,
        description: "Conversation session ID",
      },
      {
        name: "user",
        type: "string",
        required: false,
        description: "User identifier",
      },
    ],
    exampleRequest: `curl -X POST 'https://api.builder.ai/v1/chat-messages' -H 'Authorization: Bearer YOUR_API_KEY' -H 'Content-Type: application/json' -d '{
  "query": "Hello, world!",
  "response_mode": "blocking",
  "user": "user123"
}'`,
    exampleResponse: `{
  "id": "msg123",
  "reply": {
    "text": "Hello! How can I assist you today?"
  }
}`,
  },
  {
    category: "Completion",
    method: "POST",
    path: "/v1/completion-messages",
    description:
      "Send a generic generative task like summarization or translation.",
    authRequired: true,
    parameters: [
      {
        name: "inputs",
        type: "object",
        required: true,
        description: "Task-specific inputs",
      },
      {
        name: "response_mode",
        type: "string",
        required: false,
        description: "streaming or blocking",
      },
      { name: "user", type: "string", required: false },
    ],
    exampleRequest: `curl -X POST 'https://api.builder.ai/v1/completion-messages' -H 'Authorization: Bearer YOUR_API_KEY' -H 'Content-Type: application/json' -d '{
  "inputs": { "text": "Summarize this text..." },
  "response_mode": "streaming"
}'`,
    exampleResponse: `{
  "id": "comp123",
  "result": { "text": "This is the summary..." }
}`,
  },
  {
    category: "Models",
    method: "GET",
    path: "/v1/models",
    description: "List available LLM models and basic info.",
    authRequired: true,
    parameters: [],
    exampleRequest: `curl -X GET 'https://api.builder.ai/v1/models' -H 'Authorization: Bearer YOUR_API_KEY'`,
    exampleResponse: `{
  "models": [
    { "id": "gpt-4", "provider": "openai", "available": true },
    { "id": "qwen", "provider": "qwen", "available": true }
  ]
}`,
  },
  {
    category: "Embeddings",
    method: "POST",
    path: "/v1/embeddings",
    description: "Create an embedding vector for input text.",
    authRequired: true,
    parameters: [
      {
        name: "model",
        type: "string",
        required: true,
        description: "Model to use",
      },
      {
        name: "input",
        type: "string|array",
        required: true,
        description: "Text or tokens",
      },
      { name: "user", type: "string", required: false },
    ],
    exampleRequest: `curl -X POST 'https://api.builder.ai/v1/embeddings' -H 'Authorization: Bearer YOUR_API_KEY' -H 'Content-Type: application/json' -d '{
  "model": "embedding-model",
  "input": "text to embed"
}'`,
    exampleResponse: `{
  "embedding": [0.123, 0.456, ...]
}`,
  },
  {
    category: "Files",
    method: "POST",
    path: "/v1/files/upload",
    description: "Upload a file to use in various endpoints/features.",
    authRequired: true,
    parameters: [
      {
        name: "file",
        type: "file",
        required: true,
        description: "File to upload",
      },
      {
        name: "purpose",
        type: "string",
        required: true,
        description: 'Use case, e.g., "assistants"',
      },
    ],
    exampleRequest: `curl -X POST 'https://api.builder.ai/v1/files/upload' -H 'Authorization: Bearer YOUR_API_KEY' -F 'file=@/path/to/file' -F 'purpose=assistants'`,
    exampleResponse: `{
  "file_id": "file123",
  "status": "uploaded"
}`,
  },
  {
    category: "Knowledge (Datasets)",
    method: "GET",
    path: "/v1/datasets",
    description: "List all knowledge bases (datasets).",
    authRequired: true,
    parameters: [],
    exampleRequest: `curl -X GET 'https://api.builder.ai/v1/datasets' -H 'Authorization: Bearer YOUR_API_KEY'`,
    exampleResponse: `{
  "datasets": [
    { "id": "kb123", "name": "My KB", "status": "ready" }
  ]
}`,
  },
  {
    category: "Knowledge (Create Document)",
    method: "POST",
    path: "/v1/datasets/{dataset_id}/document/create_by_text",
    description: "Create a new document in KB via text.",
    authRequired: true,
    parameters: [
      {
        name: "dataset_id",
        type: "string",
        required: true,
        description: "Target dataset",
      },
      {
        name: "name",
        type: "string",
        required: true,
        description: "Document name",
      },
      {
        name: "text",
        type: "string",
        required: true,
        description: "Content text to index",
      },
      { name: "indexing_technique", type: "string", required: false },
      { name: "process_rule", type: "object", required: false },
    ],
    exampleRequest: `curl -X POST 'https://api.builder.ai/v1/datasets/kb123/document/create_by_text' -H 'Authorization: Bearer YOUR_API_KEY' -H 'Content-Type: application/json' -d '{
  "name": "doc1",
  "text": "This is the content",
  "indexing_technique": "high_quality"
}'`,
    exampleResponse: `{
  "document": { "id": "doc123", "name": "doc1", "status": "waiting" }
}`,
  },
  {
    category: "Knowledge (List Documents)",
    method: "GET",
    path: "/v1/datasets/{dataset_id}/documents",
    description: "Get list of documents in dataset.",
    authRequired: true,
    parameters: [{ name: "dataset_id", type: "string", required: true }],
    exampleRequest: `curl -X GET 'https://api.builder.ai/v1/datasets/kb123/documents' -H 'Authorization: Bearer YOUR_API_KEY'`,
    exampleResponse: `{
  "documents": [
    { "id": "doc123", "name": "doc1", "status": "ready" }
  ]
}`,
  },
];
