import React, { useEffect, useState, useCallback } from 'react';
import { debounce } from 'lodash';
import {
  Table,
  Button,
  Input,
  Space,
  message,
  Card,
  Typography,
  Alert,
  Flex,
  theme,
  Select,
  Tag,
  Tabs,
  Modal,
  Tooltip,
  Popconfirm,
  Form,
  Input as AntdInput,
} from 'antd';
import { useTheme } from '../contexts/ThemeContext';
import {
  KeyOutlined,
  PlusOutlined,
  DeleteOutlined,
  ApiOutlined,
  CopyOutlined,
  EditOutlined,
  InfoCircleOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import {
  getApiKeys,
  createApiKey,
  deleteApiKey,
  getWorkflowOptions,
  getApiContracts,
} from '../api/api';
import GradientCard from './common/GradientCard';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const { Title, Text } = Typography;

export default function ApiAccessPanel() {
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState('api-keys');
  const [keys, setKeys] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [getWorkflowsLoading, setGetWorkflowsLoading] = useState(false);
  const [getApiKeysLoading, setGetApiKeysLoading] = useState(false);
  const [createApiKeyLoading, setCreateApiKeyLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const { isDarkMode } = useTheme();
  const { token } = theme.useToken();
  const [spec, setSpec] = useState(null);

  // Fetch workflows and API keys
  const fetchWorkflows = async () => {
    try {
      setGetWorkflowsLoading(true);
      const res = await getWorkflowOptions();
      setWorkflows(res.data || []);
    } catch (e) {
      messageApi.error('Failed to load workflows');
    } finally {
      setGetWorkflowsLoading(false);
    }
  };

  const fetchApiKeys = async (
    page = 1,
    pageSize = 10,
    keyword = searchText, // Use current searchText state as default
    workflowUuid = selectedWorkflow
  ) => {
    try {
      setGetApiKeysLoading(true);
      const params = {
        page,
        per_page: pageSize,
      };

      if (keyword) {
        params.keyword = keyword;
      }

      if (workflowUuid) {
        params.workflow_uuid = workflowUuid;
      }

      const res = await getApiKeys(params);
      setKeys(res.data?.items || []);

      // Update pagination
      setPagination({
        ...pagination,
        current: res.data?.meta?.current_page || 1,
        total: res.data?.meta?.total || 0,
        pageSize: res.data?.meta?.per_page || 10,
      });
    } catch (e) {
      console.error('Failed to load API keys:', e);
      messageApi.error('Failed to load API keys');
      setKeys([]);
    } finally {
      setGetApiKeysLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const res = await getApiContracts();
      let data = res.data;
      for (const path in data.paths) {
        for (const method in data.paths[path]) {
          const operation = data.paths[path][method];
          if (operation.tags?.includes('Auth')) {
            delete data.paths[path][method];
          }
        }
        // Kalau path kosong setelah operasi dihapus, hapus path juga
        if (Object.keys(data.paths[path]).length === 0) {
          delete data.paths[path];
        }
      }

      // Buang tag "auth" dari daftar tags di root
      data.tags = data.tags.filter((tag) => tag.name !== 'Auth');

      setSpec(data);
    } catch (e) {
      messageApi.error('Failed to load API Documentations');
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchWorkflows();
    fetchApiKeys(pagination.current, pagination.pageSize);
  }, []);

  const showCreateModal = () => {
    form.setFieldsValue({
      workflow: '',
      name: '',
      description: '',
    });
    setIsModalVisible(true);
  };

  const handleCreateOrUpdateKey = async () => {
    try {
      const values = await form.validateFields();
      setCreateApiKeyLoading(true);
      await createApiKey(values);

      // Update the key with name and description if needed
      // This assumes your API supports updating the key after creation
      // If not, you may need to modify your createApiKey endpoint to accept these fields

      messageApi.success('API Key created successfully');
      fetchApiKeys();
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error creating API key:', error);
      messageApi.error(
        error.response?.data?.message || 'Failed to create API key'
      );
    } finally {
      setCreateApiKeyLoading(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteApiKey(id);
      messageApi.success('API Key deleted');
      fetchApiKeys();
    } catch (e) {
      messageApi.error('Failed to delete API key');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        // metode modern, hanya jalan di HTTPS
        await navigator.clipboard.writeText(text);
      } else {
        // fallback untuk HTTP atau browser lama
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed'; // biar tidak loncat scroll
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      messageApi.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text:', err);
      messageApi.error('Failed to copy text');
    }
  };

  const renderApiKeyValue = (keyValue) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Text
        code
        style={{
          fontSize: '12px',
          background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5',
          padding: '2px 8px',
          borderRadius: 4,
        }}
      >
        {keyValue.length > 15 ? `${keyValue.substring(0, 15)}...` : keyValue}
      </Text>
      <Button
        type="text"
        size="small"
        icon={<CopyOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          copyToClipboard(keyValue);
        }}
      />
    </div>
  );

  const handleTableChange = (pagination) => {
    setPagination(pagination);
    fetchApiKeys(pagination.current, pagination.pageSize);
  };

  const handleSearch = useCallback(
    debounce((value) => {
      setSearchText(value);
      // Reset to first page when searching
      setPagination((prevPagination) => ({
        ...prevPagination,
        current: 1,
      }));
      // Pass empty string when value is cleared to remove the keyword filter
      fetchApiKeys(1, pagination.pageSize, value || '', selectedWorkflow);
    }, 500),
    [selectedWorkflow, pagination.pageSize]
  );

  const handleWorkflowChange = (value) => {
    // value will be undefined when cleared
    const workflowValue = value === undefined ? null : value;
    setSelectedWorkflow(workflowValue);
    // Reset to first page when changing workflow
    setPagination((prevPagination) => ({
      ...prevPagination,
      current: 1,
    }));
    // Use the new value directly in the API call
    fetchApiKeys(1, pagination.pageSize, searchText, workflowValue);
  };

  return (
    <>
      {contextHolder}
      <Flex vertical gap="large" style={{ height: '100%' }}>
        <GradientCard>
          <Flex align="center" gap="middle">
            <ApiOutlined style={{ fontSize: '24px', color: '#fff' }} />
            <Title
              level={4}
              style={{
                margin: 0,
                color: '#fff',
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              API Access
            </Title>
          </Flex>
        </GradientCard>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'api-keys',
              label: (
                <p
                  style={{
                    color: isDarkMode ? 'white' : '#222',
                  }}
                >
                  API Keys
                </p>
              ),
              children: (
                <>
                  <Card
                    style={{
                      marginBottom: 24,
                      borderRadius: 12,
                      border: `1px solid ${token.colorBorder}`,
                      background: token.colorBgContainer,
                    }}
                    bodyStyle={{ padding: '16px 24px' }}
                  >
                    <Flex justify="space-between" align="center">
                      <div>
                        <Title level={5} style={{ margin: 0 }}>
                          Workflow
                        </Title>
                        <Text type="secondary">
                          Select a workflow to manage its API keys
                        </Text>
                      </div>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <Input.Search
                          placeholder="Search API keys..."
                          value={searchText}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSearchText(value);
                            if (value === '') {
                              handleSearch('');
                            }
                          }}
                          onSearch={handleSearch}
                          style={{ width: 300 }}
                          allowClear
                          enterButton
                        />

                        <Select
                          style={{ width: 250 }}
                          placeholder="Filter by workflow"
                          value={selectedWorkflow}
                          onChange={handleWorkflowChange}
                          allowClear
                          loading={getWorkflowsLoading}
                        >
                          {workflows.map((workflow) => (
                            <Select.Option
                              key={workflow.uuid}
                              value={workflow.uuid}
                            >
                              {workflow.name}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>
                    </Flex>
                  </Card>

                  <Card
                    style={{
                      marginBottom: 24,
                      borderRadius: 12,
                      border: `1px solid ${token.colorBorder}`,
                      background: token.colorBgContainer,
                    }}
                    title={
                      <Flex align="center" gap={8}>
                        <KeyOutlined style={{ color: token.colorPrimary }} />
                        <span>API Keys</span>
                        <Tooltip title="API keys allow you to authenticate with the API">
                          <InfoCircleOutlined
                            style={{ color: token.colorTextSecondary }}
                          />
                        </Tooltip>
                      </Flex>
                    }
                    extra={
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={showCreateModal}
                        loading={createApiKeyLoading}
                      >
                        Create API Key
                      </Button>
                    }
                  >
                    <Table
                      dataSource={keys}
                      columns={[
                        {
                          title: 'Name',
                          dataIndex: 'name',
                          key: 'name',
                          render: (name, record) => (
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {name || 'Untitled Key'}
                              </div>
                              {record.description && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: token.colorTextSecondary,
                                    marginTop: 4,
                                  }}
                                >
                                  {record.description}
                                </div>
                              )}
                            </div>
                          ),
                        },
                        {
                          title: 'Key',
                          dataIndex: 'token',
                          key: 'token',
                          width: 300,
                          render: (token) => renderApiKeyValue(token),
                        },
                        {
                          title: 'Created',
                          dataIndex: 'created_at',
                          key: 'created_at',
                          width: 200,
                          render: (date) => (
                            <div
                              style={{
                                fontSize: 12,
                                color: token.colorTextSecondary,
                              }}
                            >
                              {new Date(date).toLocaleDateString()}
                            </div>
                          ),
                        },
                        {
                          title: 'Last Used',
                          dataIndex: 'last_used_at',
                          key: 'last_used_at',
                          width: 200,
                          render: (date) => (
                            <div
                              style={{
                                fontSize: 12,
                                color: token.colorTextSecondary,
                              }}
                            >
                              {new Date(date).toLocaleDateString()}
                            </div>
                          ),
                        },
                        {
                          title: 'Actions',
                          key: 'actions',
                          align: 'center',
                          width: 200,
                          render: (_, record) => (
                            <Space>
                              <Popconfirm
                                title="Delete this API key?"
                                description="This action cannot be undone."
                                onConfirm={() => onDelete(record.uuid)}
                                okText="Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                              >
                                <Button danger icon={<DeleteOutlined />}>
                                  Revoke
                                </Button>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                      rowKey="id"
                      pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showTotal: (total, range) =>
                          `${range[0]}-${range[1]} of ${total} items`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                      }}
                      onChange={handleTableChange}
                      loading={getApiKeysLoading}
                    />
                  </Card>
                </>
              ),
            },
            {
              key: 'api-docs',
              label: (
                <p
                  style={{
                    color: isDarkMode ? 'white' : '#222',
                  }}
                >
                  API Documentation
                </p>
              ),
              children: (
                <Card
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${token.colorBorder}`,
                    background: token.colorBgContainer,
                  }}
                >
                  <SwaggerUI spec={spec} />
                </Card>
              ),
            },
          ]}
        />

        <Modal
          title="Create New API Key"
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          onOk={handleCreateOrUpdateKey}
          confirmLoading={createApiKeyLoading}
          width={480}
          footer={[
            <Button key="cancel" onClick={() => setIsModalVisible(false)}>
              Cancel
            </Button>,
            <Button
              key="create"
              type="primary"
              onClick={handleCreateOrUpdateKey}
              loading={createApiKeyLoading}
            >
              Create Key
            </Button>,
          ]}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              name: '',
              description: '',
            }}
          >
            <Form.Item
              name="workflow_uuid"
              label="Select Workflow"
              rules={[{ required: true, message: 'Please select a workflow' }]}
              initialValue={selectedWorkflow}
            >
              <Select
                showSearch
                placeholder="Select a workflow"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
                loading={getWorkflowsLoading}
              >
                {workflows.map((workflow) => (
                  <Select.Option key={workflow.uuid} value={workflow.uuid}>
                    {workflow.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="name"
              label="Key Name"
              rules={[
                { required: true, message: 'Please enter a name for this key' },
              ]}
            >
              <AntdInput placeholder="e.g., Production API Key" />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <AntdInput.TextArea
                rows={3}
                placeholder="Optional: Describe what this key will be used for"
              />
            </Form.Item>

            <Alert
              message="Security Notice"
              description="Please keep your API key secure and never expose it in client-side code or version control. This key provides full access to your workflow."
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Form>
        </Modal>

        <Alert
          message="API Key Security"
          description="Keep your API keys secure and never share them publicly. Use them to authenticate requests to your AI Builder endpoints."
          type="info"
          showIcon
          style={{
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorder}`,
            backgroundColor: token.colorBgContainer,
            color: token.colorText,
            padding: '12px 16px',
          }}
        />
      </Flex>
    </>
  );
}
