import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5001",
  withCredentials: false,
});

// Workflows
export const getWorkflows = () => API.get("/v1/workflows");
export const getWorkflow = (id) => API.get(`/v1/workflows/${id}`);
export const createOrUpdateWorkflow = (payload) =>
  API.post("/v1/workflows", payload);
export const runWorkflow = (id, body) =>
  API.post(`/v1/workflows/${id}/execute`, body);

// Knowledge (datasets/documents)
export const getDatasets = () => API.get("/v1/datasets");
export const uploadDocument = (formData) =>
  API.post("/v1/datasets/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteDocument = (id) => API.delete(`/v1/datasets/${id}`);

// API keys (example endpoints — sesuaikan dengan backend Dify Anda)
export const getApiKeys = () => API.get("/v1/api-keys");
export const createApiKey = (name) => API.post("/v1/api-keys", { name });
export const deleteApiKey = (id) => API.delete(`/v1/api-keys/${id}`);

export default API;
