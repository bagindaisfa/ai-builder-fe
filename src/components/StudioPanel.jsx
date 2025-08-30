import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  List,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  Upload,
  message,
  Tabs,
  Empty,
  Tag,
  Radio,
  Popover,
  Flex,
} from "antd";
import { PlusOutlined, UploadOutlined, CodeOutlined, FolderOutlined, ArrowRightOutlined, PictureOutlined, SmileOutlined, BuildOutlined,UserOutlined } from "@ant-design/icons";
import EmojiPicker from 'emoji-picker-react';

const defaultEmoji = '📁';
import { useNavigate } from "react-router-dom";
import { createWorkflow, getWorkflows, createOrUpdateWorkflow } from "../api/api";
import GradientCard from "../components/common/GradientCard";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const CreateWorkflowModal = ({ visible, onCancel, onCreate }) => {
  const [activeTab, setActiveTab] = useState("blank");
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const idStart = 'start-' + Date.now();
      const idLlm = 'llm-' + (Date.now() + 1);
      const idAnswer = 'answer-' + (Date.now() + 2);

      const payload = {
        name: values.name,
        description: values.description || '',
        nodes: [],
        edges: []
      };

      if (activeTab === "import") {
        if (fileList.length === 0) {
          message.error("Please upload a DSL file");
          return;
        }
        const file = fileList[0].originFileObj;
        const content = await file.text();
        // Parse DSL content and update nodes/edges
        try {
          const dslData = JSON.parse(content);
          payload.nodes = dslData.nodes || [];
          payload.edges = dslData.edges || [];
        } catch (e) {
          message.error("Invalid DSL file format");
          return;
        }
      }

      const newWorkflow = await createOrUpdateWorkflow(payload);
      form.resetFields();
      setFileList([]);
      onCancel();
      // Navigate to the New Workflow
      navigate(`/builder/${newWorkflow.data.uuid}`);
    } catch (error) {
      console.error("Error creating workflow:", error);
      message.error("Failed to create workflow");
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      if (file.type !== "application/json") {
        message.error("You can only upload JSON files!");
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      return false;
    },
    fileList,
  };

  return (
    <Modal
      title="Create New Workflow"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <FolderOutlined /> Start from Blank
            </span>
          }
          key="blank"
        >
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              name="name"
              label="Workflow Name"
              rules={[{ required: true, message: "Please enter Workflow Name" }]}
            >
              <Input placeholder="My Awesome Workflow" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} placeholder="Describe your workflow..." />
            </Form.Item>
            <Form.Item name="iconType" label="Icon Type" initialValue="emoji">
              <Radio.Group>
                <Radio.Button value="emoji"><SmileOutlined /> Emoji</Radio.Button>
                <Radio.Button value="image"><PictureOutlined /> Upload Image</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.iconType !== currentValues.iconType}>
              {({ getFieldValue }) => (
                getFieldValue('iconType') === 'emoji' ? (
                  <Form.Item name="icon" label="Select Emoji" initialValue={defaultEmoji}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: '#f0f7ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        cursor: 'pointer'
                      }}>
                        {form.getFieldValue('icon') || defaultEmoji}
                      </div>
                      <Popover 
                        trigger="click"
                        content={
                          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <EmojiPicker 
                              onEmojiClick={(emojiData) => {
                                form.setFieldValue('icon', emojiData.emoji);
                              }}
                              width={300}
                              height={300}
                              searchPlaceholder="Search emoji"
                            />
                          </div>
                        }
                      >
                        <Button type="default" icon={<SmileOutlined />}>Choose Emoji</Button>
                      </Popover>
                    </div>
                  </Form.Item>
                ) : (
                  <Form.Item 
                    name="iconFile" 
                    label="Upload Icon"
                    valuePropName="fileList"
                    getValueFromEvent={(e) => e && e.fileList}
                    rules={[{ required: true, message: 'Please upload an icon image' }]}
                  >
                    <Upload
                      listType="picture-card"
                      maxCount={1}
                      beforeUpload={(file) => {
                        // Only allow images
                        const isImage = file.type.startsWith('image/');
                        if (!isImage) {
                          message.error('You can only upload image files!');
                          return Upload.LIST_IGNORE;
                        }
                        // Convert to base64 for preview
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => {
                          form.setFieldValue('icon', reader.result);
                        };
                        return false; // Prevent auto upload
                      }}
                      onRemove={() => {
                        form.setFieldValue('icon', '');
                        return true;
                      }}
                    >
                      <div>
                        <PlusOutlined />
                        <div style={{ marginTop: 8 }}>Upload</div>
                      </div>
                    </Upload>
                  </Form.Item>
                )
              )}
            </Form.Item>
          </Form>
        </TabPane>
        <TabPane
          tab={
            <span>
              <CodeOutlined /> Import DSL
            </span>
          }
          key="import"
        >
          <div style={{ marginTop: 16 }}>
            <Form form={form} layout="vertical">
              <Form.Item
                name="name"
                label="Workflow Name"
                rules={[
                  { required: true, message: "Please enter Workflow Name" },
                ]}
              >
                <Input placeholder="My Imported Workflow" />
              </Form.Item>
              <Form.Item label="DSL File (JSON)" required>
                <Upload.Dragger {...uploadProps} accept=".json">
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Click or drag file to upload
                  </p>
                  <p className="ant-upload-hint">
                    Upload a JSON file containing your workflow DSL
                  </p>
                </Upload.Dragger>
              </Form.Item>
            </Form>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

const WorkflowCard = ({ workflow, onSelect }) => {
  const isEmoji = workflow.icon && !workflow.icon.startsWith('data:image');
  
  const renderIcon = () => {
    if (isEmoji) {
      return (
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: '#f0f7ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          flexShrink: 0
        }}>
          {workflow.icon || '📁'}
        </div>
      );
    } else if (workflow.icon) {
      return (
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f7ff',
          flexShrink: 0
        }}>
          <img 
            src={workflow.icon} 
            alt="Workflow icon" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
      );
    }
    
    // Default icon if none is set
    return (
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        backgroundColor: '#f0f7ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        flexShrink: 0
      }}>
        📁
      </div>
    );
  };
  
  return (
    <Card
      hoverable
      style={{ 
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
        border: '1px solid #e6e8f0',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
        }
      }}
      bodyStyle={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: '20px',
        backgroundColor: 'transparent',
        position: 'relative',
        zIndex: 1
      }}
      onClick={() => onSelect(workflow)}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100%',
        height: '4px',
        background: 'linear-gradient(90deg, #277c90, #66a0b8)'
      }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%"
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          marginBottom: '16px',
          paddingTop: '8px'
        }}>
          {renderIcon()}
          <Title level={5} style={{ 
            margin: 0, 
            color: '#1a1a1a',
            fontWeight: 600,
            fontSize: '16px',
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis' 
          }}>
            {workflow.name}
          </Title>
        </div>
        
        <div style={{ 
          flex: 1,
          marginBottom: '16px',
          minHeight: '40px',
          overflow: 'hidden',
          color: '#4b5563',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          <div style={{ 
            marginBottom: '8px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            <Text type="secondary" style={{ fontSize: '13px', margin: 0 }}>
              {workflow.description || "No description provided"}
            </Text>
          </div>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px dashed #f0f0f0'
          }}>
            <UserOutlined style={{ fontSize: '11px' }} />
            <span>Created by {workflow.created_by || "Unknown"}</span>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: '1px solid #f0f0f0'
        }}>
          <Tag color="blue" style={{ margin: 0 }}>{workflow.type || "Workflow"}</Tag>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '8px'
          }}>
            <Text style={{ 
              fontSize: '12px', 
              color: '#6b7280',
              fontWeight: 500
            }}>
              {new Date(workflow.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
            <Button 
              type="text" 
              icon={<ArrowRightOutlined style={{ 
                color: '#6b7280',
                fontSize: '14px'
              }} />} 
              style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 'auto'
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

const StudioPanel = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await getWorkflows();
      setWorkflows(response.data || []);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      message.error("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (values) => {
    try {
      const newWorkflow = await createWorkflow({
        name: values.name,
        description: values.description || "",
        type: "workflow",
        // Add DSL content if importing
        ...(values.dslContent && { dslContent: values.dslContent }),
        // Let backend create default nodes and edges
      });

      message.success("Workflow created successfully!");
      fetchWorkflows();
      // Navigate to the New Workflow
      navigate(`/builder/${newWorkflow.data.uuid}`);
    } catch (error) {
      console.error("Error creating workflow:", error);
      message.error("Failed to create workflow");
    }
  };

  const handleWorkflowSelect = (workflow) => {
    navigate(`/builder/${workflow.uuid}`);
  };

  return (
    <Flex vertical gap="large" style={{ height: "100%" }}>
      <GradientCard>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Flex align="center" gap="middle">
            <BuildOutlined style={{ fontSize: "24px", color: "#fff" }} />
            <div>
              <Title level={3} style={{ margin: 0, color: "#fff", fontFamily: "'Montserrat', sans-serif" }}>
                Studio
              </Title>
              <Text style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                Create and manage your studio workflows
              </Text>
            </div>
          </Flex>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            New Workflow
          </Button>
        </div>
      </GradientCard>

      <div style={{ marginTop: 24 }}>
        {loading ? (
          <Card loading={loading} />
        ) : Array.isArray(workflows) && workflows.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
            padding: '8px'
          }}>
            {workflows.map((workflow) => (
              <WorkflowCard 
                key={workflow.uuid} 
                workflow={workflow} 
                onSelect={handleWorkflowSelect} 
              />
            ))}
          </div>
        ) : (
          <Card>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  No workflows found. Create your first workflow to get started.
                </span>
              }
            />
          </Card>
        )}
      </div>

      <CreateWorkflowModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onCreate={handleCreateWorkflow}
      />
    </Flex>
  );
};

export default StudioPanel;
