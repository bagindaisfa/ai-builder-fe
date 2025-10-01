import React, { useMemo, useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Input,
  Switch,
  Divider,
  Space,
  Tag,
  Select,
  Tooltip,
  List,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  ArrowRightOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import VariableSelector from '../VariableSelector';

const { Title, Text } = Typography;

/*
  QuestionClassifier node settings
  Persisted under selectedNode.data.settings
  {
    model: string,
    inputVariables: string[],
    visionEnabled: boolean,
    classes: Array<{ name: string, description: string }>,
    instruction: string,
    memoryEnabled: boolean,
    nextSteps: { [className: string]: string | null }, // node id
  }
*/

const DEFAULT_CLASS = (index) => ({
  name: `Class ${index + 1}`,
  description: '',
});

const MODEL_OPTIONS = [
  { label: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
  { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
  { label: 'gpt-4o', value: 'gpt-4o' },
  { label: 'llama3.1:8b', value: 'llama3.1:8b' },
  { label: 'custom (type manually)', value: '__custom__' },
];

const QuestionClassifier = ({
  workflowId,
  selectedNode,
  updateNodeData,
  availableNodes = [],
}) => {
  const settings = selectedNode?.data?.settings || {};
  const [customModel, setCustomModel] = useState(
    settings.model && !MODEL_OPTIONS.some((o) => o.value === settings.model)
      ? settings.model
      : ''
  );

  useEffect(() => {
    // Sync when switching nodes
    const s = selectedNode?.data?.settings || {};
    setCustomModel(
      s.model && !MODEL_OPTIONS.some((o) => o.value === s.model) ? s.model : ''
    );
  }, [selectedNode?.id]);

  const classes =
    settings.classes && settings.classes.length > 0
      ? settings.classes
      : [DEFAULT_CLASS(0), DEFAULT_CLASS(1)];

  const setSettings = (patch) => {
    updateNodeData(selectedNode.id, {
      settings: {
        model: 'gpt-3.5-turbo',
        inputVariables: [],
        visionEnabled: false,
        classes: [DEFAULT_CLASS(0), DEFAULT_CLASS(1)],
        instruction: '',
        memoryEnabled: false,
        nextSteps: {},
        ...(selectedNode.data.settings || {}),
        ...patch,
      },
    });
  };

  const handleAddClass = () => {
    const newClasses = [...classes, DEFAULT_CLASS(classes.length)];
    setSettings({ classes: newClasses });
  };

  const handleRemoveClass = (idx) => {
    const newClasses = classes.filter((_, i) => i !== idx);
    const nextSteps = { ...(settings.nextSteps || {}) };
    // Clean mapping
    if (classes[idx]) delete nextSteps[classes[idx].name];
    setSettings({ classes: newClasses, nextSteps });
  };

  const handleDuplicateClass = (idx) => {
    const item = classes[idx];
    const newItem = {
      name: `${item.name} Copy`,
      description: item.description,
    };
    const newClasses = [
      ...classes.slice(0, idx + 1),
      newItem,
      ...classes.slice(idx + 1),
    ];
    setSettings({ classes: newClasses });
  };

  const updateClass = (idx, patch) => {
    const newClasses = classes.map((c, i) =>
      i === idx ? { ...c, ...patch } : c
    );
    setSettings({ classes: newClasses });
  };

  const nodeOptions = useMemo(
    () =>
      (availableNodes || []).map((n) => ({
        label: `${n.data?.label || n.id} (${n.id})`,
        value: n.id,
      })),
    [availableNodes]
  );

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16 }}>
        Model
      </Title>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
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

      <Title level={5} style={{ marginBottom: 8 }}>
        Input Variables
      </Title>
      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          {(settings.inputVariables || []).map((v, i) => (
            <Tag
              key={`${v}-${i}`}
              closable
              onClose={() =>
                setSettings({
                  inputVariables: (settings.inputVariables || []).filter(
                    (_, idx) => idx !== i
                  ),
                })
              }
            >
              {v}
            </Tag>
          ))}
        </Space>
        <div style={{ marginTop: 8 }}>
          <VariableSelector
            workflowUuid={workflowId}
            currentNodeId={selectedNode.id}
            onSelect={(variable) => {
              const arr = Array.from(
                new Set([...(settings.inputVariables || []), variable])
              );
              setSettings({ inputVariables: arr });
            }}
          >
            <Button size="small" icon={<CodeOutlined />}>
              Insert Variable
            </Button>
          </VariableSelector>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div>
          <Text strong>Vision</Text>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            Enable image understanding for classification
          </div>
        </div>
        <Switch
          checked={settings.visionEnabled || false}
          onChange={(checked) => setSettings({ visionEnabled: checked })}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <Title level={5} style={{ marginBottom: 8 }}>
        Class
      </Title>
      <List
        itemLayout="vertical"
        dataSource={classes}
        renderItem={(item, idx) => (
          <List.Item
            key={idx}
            style={{ paddingLeft: 0, paddingRight: 0 }}
            actions={[
              <Tooltip title="Duplicate" key="dup">
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleDuplicateClass(idx)}
                />
              </Tooltip>,
              <Popconfirm
                key="del"
                title="Remove this class?"
                onConfirm={() => handleRemoveClass(idx)}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Input
                value={item.name}
                onChange={(e) => updateClass(idx, { name: e.target.value })}
                placeholder={`Class ${idx + 1} name`}
              />
            </div>
            <Input.TextArea
              rows={3}
              placeholder="Describe what questions belong to this class"
              value={item.description}
              onChange={(e) =>
                updateClass(idx, { description: e.target.value })
              }
            />

            {/* Next step selector per class (stores mapping). Actual connection logic can be handled elsewhere) */}
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text type="secondary" style={{ minWidth: 80 }}>
                Next Step
              </Text>
              <Select
                allowClear
                placeholder="Select node to jump"
                options={nodeOptions}
                style={{ flex: 1 }}
                value={(settings.nextSteps || {})[item.name] || null}
                onChange={(val) =>
                  setSettings({
                    nextSteps: {
                      ...(settings.nextSteps || {}),
                      [item.name]: val || null,
                    },
                  })
                }
              />
              <Tooltip title="This only stores mapping. Create edges on canvas as usual.">
                <ArrowRightOutlined />
              </Tooltip>
            </div>
          </List.Item>
        )}
      />
      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={handleAddClass}
      >
        Add Class
      </Button>

      <Divider style={{ margin: '16px 0' }} />

      <div style={{ marginBottom: 12 }}>
        <Title level={5} style={{ marginBottom: 8 }}>
          Advanced Setting
        </Title>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>
          Instruction
        </Text>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <VariableSelector
            workflowUuid={workflowId}
            currentNodeId={selectedNode.id}
            onSelect={(variable) =>
              setSettings({
                instruction: (settings.instruction || '') + variable,
              })
            }
          >
            <Button size="small" icon={<CodeOutlined />}>
              Insert Variable
            </Button>
          </VariableSelector>
        </div>
        <Input.TextArea
          rows={4}
          placeholder="Write your prompt here, enter '{' to insert a variable..."
          value={settings.instruction || ''}
          onChange={(e) => setSettings({ instruction: e.target.value })}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <Text strong>Memory</Text>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            Enable conversation memory for better classification
          </div>
        </div>
        <Switch
          checked={settings.memoryEnabled || false}
          onChange={(checked) => setSettings({ memoryEnabled: checked })}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <Title level={5} style={{ marginBottom: 8 }}>
        Output Variables
      </Title>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
        The classifier produces the following outputs
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Text code>class_name</Text>
        <div>
          <Text type="secondary">string</Text>
          <div style={{ fontSize: 12 }}>Class Name</div>
        </div>
        <Text code>usage</Text>
        <div>
          <Text type="secondary">object</Text>
          <div style={{ fontSize: 12 }}>Model Usage Information</div>
        </div>
      </div>
    </div>
  );
};

export default QuestionClassifier;
