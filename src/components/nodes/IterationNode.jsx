import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Input,
  Button,
  Divider,
  Select,
  InputNumber,
  Switch,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import VariableSelector from '../VariableSelector';
import { nodeTypesConfig } from '../builderUtils/nodeTypesConfig';

const { Title, Text } = Typography;

const IterationNode = ({
  workflowId,
  selectedNode,
  updateNodeData,
  availableNodes = [],
}) => {
  const settings = selectedNode?.data?.settings || {};
  const [inputVariable, setInputVariable] = useState(
    settings.inputVariable || ''
  );
  const [outputVariable, setOutputVariable] = useState(
    settings.outputVariable || 'output'
  );
  const [maxIterations, setMaxIterations] = useState(
    settings.maxIterations || 10
  );
  const [nextStep, setNextStep] = useState(settings.nextStep || null);
  const [enableEarlyExit, setEnableEarlyExit] = useState(
    settings.enableEarlyExit ?? false
  );
  const [earlyExitCondition, setEarlyExitCondition] = useState(
    settings.earlyExitCondition || ''
  );

  const setSettings = (patch) => {
    updateNodeData(selectedNode.id, {
      settings: {
        inputVariable: '',
        outputVariable: 'output',
        maxIterations: 10,
        nextStep: null,
        enableEarlyExit: false,
        earlyExitCondition: '',
        ...(selectedNode.data.settings || {}),
        ...patch,
      },
    });
  };

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

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <Text strong>Input Variable</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Input
              placeholder="Enter input variable name"
              value={inputVariable}
              onChange={(e) => {
                setInputVariable(e.target.value);
                setSettings({ inputVariable: e.target.value });
              }}
              style={{ flex: 1 }}
            />
            <VariableSelector
              workflowUuid={workflowId}
              currentNodeId={selectedNode.id}
              onSelect={(variable) => {
                setInputVariable(variable);
                setSettings({ inputVariable: variable });
              }}
            >
              <Button>Insert Variable</Button>
            </VariableSelector>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <Text strong>Output Variable</Text>
          <Input
            placeholder="output"
            value={outputVariable}
            onChange={(e) => {
              setOutputVariable(e.target.value);
              setSettings({ outputVariable: e.target.value });
            }}
            style={{ marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text strong>Max Iterations</Text>
            <InputNumber
              min={1}
              max={1000}
              value={maxIterations}
              onChange={(value) => {
                setMaxIterations(value);
                setSettings({ maxIterations: value });
              }}
              style={{ width: 100 }}
            />
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Maximum number of iterations to perform
          </Text>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <Text strong>Early Exit Condition</Text>
            <Switch
              checked={enableEarlyExit}
              onChange={(checked) => {
                setEnableEarlyExit(checked);
                setSettings({
                  enableEarlyExit: checked,
                  ...(!checked && { earlyExitCondition: '' }),
                });
              }}
            />
          </div>

          {enableEarlyExit && (
            <div>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Exit the loop when this condition is true
                </Text>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  placeholder="e.g., item > 5"
                  value={earlyExitCondition}
                  onChange={(e) => {
                    setEarlyExitCondition(e.target.value);
                    setSettings({ earlyExitCondition: e.target.value });
                  }}
                  style={{ flex: 1 }}
                />
                <VariableSelector
                  workflowUuid={workflowId}
                  currentNodeId={selectedNode.id}
                  onSelect={(variable) => {
                    const newCondition = earlyExitCondition + variable;
                    setEarlyExitCondition(newCondition);
                    setSettings({ earlyExitCondition: newCondition });
                  }}
                >
                  <Button>Var</Button>
                </VariableSelector>
              </div>
            </div>
          )}
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

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

export default IterationNode;
