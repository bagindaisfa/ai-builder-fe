import React from 'react';
import {
  Typography,
  Slider,
  InputNumber,
  Checkbox,
  Divider,
  Select,
} from 'antd';

const { Text } = Typography;

const LlmAdvancedConfig = ({ selectedNode, updateNodeData }) => {
  if (!selectedNode) return null;

  const settings = selectedNode.data.settings || {};
  const options = settings.options || {};

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: '#f9f9f9',
        padding: '16px',
        borderRadius: '8px',
      }}
    >
      {/* Top K */}
      <div>
        <Text strong>Top K: {options.top_k}</Text>
        <Slider
          min={1}
          max={100}
          step={1}
          value={options.top_k}
          onAfterChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, top_k: value },
              },
            })
          }
        />
      </div>

      {/* Top P */}
      <div>
        <Text strong>Top P: {settings.topP}</Text>
        <Slider
          min={0}
          max={1}
          step={0.1}
          value={settings.topP}
          onAfterChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                topP: value,
              },
            })
          }
        />
      </div>

      {/* Min P */}
      <div>
        <Text strong>Min P: {options.min_p}</Text>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={options.min_p}
          onAfterChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, min_p: value },
              },
            })
          }
        />
      </div>

      {/* Repeat Penalty */}
      <div>
        <Text strong>Repeat Penalty: {options.repeat_penalty}</Text>
        <Slider
          min={0.1}
          max={2}
          step={0.1}
          value={options.repeat_penalty}
          onAfterChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, repeat_penalty: value },
              },
            })
          }
        />
      </div>

      {/* Repeat Last N */}
      <div>
        <Text strong>Repeat Last N: {options.repeat_last_n}</Text>
        <InputNumber
          min={0}
          max={2048}
          value={options.repeat_last_n}
          onChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, repeat_last_n: value },
              },
            })
          }
          style={{ width: '100%' }}
        />
      </div>

      {/* Seed */}
      <div>
        <Text strong>Seed: {options.seed}</Text>
        <InputNumber
          min={0}
          value={options.seed}
          onChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, seed: value },
              },
            })
          }
          style={{ width: '100%' }}
        />
      </div>

      {/* Num Predict */}
      <div>
        <Text strong>Num Predict: {options.num_predict}</Text>
        <InputNumber
          min={1}
          max={4096}
          value={options.num_predict}
          onChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, num_predict: value },
              },
            })
          }
          style={{ width: '100%' }}
        />
      </div>

      {/* Frequency Penalty */}
      <div>
        <Text strong>Frequency Penalty: {options.frequency_penalty}</Text>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={options.frequency_penalty}
          onAfterChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, frequency_penalty: value },
              },
            })
          }
        />
      </div>

      {/* Presence Penalty */}
      <div>
        <Text strong>Presence Penalty: {options.presence_penalty}</Text>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={options.presence_penalty}
          onAfterChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, presence_penalty: value },
              },
            })
          }
        />
      </div>

      {/* Stop Sequences */}
      <div>
        <Text strong>Stop Sequences</Text>
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="Add stop sequences"
          value={options.stop || []}
          onChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, stop: value },
              },
            })
          }
        />
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* Mirostat */}
      <div>
        <Text strong>Mirostat Mode</Text>
        <Select
          value={options.mirostat || 0}
          onChange={(value) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, mirostat: value },
              },
            })
          }
          style={{ width: '100%' }}
        >
          <Select.Option value={0}>Disabled</Select.Option>
          <Select.Option value={1}>Mirostat v1</Select.Option>
          <Select.Option value={2}>Mirostat v2</Select.Option>
        </Select>
      </div>

      {options.mirostat > 0 && (
        <>
          <div>
            <Text strong>Mirostat Tau</Text>
            <Slider
              min={0}
              max={10}
              step={0.1}
              value={options.mirostat_tau || 5.0}
              onAfterChange={(value) =>
                updateNodeData(selectedNode.id, {
                  settings: {
                    ...settings,
                    options: { ...options, mirostat_tau: value },
                  },
                })
              }
            />
          </div>

          <div>
            <Text strong>Mirostat Eta</Text>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={options.mirostat_eta || 0.1}
              onAfterChange={(value) =>
                updateNodeData(selectedNode.id, {
                  settings: {
                    ...settings,
                    options: { ...options, mirostat_eta: value },
                  },
                })
              }
            />
          </div>
        </>
      )}

      <Divider style={{ margin: '8px 0' }} />

      {/* System Settings */}
      <div>
        <Text strong>System Settings</Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text>Num Batch</Text>
            <InputNumber
              min={1}
              max={2048}
              value={options.num_batch || 512}
              onChange={(value) =>
                updateNodeData(selectedNode.id, {
                  settings: {
                    ...settings,
                    options: { ...options, num_batch: value },
                  },
                })
              }
              style={{ width: '120px' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text>Num Threads</Text>
            <InputNumber
              min={1}
              max={32}
              value={options.num_thread || 4}
              onChange={(value) =>
                updateNodeData(selectedNode.id, {
                  settings: {
                    ...settings,
                    options: { ...options, num_thread: value },
                  },
                })
              }
              style={{ width: '120px' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text>Num GPU</Text>
            <InputNumber
              min={0}
              max={8}
              value={options.num_gpu || 1}
              onChange={(value) =>
                updateNodeData(selectedNode.id, {
                  settings: {
                    ...settings,
                    options: { ...options, num_gpu: value },
                  },
                })
              }
              style={{ width: '120px' }}
            />
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <Checkbox
          checked={options.low_vram || false}
          onChange={(e) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, low_vram: e.target.checked },
              },
            })
          }
        >
          Low VRAM
        </Checkbox>

        <Checkbox
          checked={options.use_mmap ?? true}
          onChange={(e) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, use_mmap: e.target.checked },
              },
            })
          }
        >
          Use MMAP
        </Checkbox>

        <Checkbox
          checked={options.use_mlock || false}
          onChange={(e) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, use_mlock: e.target.checked },
              },
            })
          }
        >
          Use MLOCK
        </Checkbox>

        <Checkbox
          checked={options.penalize_newline || false}
          onChange={(e) =>
            updateNodeData(selectedNode.id, {
              settings: {
                ...settings,
                options: { ...options, penalize_newline: e.target.checked },
              },
            })
          }
        >
          Penalize Newlines
        </Checkbox>
      </div>
    </div>
  );
};

export default LlmAdvancedConfig;
