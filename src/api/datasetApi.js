import API from "./api";

export const getDatasets = async () => {
  try {
    const response = await API.get("/knowledge/knowledges");
    return response.data;
  } catch (error) {
    console.error("Error fetching datasets:", error);
    throw error;
  }
};

export const getDataset = async (datasetId) => {
  try {
    const response = await API.get(`/knowledge/knowledge/${datasetId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching dataset:", error);
    throw error;
  }
};

export const createDataset = async (datasetData) => {
  try {
    const response = await API.post("/knowledge/initiate", datasetData);

    return response.data;
  } catch (error) {
    console.error("Error creating dataset:", error);
    throw error;
  }
};

export const updateDataset = async (updates) => {
  try {
    const response = await API.put(`/knowledge/initiate`, updates);
    return response.data;
  } catch (error) {
    console.error("Error updating dataset:", error);
    throw error;
  }
};

export const deleteDataset = async (datasetId) => {
  try {
    await API.delete(`/datasets/${datasetId}`);
  } catch (error) {
    console.error("Error deleting dataset:", error);
    throw error;
  }
};

export const datasetTestRetrieve = async (datasetId, query, top_k, retrievalMethod = 'keyword') => {
  try {
    const response = await API.post(`/knowledge/retrieval-test/${datasetId}`, {
      query: query,
      limit: top_k,
      retrieval_method: retrievalMethod
    });
  
    return response;
  } catch (error) {
    console.error("Error testing dataset:", error);
    throw error;
  }
};

export const addFileToDataset = async (datasetId, files) => {
  try {
    const formData = new FormData();

    // Add files to form data
    if (files && files.length > 0) {
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
    }

    const response = await API.post(`/datasets/${datasetId}/files`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error adding files to dataset:", error);
    throw error;
  }
};

export const getDocumentChunks = async (documentId) => {
  try {
    const response = await API.get(`/knowledge/documents/${documentId}/chunks`);
    return response.data;
  } catch (error) {
    console.error("Error fetching document chunks:", error);
    throw error;
  }
};

export const getDocumentDetails = async (documentId, keyword, page, limit) => {
  try {
    const response = await API.get(`/document/details/${documentId}?keyword=${keyword}&page=${page}&per_page=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching document chunks:", error);
    throw error;
  }
};


export const getDocumentChunksPaginated = async (documentId, keyword, page, limit) => {
  try {
    const response = await API.get(`/knowledge/document/chunks/${documentId}?keyword=${keyword}&page=${page}&per_page=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching document chunks:", error);
    throw error;
  }
};


export const getRetrievalHistory = async (datasetId, page, perPage, keyword) => {
  try {
    const response = await API.get(`/knowledge/retrieval/history/${datasetId}`, {
      params: {
        page,
        per_page: perPage,
        keyword: keyword || undefined
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching retrieval history:", error);
    throw error;
  }
};
