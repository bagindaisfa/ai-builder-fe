import React, { useState, useMemo } from 'react';
import {
  Switch,
  InputNumber,
  Select,
  Typography,
  Divider,
  Input,
  Button,
} from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import { nodeTypesConfig } from '../builderUtils/nodeTypesConfig';
import VariableSelector from '../VariableSelector';

const { Text } = Typography;

const ListOperator = ({
  selectedNode,
  updateNodeData,
  workflowId,
  availableNodes = [],
}) => {
  const settings = selectedNode?.data?.settings || {};
  const [variables, setVariables] = useState(settings.variables || 'arg1');
  const [filterCondition, setFilterCondition] = useState(false);
  const [extractN, setExtractN] = useState(false);
  const [topN, setTopN] = useState(false);
  const [orderBy, setOrderBy] = useState(false);
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

  return (
    <div>
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

        {/* Filter Condition */}
        <div style={{ marginBottom: 16 }}>
          <Switch
            checked={filterCondition}
            onChange={setFilterCondition}
            style={{ marginRight: 8 }}
          />
          <Text strong>FILTER CONDITION</Text>
          {filterCondition && (
            <InputNumber
              placeholder="Enter condition"
              style={{ width: '100%', marginTop: 6 }}
            />
          )}
        </div>

        {/* Extract N Item */}
        <div style={{ marginBottom: 16 }}>
          <Switch
            checked={extractN}
            onChange={setExtractN}
            style={{ marginRight: 8 }}
          />
          <Text strong>EXTRACT THE N ITEM</Text>
          {extractN && (
            <InputNumber
              min={1}
              style={{ width: '100%', marginTop: 6 }}
              placeholder="Enter N"
            />
          )}
        </div>

        {/* Top N */}
        <div style={{ marginBottom: 16 }}>
          <Switch
            checked={topN}
            onChange={setTopN}
            style={{ marginRight: 8 }}
          />
          <Text strong>TOP N</Text>
          {topN && (
            <InputNumber
              min={1}
              style={{ width: '100%', marginTop: 6 }}
              placeholder="Enter N"
            />
          )}
        </div>

        {/* Order By */}
        <div style={{ marginBottom: 16 }}>
          <Switch
            checked={orderBy}
            onChange={setOrderBy}
            style={{ marginRight: 8 }}
          />
          <Text strong>ORDER BY</Text>
          {orderBy && (
            <Select
              style={{ width: '100%', marginTop: 6 }}
              placeholder="Select order"
              options={[
                { value: 'asc', label: 'Ascending' },
                { value: 'desc', label: 'Descending' },
              ]}
            />
          )}
        </div>

        <Divider />

        {/* Output Variables */}
        <div>
          <Text strong>OUTPUT VARIABLES</Text>
          <div style={{ marginTop: 6 }}>
            <Text type="secondary">result</Text> – Array[String]
          </div>
          <div>
            <Text type="secondary">first_record</Text> – String
          </div>
          <div>
            <Text type="secondary">last_record</Text> – String
          </div>
        </div>
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

export default ListOperator;
