import React, { memo } from 'react';
import { Avatar, Typography } from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  RightOutlined,
  DownOutlined,
  FileOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const { Text } = Typography;

const CodeBlock = ({ language, value }) => (
  <SyntaxHighlighter
    language={language}
    style={vscDarkPlus}
    customStyle={{
      margin: 0,
      borderRadius: '6px',
      fontSize: '0.9em',
      lineHeight: 1.5,
    }}
    showLineNumbers={false}
  >
    {value}
  </SyntaxHighlighter>
);

const MessageContent = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      code({ node, inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match ? (
          <CodeBlock
            language={match[1]}
            value={String(children).replace(/\n$/, '')}
            {...props}
          />
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      a: ({ node, ...props }) => (
        <a {...props} target="_blank" rel="noopener noreferrer" />
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

const ChatMessage = memo(({ message, onToggleProcess }) => {
  const isUser = message.type === 'user';
  const bgColor = isUser ? '#1890ff' : '#fff';
  const textColor = isUser ? '#fff' : '#333';
  const Icon = isUser ? UserOutlined : RobotOutlined;
  const hasProcess =
    !isUser && message.processSteps && message.processSteps.length > 0;

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          gap: '8px',
          maxWidth: '85%',
        }}
      >
        {/* Avatar */}
        <Avatar
          icon={<Icon />}
          size="small"
          style={{
            background: isUser ? '#1890ff' : '#52c41a',
            flexShrink: 0,
          }}
        />

        {/* Bubble + timestamp */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
            gap: '4px',
            maxWidth: '100%',
          }}
        >
          {/* Bubble */}
          <div
            style={{
              background: bgColor,
              color: textColor,
              padding: '8px 12px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: !isUser ? '1px solid #f0f0f0' : 'none',
              fontSize: '13px',
              lineHeight: '1.4',
              wordBreak: 'break-word',
              whiteSpace: 'normal',
            }}
          >
            {hasProcess && (
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
                  onClick={() => onToggleProcess(message.id)}
                >
                  {message.showProcess ? (
                    <DownOutlined
                      style={{ color: '#1890ff', fontSize: '12px' }}
                    />
                  ) : (
                    <RightOutlined
                      style={{ color: '#1890ff', fontSize: '12px' }}
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
            <MessageContent content={message.content} />
            {message.type === 'user' &&
              message.files &&
              message.files.length > 0 && (
                <div
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                  }}
                >
                  {message.files.map((file, fileIndex) => (
                    <div
                      key={fileIndex}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        gap: '4px',
                      }}
                    >
                      {file.icon || <FileOutlined style={{ color: '#fff' }} />}
                      <span>{file.filename || file.original_filename}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Timestamp */}
          <div
            style={{
              fontSize: '10px',
              color: '#999',
              marginTop: '4px',
              textAlign: isUser ? 'right' : 'left',
              display: 'flex',
              justifyContent: isUser ? 'flex-end' : 'flex-start',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {message.type === 'assistant' && message.conversationId && (
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
                  {message.conversationId}
                </span>
              </div>
            )}
            <span>{message.timestamp}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatMessage;
