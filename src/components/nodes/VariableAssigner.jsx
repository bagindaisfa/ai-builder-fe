import React, { useState, useMemo } from 'react';
import { Select, Input, Button, Space, Divider, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { nodeTypesConfig } from '../builderUtils/nodeTypesConfig';

const operations = ['Set', 'Append', 'Increment', 'Decrement'];
const { Text } = Typography;

const VariableAssigner = ({
  selectedNode,
  updateNodeData,
  workflowId,
  availableNodes = [],
}) => {
  const settings = selectedNode?.data?.settings || {};
  const [assignments, setAssignments] = useState([
    { variable: null, operation: null, parameter: '' },
  ]);
  const [nextStep, setNextStep] = useState(settings.nextStep || null);

  const nodeOptions = useMemo(() => {
    // Get all node types from the configuration
    const allNodeTypes = nodeTypesConfig.flatMap((category) =>
      category.nodes.map((node) => ({
        label: node.label,
        value: node.type,
        type: node.type,
      }))
    );

    // Get existing nodes for reference
    const existingNodeOptions = (availableNodes || [])
      .filter((node) => node.id !== selectedNode?.id)
      .map((node) => ({
        label: `${node.data?.label || node.type} (Existing)`,
        value: node.id,
        type: node.type,
        isExisting: true,
      }));

    // Combine both, with existing nodes first
    return [
      ...existingNodeOptions,
      ...allNodeTypes.filter(
        (newNode) =>
          !existingNodeOptions.some(
            (existing) => existing.type === newNode.type
          )
      ),
    ];
  }, [availableNodes, selectedNode?.id]);

  const setSettings = (patch) => {
    updateNodeData(selectedNode.id, {
      settings: {
        ...(selectedNode.data.settings || {}),
        ...patch,
      },
    });
  };

  const handleChange = (index, key, value) => {
    const newAssignments = [...assignments];
    newAssignments[index][key] = value;
    setAssignments(newAssignments);
  };

  const addAssignment = () => {
    setAssignments([
      ...assignments,
      { variable: null, operation: null, parameter: '' },
    ]);
  };

  const removeAssignment = (index) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    setAssignments(newAssignments);
  };

  return (
    <div>
      <div style={{ padding: '16px' }}>
        {assignments.map((item, index) => (
          <Space
            key={index}
            style={{
              display: 'flex',
              marginBottom: 8,
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            {/* Select Variable */}
            <Select
              placeholder="Select assigned variable..."
              style={{ flex: 2 }}
              value={item.variable}
              onChange={(val) => handleChange(index, 'variable', val)}
              options={[
                { label: 'Var1', value: 'Var1' },
                { label: 'Var2', value: 'Var2' },
                { label: 'Var3', value: 'Var3' },
              ]}
            />

            {/* Operation */}
            <Select
              placeholder="Operation"
              style={{ flex: 1 }}
              value={item.operation}
              onChange={(val) => handleChange(index, 'operation', val)}
              options={operations.map((op) => ({ label: op, value: op }))}
            />

            {/* Parameter */}
            <Input
              placeholder="Set parameter..."
              style={{ flex: 2 }}
              value={item.parameter}
              onChange={(e) => handleChange(index, 'parameter', e.target.value)}
            />

            {/* Delete Button */}
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => removeAssignment(index)}
            />
          </Space>
        ))}

        {/* Add new row */}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          block
          onClick={addAssignment}
        >
          Add Variable
        </Button>
      </div>
      <Divider style={{ margin: '12px 0' }} />

      {/* NEXT STEP */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Next Step
        </Text>
        <Select
          showSearch
          allowClear
          placeholder="Search and select next step after iteration (existing nodes or node types)"
          options={nodeOptions}
          value={nextStep}
          onChange={(value) => {
            setNextStep(value);
            setSettings({ nextStep: value });
          }}
          optionFilterProp="label"
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default VariableAssigner;
