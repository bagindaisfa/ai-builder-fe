import React, { useState, useEffect } from 'react';
import { Typography, Divider, Input, Button, Checkbox, Slider } from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import VariableSelector from '../VariableSelector';

const { Title, Text } = Typography;

const AgentNode = ({ workflowId, selectedNode, updateNodeData }) => {
  const [systemPrompt, setSystemPrompt] = useState(
    selectedNode?.data?.settings?.systemPrompt || ''
  );
  const [userPrompt, setUserPrompt] = useState(
    selectedNode.data.settings?.userPrompt || ''
  );

  useEffect(() => {
    setSystemPrompt(selectedNode.data.settings?.systemPrompt || '');
  }, [selectedNode?.id]);

  if (!selectedNode) return null;

  return (
    <div>
      <Title level={5} style={{ marginBottom: '16px', color: '#262626' }}>
        Configuration
      </Title>

      {/* System Prompt */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <Text strong>System Prompt</Text>
          <VariableSelector
            workflowUuid={workflowId}
            currentNodeId={selectedNode.id}
            onSelect={(variable) => {
              const currentValue =
                selectedNode.data.settings?.systemPrompt || '';
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  systemPrompt: currentValue + variable,
                },
              });
            }}
          >
            <Button size="small" icon={<CodeOutlined />}>
              Insert Variable
            </Button>
          </VariableSelector>
        </div>
        <Input.TextArea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          onBlur={() =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...selectedNode.data.settings,
                systemPrompt: systemPrompt,
              },
            })
          }
          placeholder="Enter system prompt"
          rows={4}
        />
      </div>

      {/* User Prompt */}
      <div style={{ marginTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <Text strong>User Prompt</Text>
          <VariableSelector
            workflowUuid={workflowId}
            currentNodeId={selectedNode.id}
            onSelect={(variable) => {
              const currentValue = selectedNode.data.settings?.userPrompt || '';
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  userPrompt: currentValue + variable,
                },
              });
            }}
          >
            <Button size="small" icon={<CodeOutlined />}>
              Insert Variable
            </Button>
          </VariableSelector>
        </div>
        <Input.TextArea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          onBlur={() =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...selectedNode.data.settings,
                userPrompt: userPrompt,
              },
            })
          }
          placeholder="Enter user prompt template"
          rows={4}
        />
      </div>

      {/* Tools */}
      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <Text strong style={{ display: 'block', marginBottom: '8px' }}>
          Available Tools
        </Text>
        <div
          style={{
            background: '#f9f9f9',
            padding: '12px',
            borderRadius: '4px',
          }}
        >
          <Checkbox.Group
            value={
              selectedNode.data.settings?.selectedTools || [
                'search',
                'calculator',
              ]
            }
            onChange={(values) =>
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  selectedTools: values,
                },
              })
            }
          >
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <Checkbox value="search">
                <Text strong>Search</Text>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  Search for information on the internet
                </div>
              </Checkbox>
              <Checkbox value="calculator">
                <Text strong>Calculator</Text>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  Perform mathematical calculations
                </div>
              </Checkbox>
              <Checkbox value="database">
                <Text strong>Database</Text>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  Query databases and retrieve information
                </div>
              </Checkbox>
            </div>
          </Checkbox.Group>
        </div>
      </div>

      {/* Database Config */}
      {selectedNode.data.settings?.selectedTools?.includes('database') && (
        <div style={{ marginTop: '16px', marginBottom: '16px' }}>
          <Divider orientation="left">
            <Text strong>Database Configuration</Text>
          </Divider>

          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Connection Name
            </Text>
            <Input
              value={
                selectedNode.data.settings?.dbConnectionName ||
                'Default Connection'
              }
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  settings: {
                    ...selectedNode.data.settings,
                    dbConnectionName: e.target.value,
                  },
                })
              }
              placeholder="Enter connection name"
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Connection String
            </Text>
            <Input.Password
              value={
                selectedNode.data.settings?.dbConnectionString ||
                'postgresql://postgres:postgres@localhost:5432/postgres'
              }
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  settings: {
                    ...selectedNode.data.settings,
                    dbConnectionString: e.target.value,
                  },
                })
              }
              placeholder="postgresql://username:password@host:port/database"
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Connection ID
            </Text>
            <Input
              value={selectedNode.data.settings?.dbConnectionId || 'default'}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  settings: {
                    ...selectedNode.data.settings,
                    dbConnectionId: e.target.value,
                  },
                })
              }
              placeholder="Enter connection ID"
            />
          </div>
        </div>
      )}

      {/* Model Config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            LLM Base URL
          </Text>
          <Input
            value={
              selectedNode.data.settings?.ollamaBaseUrl ||
              'http://localhost:11434'
            }
            onChange={(e) =>
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  ollamaBaseUrl: e.target.value,
                },
              })
            }
            placeholder="http://localhost:11434"
          />
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            Model
          </Text>
          <Input
            value={selectedNode.data.settings?.model || 'llama2'}
            onChange={(e) =>
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  model: e.target.value,
                },
              })
            }
            placeholder="Enter model name"
          />
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            Temperature: {selectedNode.data.settings?.temperature || 0.8}
          </Text>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={selectedNode.data.settings?.temperature || 0.8}
            onChange={(value) =>
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  temperature: value,
                },
              })
            }
          />
        </div>

        <div>
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            Num Ctx: {selectedNode.data.settings?.numCtx || 2048}
          </Text>
          <Slider
            min={256}
            max={8192}
            step={256}
            value={selectedNode.data.settings?.numCtx || 2048}
            onChange={(value) =>
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  numCtx: value,
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
};

export default AgentNode;
