// Mock data for Knowledge with project linking (using existing workflows from PreviewPanel)
export const mockProjects = [
  {
    id: "project-1",
    name: "E-commerce Assistant",
    description: "AI assistant for product recommendations and customer support",
    status: "deployed",
    workflowId: "ecommerce-workflow-001",
    nodes: 8,
    lastUpdated: "2024-01-10"
  },
  {
    id: "project-2", 
    name: "Customer Support Bot",
    description: "Automated customer service with ticket routing",
    status: "deployed",
    workflowId: "support-workflow-002",
    nodes: 12,
    lastUpdated: "2024-01-09"
  },
  {
    id: "project-3",
    name: "Content Generator",
    description: "AI-powered content creation and blog writing assistant",
    status: "draft",
    workflowId: "content-workflow-003",
    nodes: 6,
    lastUpdated: "2024-01-08"
  },
  {
    id: "project-4",
    name: "Data Analysis Helper",
    description: "Automated data processing and insights generation",
    status: "deployed",
    workflowId: "analytics-workflow-004",
    nodes: 10,
    lastUpdated: "2024-01-07"
  }
];

// Document to Project mapping (many-to-many relationship)
export const documentProjects = [
  { documentId: 'doc-1', projectId: 'project-1' },
  { documentId: 'doc-1', projectId: 'project-2' }, // doc-1 is linked to multiple projects
  { documentId: 'doc-2', projectId: 'project-2' },
  { documentId: 'doc-3', projectId: 'project-3' },
  { documentId: 'doc-4', projectId: 'project-4' },
  { documentId: 'doc-4', projectId: 'project-1' }, // doc-4 is also linked to multiple projects
];

export const mockDocuments = [
  {
    id: "doc-1",
    name: "Product Catalog.pdf",
    filename: "Product Catalog.pdf",
    uploadDate: "2024-01-15T10:30:00Z",
    fileSize: 2048576,
    status: "ready",
    type: "pdf"
  },
  {
    id: "doc-2",
    name: "Customer Support Guidelines.docx",
    filename: "Customer Support Guidelines.docx",
    uploadDate: "2024-01-14T14:20:00Z",
    fileSize: 1024000,
    status: "ready",
    type: "docx"
  },
  {
    id: "doc-3",
    name: "Content Style Guide.md",
    filename: "Content Style Guide.md",
    uploadDate: "2024-01-13T09:15:00Z",
    fileSize: 512000,
    status: "processing",
    type: "md"
  },
  {
    id: "doc-4",
    name: "Data Analysis Manual.pdf",
    filename: "Data Analysis Manual.pdf",
    uploadDate: "2024-01-12T16:45:00Z",
    fileSize: 3072000,
    status: "ready",
    type: "pdf"
  },
  {
    id: "doc-5",
    name: "API Documentation.txt",
    filename: "API Documentation.txt",
    uploadDate: "2024-01-11T11:30:00Z",
    fileSize: 256000,
    status: "failed",
    type: "txt"
  }
];

// Project status and document status constants
export const PROJECT_STATUS = {
  DRAFT: 'draft',
  DEPLOYED: 'deployed'
};

export const DOCUMENT_STATUS = {
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed'
};

export const DOCUMENT_TYPE = {
  PDF: 'pdf',
  DOC: 'doc',
  DOCX: 'docx',
  TXT: 'txt',
  MD: 'md'
};

// Utility functions
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatUploadDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date Error';
  }
};

export const formatProjectStatus = (status) => {
  return status === 'deployed' ? 'Live' : 'Draft';
};

export const formatDocumentStatus = (status) => {
  switch (status) {
    case 'processing':
      return 'Processing';
    case 'ready':
      return 'Ready';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown';
  }
};