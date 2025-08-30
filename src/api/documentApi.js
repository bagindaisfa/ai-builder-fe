import API from "./api";

export const uploadDocument = async (formData) => {
  try {
    const response = await API.post("/knowledge/documents", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
};

export const processDocuments = async (datasetId, chunkSettings) => {
  try {
    const response = await api.post(
      `/datasets/${datasetId}/process`,
      chunkSettings
    );
    return response.data;
  } catch (error) {
    console.error("Error processing documents:", error);
    throw error;
  }
};

export const getDocuments = async (datasetId) => {
  try {
    const response = await api.get(`/datasets/${datasetId}/documents`);
    return response.data;
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
};

export const deleteDocument = async (documentId) => {
  try {
    await api.delete(`/documents/${documentId}`);
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
};
