import React, { useState, useMemo } from 'react';
import {
  Input,
  Typography,
  Button,
  Tooltip,
  Select,
  Slider,
  Divider,
} from 'antd';
import { nodeTypesConfig } from '../builderUtils/nodeTypesConfig';

const { Text } = Typography;
const { Option } = Select;

const LoopNode = ({
  workflowId,
  selectedNode,
  updateNodeData,
  availableNodes = [],
}) => {
  const settings = selectedNode?.data?.settings || {};
  const [variables, setVariables] = useState(settings.variables || []);
  const [loopCount, setLoopCount] = useState(settings.loopCount || 10);
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

  const handleAddVariable = () => {
    const newVar = { name: '', type: 'String', scope: 'Constant' };
    const newVars = [...variables, newVar];
    setVariables(newVars);
    setSettings({ variables: newVars });
  };

  const handleVariableChange = (index, key, value) => {
    const newVars = [...variables];
    newVars[index][key] = value;
    setVariables(newVars);
    setSettings({ variables: newVars });
  };

  const handleLoopCountChange = (value) => {
    setLoopCount(value);
    setSettings({ loopCount: value });
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Loop Variables */}
      <div style={{ marginBottom: '16px' }}>
        <Text
          style={{
            fontSize: '14px',
            fontWeight: 500,
            display: 'block',
            marginBottom: '8px',
          }}
        >
          LOOP VARIABLES
        </Text>
        {variables.map((variable, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <Input
              placeholder="Variable Name"
              value={variable.name}
              onChange={(e) =>
                handleVariableChange(index, 'name', e.target.value)
              }
              style={{ flex: 1 }}
            />
            <Select
              value={variable.type}
              onChange={(value) => handleVariableChange(index, 'type', value)}
              style={{ width: 120 }}
            >
              <Option value="String">String</Option>
              <Option value="Number">Number</Option>
              <Option value="Boolean">Boolean</Option>
            </Select>
            <Select
              value={variable.scope}
              onChange={(value) => handleVariableChange(index, 'scope', value)}
              style={{ width: 120 }}
            >
              <Option value="Constant">Constant</Option>
              <Option value="Dynamic">Dynamic</Option>
            </Select>
          </div>
        ))}
        <Button type="dashed" onClick={handleAddVariable} block>
          + Add Variable
        </Button>
      </div>

      {/* Loop Termination Condition */}
      <div style={{ marginBottom: '16px' }}>
        <Text
          style={{
            fontSize: '14px',
            fontWeight: 500,
            display: 'block',
            marginBottom: '8px',
          }}
        >
          LOOP TERMINATION CONDITION
        </Text>
        <Button type="dashed" block>
          + Add Condition
        </Button>
      </div>

      {/* Maximum Loop Count */}
      <div style={{ marginBottom: '16px' }}>
        <Text
          style={{
            fontSize: '14px',
            fontWeight: 500,
            display: 'block',
            marginBottom: '8px',
          }}
        >
          MAXIMUM LOOP COUNT
        </Text>
        <Slider
          min={1}
          max={100}
          value={loopCount}
          onChange={handleLoopCountChange}
        />
        <div>{loopCount}</div>
      </div>

      {/* Next Step */}
      <Divider />
      <div>
        <Text
          style={{
            fontSize: '14px',
            fontWeight: 500,
            display: 'block',
            marginBottom: '8px',
          }}
        >
          NEXT STEP
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

export default LoopNode;
