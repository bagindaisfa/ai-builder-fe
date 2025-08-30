import React, { useEffect, useState } from "react";
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
  Form,
  Divider,
  Tooltip,
  Collapse,
} from "antd";
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
} from "@ant-design/icons";
import {
  getApiKeys,
  createApiKey,
  deleteApiKey,
  updateApiKey,
  getWorkflows,
  getApiContracts,
} from "../api/api";
import GradientCard from "./common/GradientCard";
import { STATIC_API_CONTRACTS } from "../data/StaticApiContracts";

const { Title, Text } = Typography;

// API Key Permissions
const PERMISSIONS = [
  { value: "read", label: "Read" },
  { value: "write", label: "Write" },
  { value: "delete", label: "Delete" },
];

export default function ApiAccessPanel() {
  const [activeTab, setActiveTab] = useState("api-keys");
  const [keys, setKeys] = useState([]);
  const [workflows, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [form] = Form.useForm();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState(["read"]);
  const [apiContracts, setApiContracts] = useState([]);
  const { isDarkMode } = useTheme();
  const { token } = theme.useToken();

  const grouped = STATIC_API_CONTRACTS.reduce((acc, c) => {
    acc[c.category] = acc[c.category] || [];
    acc[c.category].push(c);
    return acc;
  }, {});

  // Fetch workflows and API keys
  const fetchProjects = async () => {
    try {
      const res = await getWorkflows();
      setProjects(res.data || []);
      if (res.data?.length > 0 && !selectedProject) {
        setSelectedProject(res.data[0].id);
      }
    } catch (e) {
      message.error("Failed to load workflows");
    }
  };

  const fetchApiKeys = async () => {
    if (!selectedProject) return;
    try {
      const res = await getApiKeys(selectedProject);
      setKeys(res.data || []);
    } catch (e) {
      message.error("Failed to load API keys");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchApiKeys();
    }
  }, [selectedProject]);

  const showCreateModal = () => {
    setEditingKey(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const showEditModal = (keyData) => {
    setEditingKey(keyData);
    form.setFieldsValue({
      name: keyData.name,
      permissions: keyData.permissions || ["read"],
    });
    setIsModalVisible(true);
  };

  const handleCreateOrUpdateKey = async () => {
    try {
      const values = await form.validateFields();

      if (editingKey) {
        await updateApiKey(editingKey.id, values);
        message.success("API Key updated");
      } else {
        await createApiKey(
          values.name || `key-${Date.now()}`,
          selectedProject,
          values.permissions
        );
        message.success("API Key created");
      }

      setIsModalVisible(false);
      fetchApiKeys();
    } catch (error) {
      console.error("Error saving API key:", error);
      message.error(error.response?.data?.message || "Failed to save API key");
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteApiKey(id);
      message.success("API Key deleted");
      fetchApiKeys();
    } catch (e) {
      message.error("Failed to delete API key");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success("API key copied to clipboard!");
  };

  const renderApiKeyValue = (keyValue) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Text
        code
        style={{
          fontSize: "12px",
          background: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "#f5f5f5",
          padding: "2px 8px",
          borderRadius: 4,
        }}
      >
        {keyValue.length > 12 ? `${keyValue.substring(0, 12)}...` : keyValue}
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

  const renderApiContract = () => {
    return (
      <div>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: 24 }}>
            <Text strong style={{ fontSize: 18 }}>
              {category}
            </Text>

            <Collapse accordion style={{ marginTop: 8 }}>
              {items.map((c) => (
                <Collapse.Panel
                  key={c.path + c.method}
                  header={
                    <Space>
                      <Tag
                        color={
                          c.method === "GET"
                            ? "green"
                            : c.method === "POST"
                            ? "blue"
                            : c.method === "PUT"
                            ? "orange"
                            : c.method === "DELETE"
                            ? "red"
                            : "default"
                        }
                      >
                        {c.method}
                      </Tag>
                      <Text code>{c.path}</Text>
                      <Text type="secondary">{c.description}</Text>
                    </Space>
                  }
                >
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%" }}
                  >
                    {c.authRequired && (
                      <Text type="warning">
                        Authentication: Bearer Token required
                      </Text>
                    )}

                    {c.parameters?.length > 0 && (
                      <div>
                        <Text strong>Parameters:</Text>
                        <ul>
                          {c.parameters.map((p) => (
                            <li key={p.name}>
                              <code>{p.name}</code> ({p.type}){" "}
                              {p.required ? "[Required]" : "[Optional]"} –{" "}
                              {p.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.exampleRequest && (
                      <div>
                        <Text strong>Example Request:</Text>
                        <pre style={{ background: "#f5f5f5", padding: 8 }}>
                          <code>{c.exampleRequest}</code>
                        </pre>
                      </div>
                    )}

                    {c.exampleResponse && (
                      <div>
                        <Text strong>Example Response:</Text>
                        <pre style={{ background: "#f5f5f5", padding: 8 }}>
                          <code>{c.exampleResponse}</code>
                        </pre>
                      </div>
                    )}
                  </Space>
                </Collapse.Panel>
              ))}
            </Collapse>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Flex vertical gap="large" style={{ height: "100%" }}>
      <GradientCard>
        <Flex align="center" gap="middle">
          <ApiOutlined style={{ fontSize: "24px", color: "#fff" }} />
          <Title
            level={4}
            style={{
              margin: 0,
              color: "#fff",
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
            key: "api-keys",
            label: (
              <p
                style={{
                  color: isDarkMode ? "white" : "#222",
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
                  bodyStyle={{ padding: "16px 24px" }}
                >
                  <Flex justify="space-between" align="center">
                    <div>
                      <Title level={5} style={{ margin: 0 }}>
                        Project
                      </Title>
                      <Text type="secondary">
                        Select a project to manage its API keys
                      </Text>
                    </div>
                    <Select
                      value={selectedProject}
                      onChange={setSelectedProject}
                      style={{ width: 300 }}
                      placeholder="Select a project"
                    >
                      {workflows.map((project) => (
                        <Option key={project.id} value={project.id}>
                          {project.name}
                        </Option>
                      ))}
                    </Select>
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
                      disabled={!selectedProject}
                    >
                      Create API Key
                    </Button>
                  }
                >
                  <Table
                    dataSource={keys}
                    columns={[
                      {
                        title: "Name",
                        dataIndex: "name",
                        key: "name",
                        render: (text, record) => (
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {text || "Unnamed Key"}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: token.colorTextSecondary,
                              }}
                            >
                              Created{" "}
                              {new Date(record.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ),
                      },
                      {
                        title: "Key",
                        dataIndex: "key",
                        key: "key",
                        render: (key) => renderApiKeyValue(key),
                      },
                      {
                        title: "Permissions",
                        dataIndex: "permissions",
                        key: "permissions",
                        render: (permissions) => (
                          <Space size={[0, 8]} wrap>
                            {(permissions || []).map((perm) => (
                              <Tag key={perm} color={token.colorPrimary}>
                                {perm}
                              </Tag>
                            ))}
                          </Space>
                        ),
                      },
                      {
                        title: "Actions",
                        key: "actions",
                        align: "right",
                        render: (_, record) => (
                          <Space>
                            <Button
                              icon={<EditOutlined />}
                              onClick={() => showEditModal(record)}
                            >
                              Edit
                            </Button>
                            <Popconfirm
                              title="Delete this API key?"
                              description="This action cannot be undone."
                              onConfirm={() => onDelete(record.id)}
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
                    pagination={false}
                    locale={{
                      emptyText: (
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                          <KeyOutlined
                            style={{
                              fontSize: 32,
                              color: token.colorTextSecondary,
                              marginBottom: 16,
                            }}
                          />
                          <div>No API keys found</div>
                          <div
                            style={{
                              color: token.colorTextTertiary,
                              marginTop: 8,
                            }}
                          >
                            {selectedProject
                              ? "Create your first API key to get started"
                              : "Select a project to view its API keys"}
                          </div>
                        </div>
                      ),
                    }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: "api-docs",
            label: (
              <p
                style={{
                  color: isDarkMode ? "white" : "#222",
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
                <Title
                  level={4}
                  style={{
                    marginBottom: 24,
                    // color: isDarkMode ? "#222" : "white",
                  }}
                >
                  API Reference
                </Title>

                <div style={{ marginBottom: 32 }}>
                  <Title level={5}>Authentication</Title>
                  <Text>
                    Include your API key in the <code>Authorization</code>{" "}
                    header:
                  </Text>
                  <pre
                    style={{
                      background: isDarkMode ? "#1e1e1e" : "#f6f8fa",
                      color: isDarkMode ? "#00ff9d" : "#000",
                      padding: "12px",
                      borderRadius: "6px",
                      overflowX: "auto",
                      marginTop: "8px",
                    }}
                  >
                    <code>{`Authorization: Bearer YOUR_API_KEY`}</code>
                  </pre>
                </div>

                <Divider />

                <Title level={4} style={{ marginBottom: 16 }}>
                  Endpoints
                </Title>

                {STATIC_API_CONTRACTS.length > 0 ? (
                  renderApiContract()
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <CodeOutlined
                      style={{
                        fontSize: 32,
                        color: token.colorTextSecondary,
                        marginBottom: 16,
                      }}
                    />
                    <div>No API contracts available</div>
                    <div
                      style={{ color: token.colorTextTertiary, marginTop: 8 }}
                    >
                      Check back later for API documentation
                    </div>
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={editingKey ? "Edit API Key" : "Create New API Key"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleCreateOrUpdateKey}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: "",
            permissions: ["read"],
          }}
        >
          <Form.Item
            label="Name (optional)"
            name="name"
            extra="Helps you identify this key in the future"
          >
            <Input placeholder="e.g. Production API Key" />
          </Form.Item>

          <Form.Item
            label="Permissions"
            name="permissions"
            rules={[
              {
                required: true,
                message: "Please select at least one permission",
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select permissions"
              optionLabelProp="label"
            >
              {PERMISSIONS.map((perm) => (
                <Option key={perm.value} value={perm.value} label={perm.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <span>{perm.label}</span>
                    <Tag color={token.colorPrimary} style={{ marginRight: 0 }}>
                      {perm.value.toUpperCase()}
                    </Tag>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {editingKey?.key && (
            <Form.Item label="API Key">
              <Input.Password
                value={editingKey.key}
                readOnly
                addonAfter={
                  <Button
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(editingKey.key)}
                  />
                }
              />
              <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                This is the only time you'll be able to see this key. Make sure
                to copy it now.
              </Text>
            </Form.Item>
          )}
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
          padding: "12px 16px",
        }}
      />
    </Flex>
  );
}
