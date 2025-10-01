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
  message,
} from 'antd';
import { CodeOutlined, FileImageOutlined } from '@ant-design/icons';
import VariableSelector from '../VariableSelector';
import StructuredOutputEditor from '../StructuredOutputEditor';
import LlmAdvancedConfig from './LlmAdvancedConfig';
import ConversationHistoryConfig from '../ConversationHistoryConfig';

const { Title, Text } = Typography;

// Function to check if a model is compatible with multimodal inputs
const isModelMultimodalCompatible = (modelName) => {
  if (!modelName) return false;
  
  const multimodalModels = [
    // Ollama models
    'llava', 'bakllava', 'llava-llama', 'llava-next', 'llava:7b', 'llava:13b', 'llava:34b',
    'bakllava:7b', 'llava-phi', 'llava-phi:3b', 'llava-phi:7b', 'llava-phi:34b',
    
    // Other models that may be available
    'gemma3', 'moondream', 'phi3-vision', 'cogvlm', 'qwen-vl', 'idefics',
    'fuyu', 'claude3', 'gpt-4-vision', 'gpt-4v'
  ];
  
  const modelNameLower = modelName.toLowerCase();
  return multimodalModels.some(model => modelNameLower.includes(model.toLowerCase()));
};

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
      
      {/* Multimodal toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          background: '#f0f7ff',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #d6e8ff'
        }}
      >
        <div>
          <Text strong>Enable Multimodal</Text>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Process images along with text (requires compatible model)
          </div>
        </div>
        <Switch
          checked={selectedNode.data.settings?.enableMultimodal ?? false}
          onChange={(checked) => {
            // If enabling multimodal, disable streaming by default and switch to a compatible model
            const updatedSettings = {
              ...selectedNode.data.settings,
              enableMultimodal: checked,
            };
            
            // Automatically disable streaming when multimodal is enabled
            if (checked && updatedSettings.streaming) {
              updatedSettings.streaming = false;
            }
            
            // If enabling multimodal, check if the current model is compatible
            if (checked) {
              const currentModel = updatedSettings.model || 'llama3.2:3b';
              
              // If current model is not compatible with multimodal, switch to a default multimodal model
              if (!isModelMultimodalCompatible(currentModel)) {
                const oldModel = currentModel;
                // Switch to a default multimodal model that's likely available in Ollama
                updatedSettings.model = 'llava:7b';
                
                // Show notification about model switch
                message.info(
                  `Model automatically switched from "${oldModel}" to "${updatedSettings.model}" for multimodal support.`,
                  4
                );
              }
            }
            
            updateNodeData(selectedNode.id, {
              settings: updatedSettings,
            });
          }}
        />
      </div>
      
      {/* Image Preview Section - Only shown when multimodal is enabled */}
      {selectedNode.data.settings?.enableMultimodal && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            background: '#f9f9f9',
            borderRadius: '6px',
            border: '1px dashed #d9d9d9'
          }}
        >
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            Image Processing
          </Text>
          <Text style={{ fontSize: '12px', color: '#8c8c8c', display: 'block', marginBottom: '8px' }}>
            Images will be processed along with your text prompt. Upload images through the chat interface.
          </Text>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '16px',
            background: '#f0f0f0',
            borderRadius: '4px',
            marginTop: '8px'
          }}>
            <FileImageOutlined style={{ fontSize: '24px', color: '#8c8c8c', marginRight: '8px' }} />
            <Text style={{ color: '#8c8c8c' }}>Images will appear here during workflow execution</Text>
          </div>
          
          <Divider style={{ margin: '16px 0 12px' }} />
          
          <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
            Compatible Models
          </Text>
          
          <div style={{ fontSize: '12px', color: '#595959' }}>
            <p style={{ margin: '0 0 8px' }}>
              Not all models support multimodal inputs. Use one of these recommended models:
            </p>
            <ul style={{ margin: '0 0 8px', paddingLeft: '20px' }}>
              <li><strong>llava:7b</strong> - Lightweight vision-language model (recommended)</li>
              <li><strong>llava:13b</strong> - Medium-sized vision-language model with better understanding</li>
              <li><strong>bakllava:7b</strong> - Lightweight multimodal model based on Mistral</li>
              <li><strong>llava-phi:3b</strong> - Small and efficient multimodal model</li>
            </ul>
            
            {!isModelMultimodalCompatible(selectedNode.data.settings?.model) && (
              <div style={{ 
                background: '#fff2e8', 
                border: '1px solid #ffccc7', 
                borderRadius: '4px', 
                padding: '8px', 
                marginTop: '8px',
                color: '#d4380d'
              }}>
                <strong>Warning:</strong> Your currently selected model "{selectedNode.data.settings?.model || 'llama2'}" may not support multimodal inputs. Please select a compatible model from the list above.
              </div>
            )}
          </div>
        </div>
      )}

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
      
      {/* Multimodal Model Compatibility Info */}
      {selectedNode.data.settings?.enableMultimodal && (
        <div
          style={{
            background: '#fffbe6',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            border: '1px solid #ffe58f',
          }}
        >
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            Multimodal Model Compatibility
          </Text>
          <Text style={{ fontSize: '12px' }}>
            Make sure to select a model that supports multimodal inputs. Compatible models include:
          </Text>
          <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '12px' }}>
            <li><strong>gemma3:12b</strong> - Google's multimodal model with strong vision capabilities</li>
            <li><strong>llava:34b</strong> - Large vision-language model with excellent image understanding</li>
            <li><strong>bakllava:7b</strong> - Lightweight multimodal model</li>
            <li><strong>phi3-vision</strong> - Microsoft's multimodal model</li>
            <li>Other models with vision capabilities</li>
          </ul>
          
          <Divider style={{ margin: '8px 0' }} />
          
          <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>
            Supported Image Formats & Limitations
          </Text>
          <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '12px' }}>
            <li>Supported formats: JPEG, PNG, GIF, BMP, WebP</li>
            <li>Maximum image size: 10MB per image</li>
            <li>For best results, use clear images with good lighting</li>
            <li>Complex diagrams or small text may not be recognized accurately</li>
          </ul>
          
          <Text style={{ fontSize: '12px', color: '#d48806', marginTop: '8px', display: 'block' }}>
            Note: Streaming is disabled for multimodal requests.
          </Text>
        </div>
      )}

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
          <div>
            <Input
              value={selectedNode.data.settings?.model || 'llama2'}
              onChange={(e) => {
                const newModel = e.target.value;
                
                // Check if multimodal is enabled and the new model is not compatible
                if (selectedNode.data.settings?.enableMultimodal && !isModelMultimodalCompatible(newModel)) {
                  // Show warning about incompatible model
                  message.warning(
                    `The model "${newModel}" may not support multimodal inputs. Consider using a compatible model like llava:7b or bakllava:7b.`,
                    4
                  );
                }
                
                updateNodeData(selectedNode.id, {
                  settings: {
                    ...selectedNode.data.settings,
                    model: newModel,
                  },
                });
              }}
              placeholder="Model name"
              style={{ width: '100%' }}
              status={selectedNode.data.settings?.enableMultimodal && !isModelMultimodalCompatible(selectedNode.data.settings?.model) ? 'warning' : ''}
            />
            
            {/* Show warning if multimodal is enabled but model is not compatible */}
            {selectedNode.data.settings?.enableMultimodal && !isModelMultimodalCompatible(selectedNode.data.settings?.model) && (
              <div style={{ color: '#faad14', fontSize: '12px', marginTop: '4px' }}>
                Warning: This model may not support multimodal inputs. Consider using a compatible model like llava:7b, llava:13b, or bakllava:7b.
              </div>
            )}
          </div>
          <Text strong>
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
          <Text strong>
            Num Ctx: {selectedNode.data.settings?.numCtx || 2048}
          </Text>
          <Slider
            min={1024}
            max={128000}
            step={1024}
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

      {/* Conversation History Configuration */}
      <ConversationHistoryConfig
        settings={{
          ...selectedNode.data.settings,
          nodeType: 'llm'
        }}
        updateSettings={(updatedSettings) =>
          updateNodeData(selectedNode.id, {
            settings: updatedSettings,
          })
        }
      />
      
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
