import React, { useMemo } from 'react';
import { Typography, Button, Input, Select, Divider, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, CodeOutlined } from '@ant-design/icons';
import VariableSelector from '../VariableSelector';

const { Title, Text } = Typography;

/*
  IF/ELSE node settings schema (stored in selectedNode.data.settings)
  {
    conditions: Array<{ left: string, operator: string, right: string }>, // index 0 is IF, others are ELIFs
    nextSteps: {
      if?: string | null,
      elif?: Array<string | null>, // aligned with conditions[1..]
      else?: string | null,
    }
  }
*/

const OPERATORS = [
  { label: 'equals', value: 'eq' },
  { label: 'not equals', value: 'neq' },
  { label: 'contains', value: 'contains' },
  { label: 'not contains', value: 'ncontains' },
  { label: 'starts with', value: 'starts' },
  { label: 'ends with', value: 'ends' },
  { label: 'greater than', value: 'gt' },
  { label: 'less than', value: 'lt' },
  { label: 'regex', value: 'regex' },
  { label: 'is truthy', value: 'truthy' },
];

const newCondition = () => ({ left: '', operator: 'eq', right: '' });

const IfElseNode = ({ workflowId, selectedNode, updateNodeData, availableNodes = [] }) => {
  const settings = selectedNode?.data?.settings || {};
  const conditions = settings.conditions?.length ? settings.conditions : [newCondition()];
  const nextSteps = settings.nextSteps || { if: null, elif: [], else: null };

  const setSettings = (patch) => {
    updateNodeData(selectedNode.id, {
      settings: {
        conditions: [newCondition()],
        nextSteps: { if: null, elif: [], else: null },
        ...(selectedNode.data.settings || {}),
        ...patch,
      },
    });
  };

  const updateCondition = (idx, patch) => {
    const updated = conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    setSettings({ conditions: updated });
  };

  const addElif = () => setSettings({ conditions: [...conditions, newCondition()] });

  const removeCondition = (idx) => {
    if (idx === 0) return; // don't remove the base IF
    const updated = conditions.filter((_, i) => i !== idx);
    // Align ELIF next steps indices
    const elif = Array.isArray(nextSteps.elif) ? [...nextSteps.elif] : [];
    elif.splice(idx - 1, 1);
    setSettings({ conditions: updated, nextSteps: { ...nextSteps, elif } });
  };

  const nodeOptions = useMemo(
    () => (availableNodes || []).map((n) => ({ label: `${n.data?.label || n.id} (${n.id})`, value: n.id })),
    [availableNodes]
  );

  return (
    <div>
      {/* IF + ELIF */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={5} style={{ margin: 0 }}>IF</Title>
          <Tooltip title="Add additional condition (ELIF)">
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addElif}>
              Add Condition
            </Button>
          </Tooltip>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {conditions.map((cond, idx) => (
          <div key={idx} style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>{idx === 0 ? 'IF' : `ELIF #${idx}`}</Text>
              {idx > 0 && (
                <Popconfirm title="Remove this condition?" onConfirm={() => removeCondition(idx)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', gap: 8, alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary">Left</Text>
                  <VariableSelector
                    workflowUuid={workflowId}
                    currentNodeId={selectedNode.id}
                    onSelect={(variable) => updateCondition(idx, { left: (cond.left || '') + variable })}
                  >
                    <Button size="small" type="text" icon={<CodeOutlined />}>Var</Button>
                  </VariableSelector>
                </div>
                <Input
                  placeholder="{{node.output}} or literal"
                  value={cond.left}
                  onChange={(e) => updateCondition(idx, { left: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr', gap: 8, alignItems: 'center' }}>
                <div >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text type="secondary">Operator</Text>
                    </div>
                    <Select
                      value={cond.operator || 'eq'}
                      options={OPERATORS}
                      onChange={(value) => updateCondition(idx, { operator: value })}
                    />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary">Right</Text>
                  <VariableSelector
                    workflowUuid={workflowId}
                    currentNodeId={selectedNode.id}
                    onSelect={(variable) => updateCondition(idx, { right: (cond.right || '') + variable })}
                  >
                    <Button size="small" type="text" icon={<CodeOutlined />}>Var</Button>
                  </VariableSelector>
                </div>
                <Input
                  placeholder="{{node.output}} or literal"
                  value={cond.right}
                  onChange={(e) => updateCondition(idx, { right: e.target.value })}
                  disabled={cond.operator === 'truthy'}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <Button block type="dashed" icon={<PlusOutlined />} onClick={addElif}>
          + ELIF
        </Button>
      </div>

      {/* ELSE Info */}
      <Divider />
      <Title level={5} style={{ marginBottom: 4 }}>ELSE</Title>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 12 }}>
        Used to define the logic that should be executed when the if condition is not met.
      </div>

      {/* NEXT STEP */}
      <Divider />
      <Title level={5} style={{ marginBottom: 8 }}>Next Step</Title>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
          <Text type="secondary" style={{ lineHeight: '32px' }}>IF</Text>
          <Select
            allowClear
            placeholder="Select next step for IF"
            options={nodeOptions}
            value={nextSteps.if || null}
            onChange={(val) => setSettings({ nextSteps: { ...nextSteps, if: val || null } })}
          />
        </div>

        {conditions.slice(1).map((_, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
            <Text type="secondary" style={{ lineHeight: '32px' }}>{`ELIF #${idx + 1}`}</Text>
            <Select
              allowClear
              placeholder={`Select next step for ELIF #${idx + 1}`}
              options={nodeOptions}
              value={(nextSteps.elif || [])[idx] || null}
              onChange={(val) => {
                const list = Array.isArray(nextSteps.elif) ? [...nextSteps.elif] : [];
                list[idx] = val || null;
                setSettings({ nextSteps: { ...nextSteps, elif: list } });
              }}
            />
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
          <Text type="secondary" style={{ lineHeight: '32px' }}>ELSE</Text>
          <Select
            allowClear
            placeholder="Select next step for ELSE"
            options={nodeOptions}
            value={nextSteps.else || null}
            onChange={(val) => setSettings({ nextSteps: { ...nextSteps, else: val || null } })}
          />
        </div>
      </div>
    </div>
  );
};

export default IfElseNode;

