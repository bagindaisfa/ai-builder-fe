import React from 'react';
import { Button, List, Avatar, Space, Spin, Typography, Input } from 'antd';
import {
  EyeOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  UserOutlined,
  RobotOutlined,
  DownOutlined,
  RightOutlined,
  MessageOutlined,
  SendOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const { Text } = Typography;

const PreviewPanel = ({
  previewVisible,
  setPreviewVisible,
  clearTestMessages,
  testMessages,
  setTestMessages,
  messagesEndRef,
  isRunning,
  conversationId,
  setConversationId,
  messageApi,
  testInput,
  setTestInput,
  runWorkflowTest,
}) => {
  if (!previewVisible) return null;

  return (
    <div
      style={{
        width: '500px',
        background: '#fff',
        borderLeft: '1px solid #e8e8e8',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e8e8e8',
          background: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EyeOutlined style={{ color: '#1890ff' }} />
          <Text strong>Workflow Preview</Text>
        </div>
        <div>
          <Button
            type="text"
            size="small"
            onClick={clearTestMessages}
            style={{ marginRight: '8px' }}
          >
            Clear
          </Button>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => setPreviewVisible(false)}
          />
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          background: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {testMessages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999',
            }}
          >
            <PlayCircleOutlined
              style={{
                fontSize: '32px',
                marginBottom: '12px',
                display: 'block',
              }}
            />
            <Text type="secondary">
              Test your workflow by sending a message below
            </Text>
          </div>
        ) : (
          <List
            dataSource={testMessages}
            renderItem={(message) => (
              <List.Item style={{ border: 'none', padding: '8px 0' }}>
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent:
                      message.type === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
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
                      size="small"
                      style={{
                        background:
                          message.type === 'user' ? '#1890ff' : '#52c41a',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          background:
                            message.type === 'user' ? '#1890ff' : '#fff',
                          color: message.type === 'user' ? '#fff' : '#333',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          border:
                            message.type === 'assistant'
                              ? '1px solid #f0f0f0'
                              : 'none',
                          fontSize: '13px',
                          lineHeight: '1.4',
                        }}
                      >
                        {message.type === 'assistant' &&
                          message.processSteps && (
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
                                  marginBottom: message.showProcess ? '4px' : 0,
                                  cursor: 'pointer',
                                }}
                                onClick={() => {
                                  setTestMessages((prev) =>
                                    prev.map((msg) =>
                                      msg.id === message.id
                                        ? {
                                            ...msg,
                                            showProcess: !msg.showProcess,
                                          }
                                        : msg
                                    )
                                  );
                                }}
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
                                message.processSteps.map((step, stepIdx) => (
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
                                      <Text strong style={{ fontSize: '11px' }}>
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
                                        <Text type="secondary">Input:</Text>{' '}
                                        {step.input || '-'}
                                      </div>
                                      <div style={{ marginTop: '2px' }}>
                                        <Text type="secondary">Output:</Text>{' '}
                                        {typeof step.output === 'object'
                                          ? JSON.stringify(step.output)
                                          : step.output || '-'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: (props) => (
                              <p style={{ margin: '0.5em 0' }} {...props} />
                            ),
                            strong: (props) => (
                              <strong
                                style={{ fontWeight: 'bold' }}
                                {...props}
                              />
                            ),
                            em: (props) => (
                              <em style={{ fontStyle: 'italic' }} {...props} />
                            ),
                            h1: (props) => (
                              <h1
                                style={{
                                  fontSize: '1.5em',
                                  fontWeight: 'bold',
                                  margin: '0.5em 0',
                                }}
                                {...props}
                              />
                            ),
                            h2: (props) => (
                              <h2
                                style={{
                                  fontSize: '1.3em',
                                  fontWeight: 'bold',
                                  margin: '0.5em 0',
                                }}
                                {...props}
                              />
                            ),
                            h3: (props) => (
                              <h3
                                style={{
                                  fontSize: '1.2em',
                                  fontWeight: 'bold',
                                  margin: '0.5em 0',
                                }}
                                {...props}
                              />
                            ),
                            ul: (props) => (
                              <ul
                                style={{
                                  paddingLeft: '1.5em',
                                  margin: '0.5em 0',
                                }}
                                {...props}
                              />
                            ),
                            ol: (props) => (
                              <ol
                                style={{
                                  paddingLeft: '1.5em',
                                  margin: '0.5em 0',
                                }}
                                {...props}
                              />
                            ),
                            li: (props) => (
                              <li style={{ margin: '0.2em 0' }} {...props} />
                            ),
                            blockquote: (props) => (
                              <blockquote
                                style={{
                                  borderLeft: '4px solid #ddd',
                                  paddingLeft: '1em',
                                  margin: '0.5em 0',
                                }}
                                {...props}
                              />
                            ),
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
                              const codeContent = String(children).replace(
                                /\n$/,
                                ''
                              );

                              // Check if content is JSON
                              const isJson =
                                !inline &&
                                (match?.[1] === 'json' ||
                                  (typeof children === 'string' &&
                                    (children.trim().startsWith('{') ||
                                      children.trim().startsWith('['))));

                              if (isJson) {
                                try {
                                  const jsonContent = JSON.parse(codeContent);
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
                                        {JSON.stringify(jsonContent, null, 2)}
                                      </SyntaxHighlighter>
                                    </div>
                                  );
                                } catch (e) {
                                  // If JSON parsing fails, fall back to regular code block
                                }
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
                            pre: (props) => (
                              <div style={{ margin: '0.5em 0' }} {...props} />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#999',
                          marginTop: '4px',
                          textAlign: message.type === 'user' ? 'right' : 'left',
                          display: 'flex',
                          justifyContent:
                            message.type === 'user' ? 'flex-end' : 'flex-start',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {message.type === 'assistant' &&
                          message.conversationId && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#f0f9ff',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                fontSize: '9px',
                              }}
                            >
                              <MessageOutlined
                                style={{
                                  fontSize: '9px',
                                  color: '#1890ff',
                                }}
                              />
                              <span style={{ color: '#1890ff' }}>
                                {message.conversationId.substring(0, 6)}
                              </span>
                            </div>
                          )}
                        <span>{message.timestamp}</span>
                      </div>
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
        <div ref={messagesEndRef} style={{ float: 'left', clear: 'both' }} />
      </div>

      {/* Test Input Area */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #e8e8e8',
          background: '#fff',
        }}
      >
        {conversationId && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              marginBottom: '12px',
              background: '#f0f9ff',
              borderRadius: '4px',
              border: '1px solid #bae7ff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MessageOutlined style={{ color: '#1890ff' }} />
              <Text style={{ fontSize: '12px', color: '#1890ff' }}>
                Active conversation: {conversationId.substring(0, 8)}...
              </Text>
            </div>
            <Button
              size="small"
              onClick={() => {
                setConversationId(null);
                messageApi.success('Started a new conversation');
              }}
            >
              New Conversation
            </Button>
          </div>
        )}

        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Enter test input..."
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onPressEnter={runWorkflowTest}
            disabled={isRunning}
            style={{
              borderRadius: '6px 0 0 6px',
              fontSize: '13px',
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={runWorkflowTest}
            disabled={isRunning || !testInput.trim()}
            style={{
              borderRadius: '0 6px 6px 0',
            }}
            loading={isRunning}
          >
            Test
          </Button>
        </Space.Compact>
        <Text
          style={{
            fontSize: '11px',
            color: '#999',
            marginTop: '8px',
            display: 'block',
          }}
        >
          {conversationId
            ? 'Continue your conversation or start a new one'
            : 'Test your workflow with sample inputs'}
        </Text>
      </div>
    </div>
  );
};

export default PreviewPanel;
