import API from "./api";

export const getDatasets = async () => {
  try {
    const response = await API.get("/knowledge/knowledge-bases");
    return response.data;
  } catch (error) {
    console.error("Error fetching datasets:", error);
    throw error;
  }
};

export const getDataset = async (datasetId) => {
  try {
    const response = await API.get(`/knowledge/knowledge-bases/${datasetId}`);
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
