import axios from "axios";
import { message } from "antd";

// Create axios instance with base URL from environment variables
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5010/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

//auth
export const login = (payload) => API.post("/auth/login", payload);
export const logout = (data, config) => API.post("/auth/logout", data, config);
export const refreshToken = () => API.post("/auth/refresh");
export const register = (payload) => API.post("/auth/signup", payload);

//workflow
export const getWorkflows = () => API.get("/studio/workflows");
export const getWorkflow = (uuid) => API.get(`/studio/workflows/${uuid}`);
export const createOrUpdateWorkflow = (payload) =>
  API.post("/studio/workflows", payload);
export const executeWorkflow = (uuid, input) => {
  return API.post(`/studio/workflows/execute/${uuid}`, { input });
};

export const cancelWorkflow = (uuid) => {
  return API.delete(`/studio/workflows/execute/${uuid}`);
};
export const runWorkflow = (uuid, body) =>
  API.post(`/studio/workflows/execute/${uuid}`, body);

// Knowledge (datasets/documents)
export const getDatasets = () => API.get("/datasets");
export const getDataset = (datasetId) => API.get(`/datasets/${datasetId}`);

export const createDataset = (data) => {
  const formData = new FormData();

  // Append all fields to formData
  Object.keys(data).forEach((key) => {
    if (key === "files") {
      // Handle file uploads
      data.files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
    } else if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });

  return API.post("/datasets", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateDataset = (datasetId, data) => {
  const formData = new FormData();

  // Append all fields to formData
  Object.keys(data).forEach((key) => {
    if (key === "files") {
      // Handle file uploads
      data.files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
    } else if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });

  return API.patch(`/datasets/${datasetId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deleteDataset = (datasetId) =>
  API.delete(`/datasets/${datasetId}`);

export const uploadDocuments = (datasetId, formData) =>
  API.post(`/datasets/${datasetId}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getDatasetDocuments = (datasetId) =>
  API.get(`/datasets/${datasetId}/documents`);

export const deleteDocument = (datasetId, documentId) =>
  API.delete(`/datasets/${datasetId}/documents/${documentId}`);

export const processDataset = (datasetId, settings) =>
  API.post(`/datasets/${datasetId}/process`, settings);

export const createWorkflow = (payload) => {
  // Mock data for development
  if (!import.meta.env.VITE_API_BASE_URL) {
    return Promise.resolve({
      data: {
        uuid: crypto.randomUUID(),
        ...payload,
        workflowData: { nodes: [], edges: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }
  return API.post("/studio/workflows", payload);
};

export const updateWorkflow = (uuid, updates) => {
  // Mock data for development
  if (!import.meta.env.VITE_API_BASE_URL) {
    return Promise.resolve({
      data: {
        uuid,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    });
  }
  return API.put(`/studio/workflows/${uuid}`, updates);
};

export const deleteWorkflow = (uuid) => {
  // Mock data for development
  if (!import.meta.env.VITE_API_BASE_URL) {
    return Promise.resolve({ data: { success: true } });
  }
  return API.delete(`/studio/workflows/${uuid}`);
};

// API Keys
export const getApiKeys = (workflowUuid) =>
  API.get(
    workflowUuid ? `/api-keys?workflow_uuid=${workflowUuid}` : "/api-keys"
  );

export const createApiKey = (name, workflowUuid, permissions = []) =>
  API.post("/api-keys", { name, workflow_uuid: workflowUuid, permissions });

export const updateApiKey = (id, updates) =>
  API.patch(`/api-keys/${id}`, updates);

export const deleteApiKey = (id) => API.delete(`/api-keys/${id}`);

// API Contracts
export const getApiContracts = () => API.get("/api/contracts");
export const createApiContract = (payload) =>
  API.post("/api/contracts", payload);
export const updateApiContract = (id, updates) =>
  API.patch(`/api/contracts/${id}`, updates);
export const deleteApiContract = (id) => API.delete(`/api/contracts/${id}`);

export default API;
