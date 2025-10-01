import axios from 'axios';

// Create axios instance with base URL from environment variables
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5010/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Flag to prevent multiple token refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add a request interceptor to include the token in each request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip token refresh for login and token refresh endpoints
    if (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/refresh-token')
    ) {
      return Promise.reject(error);
    }

    // If the error status is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing the token, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshTokenValue = localStorage.getItem('refresh_token');
        if (!refreshTokenValue) {
          throw new Error('No refresh token available');
        }

        const response = await refreshToken({
          refresh_token: refreshTokenValue,
        });
        const { access_token, refresh_token: newRefreshToken } = response.data;

        // Store the new tokens
        localStorage.setItem('access_token', access_token);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        // Update the Authorization header
        API.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        // Process any queued requests
        processQueue(null, access_token);

        // Retry the original request
        return API(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear the token and redirect to login
        localStorage.removeItem('access_token');
        processQueue(refreshError, null);
        window.location.href = '/login'; // Adjust this to your login route
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

//auth
export const login = (payload) => API.post('/auth/login', payload);
export const logout = (data, config) => API.post('/auth/logout', data, config);
export const refreshToken = (payload) => API.post('/auth/refresh', payload);
export const register = (payload) => API.post('/auth/signup', payload);

//workflow
export const getWorkflows = (params) =>
  API.get('/studio/workflows/paginated', { params });
export const getWorkflowOptions = () => API.get('/studio/workflows');
export const getWorkflow = (uuid) => API.get(`/studio/workflows/${uuid}`);
export const createOrUpdateWorkflow = (payload) =>
  API.post('/studio/workflows', payload);
export const getWorkflowVariables = async (workflowUuid, currentNodeId) => {
  try {
    const response = await API.get(
      `/studio/workflows/${workflowUuid}/variables`,
      {
        params: { current_node_id: currentNodeId },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching workflow variables:', error);
    throw error;
  }
};

export const executeWorkflow = (
  uuid,
  input,
  conversation_id = null,
  files = null
) => {
  const payload = { input };
  if (conversation_id) {
    payload.conversation_id = conversation_id;
  }
  if (files) {
    payload.files = files;
  }
  return API.post(`/studio/workflows/execute/${uuid}`, payload);
};

export const cancelWorkflow = (uuid) => {
  return API.delete(`/studio/workflows/execute/${uuid}`);
};
export const runWorkflow = (uuid, body) =>
  API.post(`/studio/workflows/execute/${uuid}`, body);

//Knowledge
export const getKnowledge = () => API.get('/knowledge');
export const getSearchKnowledge = (params) =>
  API.get('/knowledge/paginated', { params });

// Knowledge (datasets/documents)
export const getDatasets = () => API.get('/datasets');
export const getDataset = (datasetId) => API.get(`/datasets/${datasetId}`);

export const createDataset = (data) => {
  const formData = new FormData();

  // Append all fields to formData
  Object.keys(data).forEach((key) => {
    if (key === 'files') {
      // Handle file uploads
      data.files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
    } else if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });

  return API.post('/datasets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateDataset = (datasetId, data) => {
  const formData = new FormData();

  // Append all fields to formData
  Object.keys(data).forEach((key) => {
    if (key === 'files') {
      // Handle file uploads
      data.files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
    } else if (data[key] !== undefined && data[key] !== null) {
      formData.append(key, data[key]);
    }
  });

  return API.patch(`/datasets/${datasetId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteDataset = (datasetId) =>
  API.delete(`/datasets/${datasetId}`);

export const uploadDocuments = (datasetId, formData) =>
  API.post(`/datasets/${datasetId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
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
  return API.post('/studio/workflows', payload);
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
export const getApiKeys = (params) => API.get('/api-keys', { params });

export const createApiKey = (payload) => API.post('/api-keys', payload);

export const deleteApiKey = (id) => API.delete(`/api-keys/${id}`);

// API Contracts
export const getApiContracts = () => API.get('/swagger.json');
export const createApiContract = (payload) =>
  API.post('/api/contracts', payload);
export const updateApiContract = (id, updates) =>
  API.patch(`/api/contracts/${id}`, updates);
export const deleteApiContract = (id) => API.delete(`/api/contracts/${id}`);
export const fileUpload = (uuid, formData, headers = {}) => {
  // Don't set Content-Type header - let the browser set it with the correct boundary
  const config = {
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data',
    },
    withCredentials: true,
  };
  return API.post(`/file-upload/upload/${uuid}`, formData, config);
};

// Memory / Conversations
// List conversations for a workflow with pagination and optional keyword
export const getConversations = (workflowUuid, params = {}) =>
  API.get(`/memory/conversations/${workflowUuid}`, { params });

// Get a single conversation's details (messages/history)
export const getConversation = (conversationId) =>
  API.get(`/memory/conversation/${conversationId}`);

export default API;
