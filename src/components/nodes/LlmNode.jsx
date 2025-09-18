import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Input,
  InputNumber,
  Switch,
  Slider,
  Checkbox,
  Divider,
  Select,
} from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import VariableSelector from '../VariableSelector';
import StructuredOutputEditor from '../StructuredOutputEditor';
import LlmAdvancedConfig from './LlmAdvancedConfig';

const { Title, Text } = Typography;

const LlmNode = ({ workflowId, selectedNode, updateNodeData }) => {
  // --- Local states for prompts ---
  const [systemPrompt, setSystemPrompt] = useState(
    selectedNode.data.settings?.systemPrompt || ''
  );
  const [userPrompt, setUserPrompt] = useState(
    selectedNode.data.settings?.userPrompt || ''
  );

  useEffect(() => {
    setSystemPrompt(selectedNode.data.settings?.systemPrompt || '');
    setUserPrompt(selectedNode.data.settings?.userPrompt || '');
  }, [selectedNode?.id]);

  if (!selectedNode) return null;

  return (
    <div>
      <Title level={5} style={{ marginBottom: '16px', color: '#262626' }}>
        Configuration
      </Title>

      {/* Streaming toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <Text strong>Stream Response</Text>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Enable streaming for real-time responses
          </div>
        </div>
        <Switch
          checked={selectedNode.data.settings?.streaming ?? true}
          onChange={(checked) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...selectedNode.data.settings,
                streaming: checked,
              },
            })
          }
        />
      </div>

      {/* System Prompt */}
      <div style={{ marginBottom: '16px' }}>
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
              setSystemPrompt((prev) => prev + variable);
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  systemPrompt: systemPrompt + variable,
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
                systemPrompt,
              },
            })
          }
          placeholder="Enter system prompt"
          rows={4}
        />
      </div>

      {/* User Prompt */}
      <div style={{ marginBottom: '16px' }}>
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
              setUserPrompt((prev) => prev + variable);
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  userPrompt: userPrompt + variable,
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
                userPrompt,
              },
            })
          }
          placeholder="Enter user prompt template"
          rows={4}
        />
      </div>

      {/* Structured Output */}
      <StructuredOutputEditor
        schema={
          selectedNode.data.settings?.structuredOutput || {
            enabled: false,
            properties: [],
            description: '',
          }
        }
        onChange={(schema) =>
          updateNodeData(selectedNode.id, {
            settings: {
              ...selectedNode.data.settings,
              structuredOutput: schema,
            },
          })
        }
      />

      {/* Basic Model Config */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <Text strong>LLM Base URL</Text>
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
          />
        </div>

        <div>
          <Text strong>Model</Text>
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
          />
        </div>

        <div>
          <Text strong>
            Temperature: {selectedNode.data.settings?.temperature || 0.8}
          </Text>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={selectedNode.data.settings?.temperature || 0.8}
            onAfterChange={(value) =>
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
          <Text strong>
            Num Ctx: {selectedNode.data.settings?.numCtx || 2048}
          </Text>
          <Slider
            min={256}
            max={8192}
            step={256}
            value={selectedNode.data.settings?.numCtx || 2048}
            onAfterChange={(value) =>
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

      <div style={{ marginTop: '20px' }}>
        <div
          style={{
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Title level={5} style={{ margin: 0, color: '#262626' }}>
            Advanced Configuration
          </Title>
          <Button
            type="text"
            size="small"
            onClick={() => {
              const currentOptions = selectedNode.data.settings?.options || {};
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  options: currentOptions.showAdvanced
                    ? {}
                    : { ...currentOptions, showAdvanced: true },
                },
              });
            }}
          >
            {selectedNode.data.settings?.options?.showAdvanced
              ? 'Reset'
              : 'Show'}
          </Button>
        </div>

        {selectedNode.data.settings?.options?.showAdvanced && (
          <LlmAdvancedConfig
            selectedNode={selectedNode}
            updateNodeData={updateNodeData}
          />
        )}
      </div>
    </div>
  );
};

export default LlmNode;
