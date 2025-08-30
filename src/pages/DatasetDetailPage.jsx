import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Typography,
  Card,
  Tabs,
  message,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Upload,
  Spin,
  Checkbox,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  UploadOutlined,
  InboxOutlined,
  FileOutlined,
} from "@ant-design/icons";
import { getDataset, updateDataset } from "../api/datasetApi";
import { uploadDocument } from "../api/documentApi";
import DocumentTable from "../components/knowledge/DocumentTable";
import DocumentSettingsModal from "../components/knowledge/DocumentSettingsModal";
import PageContainer from "../components/common/PageContainer";
import { formatFileSize } from "../utils/format";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Dragger } = Upload;

// Mock data for demonstration
const mockDatasets = {
  // This is a sample dataset that will match any UUID for demo purposes
  // In a real app, this would be fetched from an API
  "sample-uuid-123": {
    id: "sample-uuid-123",
    name: "Research Papers",
    description: "Collection of AI research papers",
    fileCount: 5,
    wordCount: 12500,
    linkedApps: 3,
    lastUpdated: new Date().toISOString(),
    files: [
      {
        id: "f1",
        name: "Attention is All You Need.pdf",
        type: "pdf",
        size: 2456789,
        uploadedAt: "2023-05-15T14:30:00Z",
        status: "ready",
        wordCount: 8500,
      },
    ],
  },
};

const UploadModal = ({ visible, onCancel, datasetId, dataset, onFinish }) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showChunkSettings, setShowChunkSettings] = useState(false);
  const [documents, setDocuments] = useState([]);

  const uploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
      return false;
    },
    beforeUpload: (file) => {
      setFileList([...fileList, file]);
      return false; // Prevent auto upload
    },
    fileList,
    multiple: true,
    showUploadList: true,
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      messageApi.warning("Please select at least one file");
      return;
    }

    setUploading(true);
    const formData = new FormData();

    try {
      // Add files to form data
      fileList.forEach((file, index) => {
        formData.append(`files`, file);
      });

      let response;
      if (datasetId) {
        // Add files to existing dataset
        response = await uploadDocument(formData);
        setDocuments(response.data);
        messageApi.success("Files added to dataset successfully");
        setShowChunkSettings(true);
      }
      setFileList([]);

      form.resetFields();
      onCancel();
    } catch (error) {
      console.error("Upload failed:", error);
      messageApi.error(
        error.response?.data?.message || "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleChunkSettingsSubmit = async (allValues) => {
    try {
      const datasetData = {
        uuid: datasetId,
        name: allValues.name,
        description: allValues.description,
        processing_config: {
          chunk_setting: {
            delimiter: allValues.delimiter,
            max_chunk_len: allValues.max_chunk_len,
            chunk_overlap: allValues.chunk_overlap,
            text_pre_pocessing_rule: [
              allValues.replaceWhitespace &&
                "replace consecutive spaces new lines and tabs",
              allValues.removeUrlsAndEmails &&
                "delete all urls and email address",
            ].filter(Boolean), // Remove any falsy values from the array
          },
          index_method: "economical",
        },
        documents: Array.isArray(documents) ? documents : [],
      };

      // Call the API to create the dataset
      await updateDataset(datasetData);
      messageApi.success("Dataset updated successfully!");
      onFinish();
      setShowChunkSettings(false);
    } catch (err) {
      console.error("Update dataset failed:", err);
      messageApi.error(
        err.response?.data?.message ||
          "Update dataset failed. Please try again."
      );
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="Upload Files"
        open={visible && !showChunkSettings}
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancel
          </Button>,
          <Button
            key="next"
            type="primary"
            onClick={() => {
              handleUpload();
            }}
            disabled={fileList.length === 0 || uploading}
          >
            Next: Configure Chunking
          </Button>,
        ]}
      >
        <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag files to this area to upload
          </p>
          <p className="ant-upload-hint">
            Support for a single or bulk upload. Maximum file size: 10MB.
            Supported formats: PDF, DOCX, TXT, CSV, XLSX.
          </p>
        </Dragger>

        {fileList.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4>Selected Files ({fileList.length}):</h4>
            <ul
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                paddingLeft: "20px",
              }}
            >
              {fileList.map((file, index) => (
                <li key={index} style={{ margin: "4px 0" }}>
                  <FileOutlined style={{ marginRight: 8 }} />
                  {file.name}{" "}
                  <Text type="secondary">({formatFileSize(file.size)})</Text>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      <DocumentSettingsModal
        visible={showChunkSettings}
        onCancel={() => setShowChunkSettings(false)}
        onSave={handleChunkSettingsSubmit}
        documentData={dataset}
        title="Configure Chunk Settings"
        showBackButton={true}
        onBack={() => setShowChunkSettings(false)}
      />
    </>
  );
};

const DatasetDetailPage = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState(null);
  const [activeTab, setActiveTab] = useState("files");
  const [documents, setDocuments] = useState([]);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);

  const fetchDataset = async () => {
    try {
      // Show loading state
      setDataset(null);
      setDocuments([]);

      // Simulate API call with timeout
      await new Promise((resolve) => setTimeout(resolve, 300));

      // For demo purposes, use the sample dataset for any UUID
      // In a real app, you would fetch the dataset by ID from your API
      const response = await getDataset(datasetId);

      if (response) {
        setDataset(response);
        setDocuments(response.documents || []);
      } else {
        throw new Error("Dataset not found");
      }
    } catch (error) {
      console.error("Error fetching dataset:", error);
      message.error(error.message || "Failed to load dataset");
      navigate("/knowledge", { replace: true });
    }
  };

  useEffect(() => {
    if (datasetId) {
      fetchDataset();
    } else {
      message.error("No dataset ID provided");
      navigate("/knowledge", { replace: true });
    }
  }, [datasetId, navigate]);

  const handleSubmit = async () => {
    try {
      setIsCreatingDataset(true);
      // Get all current form values
      const formValues = form.getFieldsValue(true);

      // Combine all values
      const allValues = {
        ...formValues,
      };

      if (!allValues.name || !allValues.description) {
        throw new Error("Missing required fields");
      }
      // Prepare the dataset data with the correct structure
      const datasetData = {
        uuid: datasetId,
        name: allValues.name,
        description: allValues.description,
        processing_config: {
          chunk_setting: {
            delimiter: allValues.delimiter,
            max_chunk_len: allValues.max_chunk_len,
            chunk_overlap: allValues.chunk_overlap,
            text_pre_pocessing_rule: [
              allValues.replaceWhitespace &&
                "replace consecutive spaces new lines and tabs",
              allValues.removeUrlsAndEmails &&
                "delete all urls and email address",
            ].filter(Boolean), // Remove any falsy values from the array
          },
          index_method: "economical",
        },
        documents: Array.isArray(documents) ? documents : [],
      };

      // Call the API to create the dataset
      await updateDataset(datasetData);
      messageApi.success("Dataset updated successfully!");
      fetchDataset();
    } catch (error) {
      console.error("Error updating dataset:", error);
      messageApi.error("Failed to update dataset. Please try again.");
    } finally {
      setIsCreatingDataset(false);
    }
  };

  if (!dataset) {
    return (
      <PageContainer>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "50vh",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading dataset...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      {contextHolder}
      <PageContainer>
        <div style={{ marginBottom: 24 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/knowledge")}
            style={{ marginBottom: 16 }}
          >
            Back to Knowledges
          </Button>

          <div style={{ marginBottom: 24 }}>
            <Title level={3}>{dataset.name}</Title>
            <Text type="secondary">{dataset.description}</Text>
          </div>

          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              tabBarExtraContent={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsUploadModalVisible(true)}
                >
                  Upload Files
                </Button>
              }
            >
              <TabPane tab="Files" key="files">
                <DocumentTable
                  documents={documents}
                  onDocumentView={(doc) => {
                    // Handle document view
                    console.log("View document:", doc);
                  }}
                  onDocumentDelete={(docId) => {
                    // Handle document delete
                    setDocuments(documents.filter((doc) => doc.id !== docId));
                    message.success("Document removed");
                  }}
                />
              </TabPane>
              <TabPane tab="Settings" key="settings">
                <div style={{ padding: 16 }}>
                  <Title level={4}>Knowledge Settings</Title>
                  <Form
                    form={form}
                    onFinish={handleSubmit}
                    layout="vertical"
                    initialValues={{
                      name: dataset.name,
                      description: dataset.description,
                      max_chunk_len:
                        dataset.processing_config?.chunk_setting?.max_chunk_len,
                      chunk_overlap:
                        dataset.processing_config?.chunk_setting?.chunk_overlap,
                      delimiter:
                        dataset.processing_config?.chunk_setting?.delimiter,
                      replaceWhitespace:
                        dataset.processing_config?.chunk_setting?.text_pre_pocessing_rule.includes(
                          "replace consecutive spaces new lines and tabs"
                        ),
                      removeUrlsAndEmails:
                        dataset.processing_config?.chunk_setting?.text_pre_pocessing_rule.includes(
                          "delete all urls and email address"
                        ),
                    }}
                  >
                    <Form.Item
                      name="name"
                      label="Dataset Name"
                      rules={[
                        {
                          required: true,
                          message: "Please enter a name for your dataset",
                        },
                      ]}
                    >
                      <Input placeholder="e.g., Research Papers Q2 2023" />
                    </Form.Item>

                    <Form.Item
                      name="description"
                      label="Description (Optional)"
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="A brief description of your dataset"
                      />
                    </Form.Item>
                    <Form.Item
                      name="max_chunk_len"
                      label="Maximum Chunk Length (characters)"
                      tooltip="The maximum size of each text chunk in characters"
                      rules={[
                        {
                          required: true,
                          message: "Please enter maximum chunk length",
                        },
                      ]}
                    >
                      <Input type="number" min={100} max={10000} />
                    </Form.Item>
                    <Form.Item
                      name="chunk_overlap"
                      label="Chunk Overlap (characters)"
                      tooltip="Number of characters that adjacent chunks will overlap"
                      rules={[
                        {
                          required: true,
                          message: "Please enter chunk overlap",
                        },
                      ]}
                    >
                      <Input type="number" min={0} max={5000} />
                    </Form.Item>
                    <Form.Item
                      name="delimiter"
                      label="Delimiter"
                      tooltip="Character or string used to split the document into chunks"
                    >
                      <Select>
                        <Select.Option value="\n">New Line (\n)</Select.Option>
                        <Select.Option value="\n\n">
                          Double New Line (\n\n)
                        </Select.Option>
                        <Select.Option value=" ">Space</Select.Option>
                        <Select.Option value="\t">Tab (\t)</Select.Option>
                        <Select.Option value=". ">Period (.)</Select.Option>
                        <Select.Option value="\n- ">
                          List item (\n- )
                        </Select.Option>
                        <Select.Option value="">Custom...</Select.Option>
                      </Select>
                    </Form.Item>
                    <Card
                      title="Text Pre-processing Rules"
                      size="small"
                      style={{ marginBottom: 16, marginTop: 16 }}
                      bodyStyle={{ padding: "12px 16px" }}
                    >
                      <Form.Item
                        name="replaceWhitespace"
                        valuePropName="checked"
                      >
                        <Checkbox>
                          Replace consecutive spaces, newlines and tabs with a
                          single space
                        </Checkbox>
                      </Form.Item>

                      <Form.Item
                        name="removeUrlsAndEmails"
                        valuePropName="checked"
                      >
                        <Checkbox>Delete all URLs and email addresses</Checkbox>
                      </Form.Item>
                    </Card>
                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={isCreatingDataset}
                      >
                        Update
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </div>

        <UploadModal
          visible={isUploadModalVisible}
          onCancel={() => setIsUploadModalVisible(false)}
          datasetId={datasetId}
          dataset={dataset}
          documents={documents}
          onFinish={fetchDataset}
        />
      </PageContainer>
    </>
  );
};

export default DatasetDetailPage;
