import React, { useState, useMemo } from 'react';
import { Input, Button, Typography, Divider, Select } from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import VariableSelector from '../VariableSelector';
import { nodeTypesConfig } from '../builderUtils/nodeTypesConfig';

const { TextArea } = Input;
const { Text } = Typography;

const DocExtractor = ({
  selectedNode,
  updateNodeData,
  workflowId,
  availableNodes = [],
}) => {
  const settings = selectedNode?.data?.settings || {};
  const [variables, setVariables] = useState(settings.variables || 'arg1');
  const [outputs] = useState([
    { name: 'text', type: 'string', description: 'Extracted text' },
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

  const handleVariableChange = (value) => {
    setVariables(value);
    setSettings({ variables: newVars });
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* INPUT VARIABLES */}
      <div style={{ marginBottom: '16px' }}>
        <Text
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#1f1f1f',
            display: 'block',
            marginBottom: '8px',
          }}
        >
          INPUT VARIABLES
        </Text>

        <div
          key={1}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <Input
            value={variables}
            onChange={(e) => handleVariableChange(e.target.value)}
            style={{ flex: 1, borderRadius: '6px', fontSize: '13px' }}
          />
        </div>
      </div>
      <div style={{ marginTop: '8px', textAlign: 'right' }}>
        <VariableSelector
          workflowUuid={workflowId}
          currentNodeId={selectedNode.id}
          onSelect={(variable) => {
            const newValue = template + ` {{ ${variable} }}`;
            setTemplate(newValue);
            setSettings({ template: newValue });
          }}
        >
          <Button size="small" icon={<CodeOutlined />}>
            Insert Variable
          </Button>
        </VariableSelector>
      </div>

      {/* OUTPUT VARIABLES */}
      <div style={{ marginBottom: '16px' }}>
        <Text
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#1f1f1f',
            display: 'block',
            marginBottom: '8px',
          }}
        >
          OUTPUT VARIABLES
        </Text>
        {outputs.map((o, i) => (
          <div
            key={i}
            style={{
              border: '1px solid #e8e8e8',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '8px',
              background: '#fff',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 500 }}>
              {o.name} <span style={{ color: '#8c8c8c' }}>{o.type}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#595959' }}>
              {o.description}
            </div>
          </div>
        ))}
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

export default DocExtractor;
