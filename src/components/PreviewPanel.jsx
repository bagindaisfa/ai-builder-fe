import React, { useState, useEffect, useRef } from 'react';
import { debounce } from 'lodash';
import {
  Input,
  Button,
  List,
  message,
  Card,
  Typography,
  Avatar,
  Select,
  Badge,
  Tag,
  Flex,
  Space,
  Spin,
  Pagination,
  ConfigProvider,
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  RobotOutlined,
  MessageOutlined,
  ProjectOutlined,
  CodeOutlined,
  DownOutlined,
  RightOutlined,
  UploadOutlined,
  CloseCircleFilled,
  LeftOutlined,
  FileImageOutlined,
  FileOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  getWorkflowOptions,
  getConversations,
  getConversation,
  executeWorkflow,
  fileUpload,
} from '../api/api';
import GradientCard from './common/GradientCard';
import MultimodalErrorDisplay from './MultimodalErrorDisplay';
import ImagePreview from './ImagePreview';
import './PreviewPanel.css';

const { Title, Text } = Typography;

export default function PreviewPanel() {
  const [messageApi, contextHolder] = message.useMessage();
  const currentInputRef = useRef(null);

  // Selection & conversations
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const [convPagination, setConvPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });
  const [view, setView] = useState('list'); // 'list' | 'chat'

  // Chat room state
  const [testInput, setTestInput] = useState('');
  const [testMessages, setTestMessages] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [workflowError, setWorkflowError] = useState(null);
  const messagesEndRef = useRef(null);

  // Mock workflows data - in real app, this would come from API
  const [workflows, setWorkflows] = useState([]);
  const [getWorkflowsLoading, setGetWorkflowsLoading] = useState(false);

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

  useEffect(() => {
    fetchWorkflows();
  }, []);

  // Conversations fetching
  const fetchConversations = async (
    page = 1,
    pageSize = 5,
    keyword = convSearch
  ) => {
    if (!selectedWorkflow) return;
    try {
      setConversationsLoading(true);
      const params = { page, per_page: pageSize };
      if (keyword) params.keyword = keyword;
      const res = await getConversations(selectedWorkflow, params);
      setConversations(res.data?.items || []);
      setConvPagination({
        current: res.data?.meta?.current_page || page,
        pageSize: res.data?.meta?.per_page || pageSize,
        total: res.data?.meta?.total || 0,
      });
    } catch (e) {
      console.error('Failed to load conversations', e);
      messageApi.error('Failed to load conversations');
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  };

  useEffect(() => {
    // Reset conversations and chat when workflow changes
    setConversations([]);
    setConvPagination((p) => ({ ...p, current: 1, total: 0 }));
    setConversationId(null);
    setTestMessages([]);
    setView('list');
    if (selectedWorkflow) {
      fetchConversations(1, convPagination.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkflow]);

  const debouncedSearch = useRef(
    debounce((value) => {
      setConvSearch(value);
      fetchConversations(1, convPagination.pageSize, value || '');
    }, 500)
  ).current;

  // Chat helpers
  const appendMessage = (msg) => setTestMessages((prev) => [...prev, msg]);

  const runWorkflowTest = async () => {
    if (!testInput.trim() || !selectedWorkflow) return;
    // Ensure we are in chat view when sending a new message
    if (view !== 'chat') setView('chat');
    setIsRunning(true);
    // Clear any previous errors
    setWorkflowError(null);
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: testInput,
      timestamp: new Date().toLocaleTimeString(),
      files: uploadedFiles.length > 0 ? uploadedFiles.map(f => f.filename || f.name).join(', ') : null
    };
    appendMessage(userMessage);
    const inputToSend = testInput;
    setTestInput('');

    try {
      const response = await executeWorkflow(
        selectedWorkflow,
        inputToSend,
        conversationId,
        uploadedFiles
      );
      const result = response.data?.result || {};
      const newConversationId = result.conversation_id;
      if (newConversationId) setConversationId(newConversationId);

      const botMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: result.result || 'Workflow executed successfully',
        processSteps: result.process_steps || [],
        showProcess: false,
        timestamp: new Date().toLocaleTimeString(),
        conversationId: newConversationId || conversationId,
      };
      appendMessage(botMessage);
    } catch (error) {
      console.error('Error executing workflow:', error);
      
      // Extract error message
      const errorMessage = error.response?.data?.message || error.message;
      
      // Check if this is a multimodal error
      const isMultimodalError = errorMessage && (
        errorMessage.includes('multimodal') ||
        errorMessage.includes('image') ||
        errorMessage.includes('model') ||
        (errorMessage.includes('LLM') && uploadedFiles.length > 0)
      );
      
      // Set the error for display
      setWorkflowError({
        message: errorMessage,
        nodeId: error.response?.data?.node_id || null,
        isMultimodal: isMultimodalError
      });
      
      // Show error message
      messageApi.error(
        'Failed to execute workflow: ' + errorMessage
      );
      
      // Add error message to chat
      appendMessage({
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Failed to execute workflow: ' + errorMessage,
        timestamp: new Date().toLocaleTimeString(),
        error: true
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-scroll to the bottom whenever messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      } catch {}
    }
  }, [testMessages]);

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedWorkflow) return;
    
    // Validate files - allow text files and images
    const validTextTypes = ['text/plain'];
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    const validTextExtensions = ['.txt', '.text'];
    const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    
    // Combine valid types and extensions
    const validTypes = [...validTextTypes, ...validImageTypes];
    const validExtensions = [...validTextExtensions, ...validImageExtensions];
    
    const invalidFiles = Array.from(files).filter(file => {
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      return !validTypes.includes(file.type) && !validExtensions.includes(fileExt);
    });
    
    if (invalidFiles.length > 0) {
      messageApi.error(`Only text and image files are supported. ${invalidFiles.length} invalid file(s) rejected.`);
      // Reset the file input
      if (event.target) {
        event.target.value = '';
      }
      return;
    }
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fileUpload(selectedWorkflow, formData, headers);
      const result = res.data;
      
      // Detect file types, especially images
      const getFileType = (filename) => {
        if (!filename) return 'unknown';
        const ext = filename.split('.').pop().toLowerCase();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'];
        return imageExts.includes(ext) ? 'image' : 'document';
      };
      
      const filesWithMeta = (result.files || []).map((file) => {
        const filename = file.filename || file.name;
        const fileType = getFileType(filename);
        return {
          ...file,
          fileType,
          icon: fileType === 'image' ? <FileImageOutlined /> : <FileOutlined />
        };
      });
      
      setUploadedFiles((prev) => [...prev, ...filesWithMeta]);

      // Update input field text to show filenames
      const input = document.getElementById('chat-message');
      if (input) {
        input.value = filesWithMeta.map((f) => f.filename || f.name).join(', ');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (error) {
      console.error('File upload error:', error);
      messageApi.error(
        'Failed to upload files: ' + (error.message || 'Unknown error')
      );
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const removeUploadedFile = (index) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
    const input = document.getElementById('chat-message');
    if (input) {
      input.value = newFiles.map((f) => f.filename || f.name).join(', ');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  // Load selected conversation history
  const openConversation = async (convId) => {
    try {
      const res = await getConversation(convId);
      // Attempt to map messages; support common shapes
      const items = res.data?.messages || res.data?.items || [];
      const mapped = items.map((m, i) => ({
        id: m.id || i,
        type: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || m.text || '',
        processSteps: m.process_steps || [],
        showProcess: false,
        timestamp: m.timestamp
          ? new Date(m.timestamp).toLocaleTimeString()
          : '',
        conversationId: res.data?.conversation_id || convId,
      }));
      setTestMessages(mapped);
      setConversationId(res.data?.conversation_id || convId);
      setView('chat');
      // Scroll to bottom
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (e) {
      console.error('Failed to open conversation', e);
      messageApi.error('Failed to open conversation');
    }
  };

  const clearTestMessages = () => {
    setTestMessages([]);
    setConversationId(null); // Reset conversation ID when clearing messages
    messageApi.success('Started a new conversation');
  };

  return (
    <>
      {contextHolder}
      <ConfigProvider getPopupContainer={() => document.body}>
        <Flex
          vertical
          gap="large"
          style={{
            height: '100%',
            overflow: 'auto',
          }}
        >
          {/* 1) Header with workflow selector */}
          <GradientCard
            style={{
              overflow: 'visible',
              zIndex: 1000,
            }}
            bodyStyle={{ overflow: 'visible' }}
          >
            <Flex vertical gap="large">
              <Flex align="center" gap="middle">
                <Flex
                  align="center"
                  justify="center"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                >
                  <MessageOutlined
                    style={{ fontSize: '24px', color: '#fff' }}
                  />
                </Flex>
                <Flex vertical>
                  <Title
                    level={3}
                    style={{
                      margin: 0,
                      color: '#fff',
                      fontWeight: '600',
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    Conversations Preview
                  </Title>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '14px',
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    Select a workflow, pick a conversation, and continue
                    chatting
                  </Text>
                </Flex>
              </Flex>
              <Select
                placeholder="🔍 Select a workflow"
                value={selectedWorkflow}
                onChange={(val) => setSelectedWorkflow(val || null)}
                style={{
                  width: '100%',
                  fontFamily: "'Montserrat', sans-serif",
                }}
                size="large"
                dropdownStyle={{
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  zIndex: 1001,
                  fontFamily: "'Montserrat', sans-serif",
                }}
                getPopupContainer={(triggerNode) => triggerNode.parentNode}
                loading={getWorkflowsLoading}
              >
                {workflows.map((wf) => (
                  <Select.Option key={wf.uuid} value={wf.uuid}>
                    <Flex
                      justify="space-between"
                      align="center"
                      style={{ padding: '8px 0' }}
                    >
                      <Flex vertical style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: '16px',
                            fontWeight: '500',
                            color: '#374151',
                            fontFamily: "'Montserrat', sans-serif",
                          }}
                        >
                          {wf.name}
                        </Text>
                      </Flex>
                      {wf.status && (
                        <Badge
                          status={
                            wf.status === 'deployed' ? 'success' : 'processing'
                          }
                          text={wf.status === 'deployed' ? 'Live' : 'Draft'}
                        />
                      )}
                    </Flex>
                  </Select.Option>
                ))}
              </Select>
            </Flex>
          </GradientCard>

          {/* 2) Conversations list */}
          {selectedWorkflow && view === 'list' && (
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e1e7ef',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              }}
              bodyStyle={{ padding: '16px 20px' }}
            >
              <Flex
                align="center"
                justify="space-between"
                style={{ marginBottom: 12 }}
              >
                <Flex align="center" gap="small">
                  <ProjectOutlined style={{ color: '#277c90' }} />
                  <Title level={5} style={{ margin: 0 }}>
                    Conversations
                  </Title>
                </Flex>
                <Input.Search
                  placeholder="Search conversations..."
                  allowClear
                  onChange={(e) => {
                    const v = e.target.value;
                    setConvSearch(v);
                    debouncedSearch(v);
                  }}
                  style={{ width: 280 }}
                />
              </Flex>

              <List
                loading={conversationsLoading}
                dataSource={conversations}
                locale={{ emptyText: 'No conversations yet' }}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => openConversation(item.uuid || item.id)}
                    actions={[
                      <span key="updated">
                        {item.updated_at
                          ? new Date(item.updated_at).toLocaleString()
                          : ''}
                      </span>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<MessageOutlined />} />}
                      title={item.title || (item.uuid || '').slice(0, 8)}
                      description={
                        item.preview || item.last_message || 'Conversation'
                      }
                    />
                  </List.Item>
                )}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: 12,
                }}
              >
                <Pagination
                  current={convPagination.current}
                  pageSize={convPagination.pageSize}
                  total={convPagination.total}
                  showSizeChanger
                  onChange={(page, pageSize) =>
                    fetchConversations(page, pageSize)
                  }
                />
              </div>
            </Card>
          )}

          {/* No workflow selected state */}
          {!selectedWorkflow && (
            <Card
              style={{
                flex: 1,
                borderRadius: '16px',
                border: '2px dashed #e1e7ef',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              }}
              bodyStyle={{
                padding: '60px 40px',
              }}
            >
              <Flex
                vertical
                align="center"
                style={{
                  textAlign: 'center',
                  maxWidth: '400px',
                  margin: '0 auto',
                }}
              >
                <Flex
                  align="center"
                  justify="center"
                  style={{
                    background:
                      'linear-gradient(135deg, #277c90 0%, #66a0b8 100%)',
                    borderRadius: '20px',
                    padding: '20px',
                    marginBottom: '24px',
                  }}
                >
                  <ProjectOutlined
                    style={{ fontSize: '48px', color: '#fff' }}
                  />
                </Flex>
                <Title
                  level={4}
                  style={{
                    color: '#1f2937',
                    marginBottom: '8px',
                    fontWeight: '600',
                  }}
                >
                  No Workflow Selected
                </Title>
                <Text
                  style={{
                    color: '#6b7280',
                    fontSize: '16px',
                    lineHeight: '1.6',
                  }}
                >
                  Choose a workflow from the dropdown above to view
                  conversations
                </Text>
                <Flex
                  style={{
                    marginTop: '24px',
                    padding: '16px',
                    background: '#f0f9ff',
                    borderRadius: '12px',
                    border: '1px solid #bae6fd',
                  }}
                >
                  <Text style={{ color: '#0369a1', fontSize: '14px' }}>
                    💡 <strong>Tip:</strong> Each workflow maintains its own
                    conversation history
                  </Text>
                </Flex>
              </Flex>
            </Card>
          )}

          {/* 3) Chat room based on selected workflow and conversation */}
          {selectedWorkflow && view === 'chat' && (
            <Card
              style={{
                marginBottom: '16px',
                borderRadius: '16px',
                border: '1px solid #e1e7ef',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                background: '#ffffff',
              }}
              bodyStyle={{ padding: 0 }}
            >
              {/* Chat Header */}
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #f0f0f0',
                  background:
                    'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <Button
                    type="link"
                    icon={<LeftOutlined />}
                    onClick={() => setView('list')}
                    style={{ paddingLeft: 0 }}
                  >
                    Back
                  </Button>
                  <div
                    style={{
                      background: '#10b981',
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RobotOutlined
                      style={{ fontSize: '16px', color: '#fff' }}
                    />
                  </div>
                  <div>
                    <Title
                      level={5}
                      style={{
                        margin: 0,
                        color: '#1f2937',
                        fontWeight: '600',
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    >
                      Chat Room
                    </Title>
                    <Text
                      style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    >
                      {conversationId
                        ? `Continue conversation • ${String(
                            conversationId
                          )}`
                        : 'Start a new conversation'}
                    </Text>
                  </div>
                </div>
              </div>

              {/* Error display for multimodal errors */}
              {workflowError && workflowError.isMultimodal && (
                <div style={{ padding: '16px 16px 0 16px' }}>
                  <MultimodalErrorDisplay 
                    error={workflowError.message} 
                    nodeId={workflowError.nodeId} 
                  />
                </div>
              )}
              
              {/* Messages area */}
              <div
                style={{
                  padding: '16px',
                  background: '#f8fafc',
                  minHeight: '400px',
                  maxHeight: '600px',
                  overflowY: 'auto',
                }}
              >
                {testMessages.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '80px 20px',
                      color: '#6b7280',
                    }}
                  >
                    <div
                      style={{
                        background:
                          'linear-gradient(135deg, #277c90 0%, #66a0b8 100%)',
                        borderRadius: '20px',
                        padding: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '24px',
                      }}
                    >
                      <RobotOutlined
                        style={{ fontSize: '48px', color: '#fff' }}
                      />
                    </div>
                    <Title
                      level={4}
                      style={{
                        color: '#1f2937',
                        marginBottom: '8px',
                        fontWeight: '600',
                      }}
                    >
                      Start Chatting
                    </Title>
                    <Text
                      style={{
                        color: '#6b7280',
                        fontSize: '16px',
                        lineHeight: '1.6',
                      }}
                    >
                      Send a message below to test your AI workflow
                    </Text>
                  </div>
                ) : (
                  <List
                    dataSource={testMessages}
                    renderItem={(message) => (
                      <List.Item style={{ border: 'none', padding: '12px 0' }}>
                        <div
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent:
                              message.type === 'user'
                                ? 'flex-end'
                                : 'flex-start',
                          }}
                        >
                          <div
                            style={{
                              maxWidth: '80%',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              flexDirection:
                                message.type === 'user' ? 'row-reverse' : 'row',
                            }}
                          >
                            <Avatar
                              icon={
                                message.type === 'user' ? (
                                  <UserOutlined />
                                ) : (
                                  <RobotOutlined />
                                )
                              }
                              style={{
                                background:
                                  message.type === 'user'
                                    ? 'linear-gradient(135deg, #277c90 0%, #66a0b8 100%)'
                                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                flexShrink: 0,
                                border: '2px solid #fff',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              }}
                              size={32}
                            />
                            <div
                              style={{
                                background:
                                  message.type === 'user'
                                    ? 'linear-gradient(135deg, #277c90 0%, #66a0b8 100%)'
                                    : '#ffffff',
                                color:
                                  message.type === 'user' ? '#fff' : '#1f2937',
                                padding: '16px 20px',
                                borderRadius:
                                  message.type === 'user'
                                    ? '20px 20px 6px 20px'
                                    : '20px 20px 20px 6px',
                                boxShadow:
                                  message.type === 'user'
                                    ? '0 4px 16px rgba(102, 126, 234, 0.3)'
                                    : '0 4px 16px rgba(0, 0, 0, 0.1)',
                                fontSize: '15px',
                                lineHeight: '1.5',
                                wordBreak: 'break-word',
                                border:
                                  message.type === 'user'
                                    ? 'none'
                                    : '1px solid #e5e7eb',
                              }}
                            >
                              {message.type === 'assistant' &&
                                message.processSteps &&
                                message.processSteps.length > 0 && (
                                  <div
                                    style={{
                                      marginBottom: '8px',
                                      background: '#f0f9ff',
                                      padding: '8px',
                                      borderRadius: '8px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: message.showProcess
                                          ? '4px'
                                          : 0,
                                        cursor: 'pointer',
                                      }}
                                      onClick={() =>
                                        setTestMessages((prev) =>
                                          prev.map((msg) =>
                                            msg.id === message.id
                                              ? {
                                                  ...msg,
                                                  showProcess: !msg.showProcess,
                                                }
                                              : msg
                                          )
                                        )
                                      }
                                    >
                                      {message.showProcess ? (
                                        <DownOutlined
                                          style={{
                                            color: '#1890ff',
                                            fontSize: '12px',
                                          }}
                                        />
                                      ) : (
                                        <RightOutlined
                                          style={{
                                            color: '#1890ff',
                                            fontSize: '12px',
                                          }}
                                        />
                                      )}
                                      <Text strong style={{ fontSize: '12px' }}>
                                        Workflow Process
                                      </Text>
                                      <Text
                                        type="secondary"
                                        style={{
                                          fontSize: '11px',
                                          marginLeft: 'auto',
                                        }}
                                      >
                                        {message.processSteps.length} steps
                                      </Text>
                                    </div>
                                    {message.showProcess &&
                                      message.processSteps.map(
                                        (step, stepIdx) => (
                                          <div
                                            key={stepIdx}
                                            style={{
                                              marginTop: '8px',
                                              padding: '8px',
                                              background: '#fff',
                                              borderRadius: '4px',
                                              border: '1px solid #e8e8f0',
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '4px',
                                              }}
                                            >
                                              <div
                                                style={{
                                                  width: '6px',
                                                  height: '6px',
                                                  borderRadius: '50%',
                                                  background:
                                                    step.status === 'completed'
                                                      ? '#52c41a'
                                                      : '#1890ff',
                                                }}
                                              />
                                              <Text
                                                strong
                                                style={{ fontSize: '11px' }}
                                              >
                                                {step.label} ({step.type})
                                              </Text>
                                              <Text
                                                type="secondary"
                                                style={{
                                                  fontSize: '11px',
                                                  marginLeft: 'auto',
                                                }}
                                              >
                                                {step.time}ms
                                              </Text>
                                            </div>
                                            <div
                                              style={{
                                                fontSize: '11px',
                                                color: '#666',
                                                marginTop: '4px',
                                              }}
                                            >
                                              <div>
                                                <Text type="secondary">
                                                  Input:
                                                </Text>{' '}
                                                {step.input || '-'}
                                              </div>
                                              <div style={{ marginTop: '2px' }}>
                                                <Text type="secondary">
                                                  Output:
                                                </Text>{' '}
                                                {typeof step.output === 'object'
                                                  ? JSON.stringify(step.output)
                                                  : step.output || '-'}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      )}
                                  </div>
                                )}
                                {/* Show image indicator if message has files */}
                                {message.files && (
                                  <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    gap: '6px',
                                    padding: '6px 10px',
                                    background: message.type === 'user' ? 'rgba(255, 255, 255, 0.2)' : '#f0f7ff',
                                    borderRadius: '6px',
                                    marginBottom: '8px',
                                    fontSize: '12px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <FileImageOutlined style={{ 
                                        color: message.type === 'user' ? '#fff' : '#1890ff' 
                                      }} />
                                      <span>Included file(s):</span>
                                    </div>
                                    
                                    {/* Display files with icons based on type */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                      {Array.isArray(message.files) ? (
                                        message.files.map((file, idx) => {
                                          const isImage = file.fileType === 'image' || (file.mime_type && file.mime_type.startsWith('image/'));
                                          return (
                                            <div key={idx} style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              background: isImage ? '#e6f7ff' : '#f5f5f5',
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              border: isImage ? '1px solid #91d5ff' : 'none',
                                              color: message.type === 'user' ? '#fff' : '#333'
                                            }}>
                                              {isImage ? 
                                                <FileImageOutlined style={{ marginRight: '4px', color: message.type === 'user' ? '#fff' : '#1890ff' }} /> : 
                                                <FileOutlined style={{ marginRight: '4px' }} />
                                              }
                                              <span>{file.filename || file.name}</span>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <span>{message.files}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    p({ children }) {
                                      return (
                                        <div style={{ margin: '0.5em 0' }}>
                                          {children}
                                        </div>
                                      );
                                    },
                                  code({
                                    node,
                                    inline,
                                    className,
                                    children,
                                    ...props
                                  }) {
                                    const match = /language-(\w+)/.exec(
                                      className || ''
                                    );
                                    const codeContent = String(
                                      children
                                    ).replace(/\n$/, '');
                                    const isJson =
                                      !inline &&
                                      (match?.[1] === 'json' ||
                                        (typeof children === 'string' &&
                                          (children.trim().startsWith('{') ||
                                            children.trim().startsWith('['))));
                                    if (isJson) {
                                      try {
                                        const jsonContent =
                                          JSON.parse(codeContent);
                                        return (
                                          <div style={{ margin: '0.5em 0' }}>
                                            <SyntaxHighlighter
                                              language="json"
                                              style={vscDarkPlus}
                                              customStyle={{
                                                margin: 0,
                                                borderRadius: '4px',
                                                fontSize: '0.9em',
                                                maxHeight: '400px',
                                                overflow: 'auto',
                                                backgroundColor: '#1e1e1e',
                                              }}
                                            >
                                              {JSON.stringify(
                                                jsonContent,
                                                null,
                                                2
                                              )}
                                            </SyntaxHighlighter>
                                          </div>
                                        );
                                      } catch (e) {}
                                    }
                                    return !inline ? (
                                      <div style={{ margin: '0.5em 0' }}>
                                        <SyntaxHighlighter
                                          language={match?.[1] || 'text'}
                                          style={vscDarkPlus}
                                          customStyle={{
                                            margin: 0,
                                            borderRadius: '4px',
                                            fontSize: '0.9em',
                                            maxHeight: '400px',
                                            overflow: 'auto',
                                            backgroundColor: '#1e1e1e',
                                          }}
                                        >
                                          {codeContent}
                                        </SyntaxHighlighter>
                                      </div>
                                    ) : (
                                      <code
                                        className={className}
                                        style={{
                                          backgroundColor: '#f0f0f0',
                                          padding: '0.2em 0.4em',
                                          borderRadius: '3px',
                                        }}
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    );
                                  },
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
                {isRunning && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      background: '#fff',
                      borderRadius: '12px',
                      marginTop: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <Avatar
                      icon={<RobotOutlined />}
                      size="small"
                      style={{ background: '#52c41a' }}
                    />
                    <Spin size="small" />
                    <Text style={{ fontSize: '13px', color: '#666' }}>
                      Processing workflow...
                    </Text>
                  </div>
                )}
                <div
                  ref={messagesEndRef}
                  style={{ float: 'left', clear: 'both' }}
                />
              </div>

              {/* Enhanced Input Area */}
              <div
                style={{
                  padding: '16px',
                  borderTop: '1px solid #e5e7eb',
                  background:
                    'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Space.Compact style={{ width: '100%' }}>
                      <div
                        style={{ position: 'relative', flex: 1, margin: '8px' }}
                      >
                        <Input
                          id="chat-message"
                          ref={currentInputRef}
                          placeholder={
                            uploadedFiles.length > 0
                              ? 'Type a message...'
                              : 'Enter test input...'
                          }
                          value={testInput}
                          onChange={(e) => {
                            setTestInput(e.target.value);
                          }}
                          onPressEnter={runWorkflowTest}
                          disabled={isRunning}
                          style={{ paddingRight: 40 }}
                        />
                        <div className="variable-trigger">
                          <CodeOutlined />
                        </div>
                      </div>

                      <Button
                        type="default"
                        icon={<UploadOutlined />}
                        onClick={() =>
                          document.getElementById('file-upload')?.click()
                        }
                        loading={isUploading}
                        style={{ margin: '8px' }}
                      >
                        <input
                          id="file-upload"
                          type="file"
                          style={{ display: 'none' }}
                          onChange={handleFileUpload}
                          accept=".txt,.text,text/plain,.jpg,.jpeg,.png,.gif,.webp,.bmp,image/jpeg,image/png,image/gif,image/webp,image/bmp"
                          multiple
                        />
                      </Button>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={runWorkflowTest}
                        loading={isRunning}
                        disabled={!testInput.trim()}
                        style={{
                          margin: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Test
                      </Button>
                    </Space.Compact>
                  </div>
                </div>
                <Text
                  style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    marginTop: '12px',
                    display: 'block',
                    textAlign: 'center',
                  }}
                >
                  {conversationId
                    ? 'Continue your conversation'
                    : 'Test your workflow with sample inputs'}
                </Text>
                {uploadedFiles.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      justifyContent: 'center',
                      marginTop: 8,
                    }}
                  >
                    {uploadedFiles.map((file, idx) => {
                      const isImage = file.fileType === 'image';
                      const filename = file.filename || file.name;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: isImage ? '#e6f7ff' : '#f0f0f0',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 12,
                            gap: 4,
                            border: isImage ? '1px solid #91d5ff' : 'none',
                          }}
                        >
                          {file.icon || (isImage ? <FileImageOutlined style={{ color: '#1890ff' }} /> : <FileOutlined />)}
                          <span style={{ marginLeft: 4 }}>{filename}</span>
                          
                          {/* Add preview button for images */}
                          {isImage && (
                            <ImagePreview 
                              filename={filename}
                              path={file.path}
                              url={file.url}
                            />
                          )}
                          
                          <CloseCircleFilled
                            style={{
                              fontSize: 12,
                              color: '#999',
                              cursor: 'pointer',
                            }}
                            onClick={() => removeUploadedFile(idx)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}
        </Flex>
      </ConfigProvider>
    </>
  );
}
