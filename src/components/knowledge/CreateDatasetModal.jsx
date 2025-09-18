import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Upload,
  Form,
  Input,
  Select,
  Switch,
  message,
  Steps,
  Card,
  List,
  Typography,
  Checkbox,
  Row,
  Col,
} from 'antd';
import {
  InboxOutlined,
  UploadOutlined,
  FileOutlined,
  SettingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { createDataset } from '../../api/datasetApi';
import { uploadDocument } from '../../api/documentApi';

const { Dragger } = Upload;
const { Step } = Steps;
const { Text } = Typography;

const CreateDatasetModal = ({ visible, onCancel, onCreate }) => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [datasetInfo, setDatasetInfo] = useState({});
  const [uploadedDocs, setUploadedDocs] = useState([]);

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (!visible) {
      setCurrentStep(0);
      setFileList([]);
      form.resetFields();
    }
  }, [visible, form]);

  const uploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
      return false;
    },
    beforeUpload: (file) => {
      // Check file size (10MB limit)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        messageApi.error('File must be smaller than 10MB!');
        return Upload.LIST_IGNORE;
      }

      // Check file type
      const isSupported = [
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ].includes(file.type);

      if (!isSupported) {
        messageApi.error(`${file.name} is not a supported file type`);
        return Upload.LIST_IGNORE;
      }

      setFileList([...fileList, file]);
      return false; // Prevent auto upload
    },
    fileList,
    multiple: true,
    showUploadList: {
      showPreviewIcon: false,
      showRemoveIcon: true,
      showDownloadIcon: false,
    },
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        // Validate step 1 fields
        await form.validateFields(['name', 'description']);

        if (fileList.length === 0) {
          messageApi.warning('Please select at least one file');
          return;
        } else {
          await handleUpload();
        }
      } else if (currentStep === 1) {
        // Get all current form values
        const allValues = form.getFieldsValue(true);
        // Validate step 2 fields
        await form.validateFields([
          'max_chunk_len',
          'chunk_overlap',
          'delimiter',
          'replaceWhitespace',
          'removeUrlsAndEmails',
        ]);

        // Update dataset info with all current values
        setDatasetInfo((prev) => ({
          ...prev,
          ...allValues,
        }));
      }

      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Form validation failed:', error);
      messageApi.error(error.message || 'Please fill in all required fields');
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleUpload = async () => {
    try {
      setUploading(true);

      // Upload files first if any
      if (fileList && fileList.length > 0) {
        const formData = new FormData();
        fileList.forEach((file) => {
          formData.append('files', file);
        });

        const response = await uploadDocument(formData);
        messageApi.success('Documents uploaded, now creating dataset...');
        setUploadedDocs(response.data);
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      messageApi.error(
        'Failed to process the form. Please check your inputs and try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCreateDataset = async (documents) => {
    try {
      setIsCreatingDataset(true);
      // Get all current form values
      const formValues = form.getFieldsValue(true);

      // Combine all values
      const allValues = {
        ...formValues,
        ...datasetInfo,
      };

      if (!allValues.name || !allValues.description) {
        throw new Error('Missing required fields');
      }
      // Prepare the dataset data with the correct structure
      const datasetData = {
        name: allValues.name,
        description: allValues.description,
        processing_config: {
          chunk_setting: {
            delimiter: allValues.delimiter || '\n\n',
            max_chunk_len: allValues.max_chunk_len || 1024,
            chunk_overlap: allValues.chunk_overlap || 50,
            text_pre_pocessing_rule: [
              allValues.replaceWhitespace &&
                'replace consecutive spaces new lines and tabs',
              allValues.removeUrlsAndEmails &&
                'delete all urls and email address',
            ].filter(Boolean), // Remove any falsy values from the array
          },
          index_method: 'economical',
        },
        documents: Array.isArray(documents) ? documents : [],
      };

      // Call the API to create the dataset
      await createDataset(datasetData);

      messageApi.success('Dataset created successfully!');
      onCancel();
    } catch (error) {
      console.error('Error creating dataset:', error);
      messageApi.error('Failed to create dataset. Please try again.');
    } finally {
      setIsCreatingDataset(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <Form.Item
              name="name"
              label="Dataset Name"
              rules={[
                {
                  required: true,
                  message: 'Please enter a name for your dataset',
                },
              ]}
            >
              <Input placeholder="e.g., Research Papers Q2 2023" />
            </Form.Item>

            <Form.Item name="description" label="Description (Optional)">
              <Input.TextArea
                rows={3}
                placeholder="A brief description of your dataset"
              />
            </Form.Item>

            <div style={{ margin: '24px 0' }}>
              <Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text">
                  Click or drag files to this area to upload
                </p>
                <p className="ant-upload-hint">
                  Supported formats: PDF, TXT, MD, DOCX, XLSX, CSV. Max file
                  size: 10MB
                </p>
              </Dragger>

              {fileList.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>Selected files ({fileList.length}):</Text>
                  <List
                    size="small"
                    dataSource={fileList}
                    renderItem={(file) => (
                      <List.Item>
                        <FileOutlined style={{ marginRight: 8 }} />
                        <Text ellipsis style={{ maxWidth: '80%' }}>
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{' '}
                          MB)
                        </Text>
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <>
            <Card
              title="Chunking Settings"
              size="small"
              style={{ marginBottom: 16 }}
              extra={<SettingOutlined />}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="max_chunk_len"
                    label="Maximum Chunk Length (characters)"
                    tooltip="The maximum size of each text chunk in characters"
                    rules={[
                      {
                        required: true,
                        message: 'Please enter maximum chunk length',
                      },
                    ]}
                  >
                    <Input type="number" min={100} max={10000} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="chunk_overlap"
                    label="Chunk Overlap (characters)"
                    tooltip="Number of characters that adjacent chunks will overlap"
                    rules={[
                      { required: true, message: 'Please enter chunk overlap' },
                    ]}
                  >
                    <Input type="number" min={0} max={5000} />
                  </Form.Item>
                </Col>
              </Row>

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
                  <Select.Option value="\n- ">List item (\n- )</Select.Option>
                  <Select.Option value="">Custom...</Select.Option>
                </Select>
              </Form.Item>

              <Card
                title="Text Pre-processing Rules"
                size="small"
                style={{ marginBottom: 16, marginTop: 16 }}
                bodyStyle={{ padding: '12px 16px' }}
              >
                <Form.Item name="replaceWhitespace" valuePropName="checked">
                  <Checkbox>
                    Replace consecutive spaces, newlines and tabs with a single
                    space
                  </Checkbox>
                </Form.Item>

                <Form.Item name="removeUrlsAndEmails" valuePropName="checked">
                  <Checkbox>Delete all URLs and email addresses</Checkbox>
                </Form.Item>
              </Card>
            </Card>

            <Card
              title="Selected Files"
              size="small"
              style={{ marginBottom: 16 }}
            >
              <List
                size="small"
                dataSource={fileList}
                renderItem={(file) => (
                  <List.Item>
                    <FileOutlined
                      style={{ marginRight: 8, color: '#52c41a' }}
                    />
                    <Text ellipsis style={{ maxWidth: '80%' }}>
                      {file.name}
                    </Text>
                  </List.Item>
                )}
              />
            </Card>
          </>
        );

      case 2:
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <CheckCircleOutlined
              style={{ fontSize: 48, color: '#52c41a', marginBottom: 24 }}
            />
            <h3>Ready to Create Knowledge</h3>
            <Text type="secondary">
              Your dataset will be created with the following settings:
            </Text>
            <div
              style={{ textAlign: 'left', margin: '16px 0', padding: '0 40px' }}
            >
              <p>
                <Text strong>Name:</Text> {datasetInfo.name}
              </p>
              <p>
                <Text strong>Files:</Text> {fileList.length} files selected
              </p>
              <p>
                <Text strong>Chunk Size:</Text>{' '}
                {form.getFieldValue('max_chunk_len')} characters
              </p>
              <p>
                <Text strong>Chunk Overlap:</Text>{' '}
                {form.getFieldValue('chunk_overlap')} characters
              </p>
              <p>
                <Text strong>Delimiter:</Text> {form.getFieldValue('delimiter')}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const steps = [
    {
      title: 'Basic Info',
      icon: <FileOutlined />,
    },
    {
      title: 'Chunk Settings',
      icon: <SettingOutlined />,
    },
    {
      title: 'Review',
      icon: <CheckCircleOutlined />,
    },
  ];

  const modalProps = {
    title: (
      <div>
        <h3 style={{ margin: 0 }}>
          {currentStep === 0
            ? 'Create Knowledge'
            : currentStep === 1
            ? 'Configure Chunking'
            : 'Review & Create'}
        </h3>
        <div style={{ marginTop: 8 }}>
          <Steps current={currentStep} size="small" style={{ width: '100%' }}>
            {steps.map((step, index) => (
              <Step
                key={index}
                title={step.title}
                icon={step.icon}
                style={{ flex: 1 }}
              />
            ))}
          </Steps>
        </div>
      </div>
    ),
    open: visible,
    onCancel: () => {
      if (uploading) return; // Prevent closing while uploading
      onCancel();
    },
    footer: [
      currentStep > 0 && (
        <Button key="back" onClick={handleBack} disabled={uploading}>
          Back
        </Button>
      ),
      currentStep < steps.length - 1 ? (
        <Button
          key="next"
          type="primary"
          onClick={handleNext}
          loading={uploading}
          disabled={fileList.length === 0}
        >
          Next
        </Button>
      ) : (
        <Button
          key="submit"
          type="primary"
          onClick={() => handleCreateDataset(uploadedDocs)}
          loading={isCreatingDataset}
        >
          {isCreatingDataset ? 'Creating...' : 'Create Knowledge'}
        </Button>
      ),
    ],
    width: 700,
    destroyOnClose: true,
    maskClosable: false,
    keyboard: false,
  };

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setCurrentStep(0);
      setFileList([]);
    }
  }, [visible, form]);

  return (
    <>
      {contextHolder}
      <Modal {...modalProps}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: '',
            description: '',
            max_chunk_len: 1024,
            chunk_overlap: 50,
            delimiter: '\n\n',
            replaceWhitespace: true,
            removeUrlsAndEmails: true,
          }}
        >
          {renderStepContent()}
        </Form>
      </Modal>
    </>
  );
};

export default CreateDatasetModal;
