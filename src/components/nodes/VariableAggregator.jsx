import React, { useState, useMemo } from 'react';
import {
  Card,
  Switch,
  Button,
  Input,
  Collapse,
  Space,
  Typography,
  Divider,
  Select,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { nodeTypesConfig } from '../builderUtils/nodeTypesConfig';

const { Panel } = Collapse;
const { Text } = Typography;

const VariableAggregator = ({
  selectedNode,
  updateNodeData,
  workflowId,
  availableNodes = [],
}) => {
  const settings = selectedNode?.data?.settings || {};
  const [isGrouped, setIsGrouped] = useState(false);
  const [variables, setVariables] = useState([]);
  const [groups, setGroups] = useState([{ name: 'Group1', variables: [] }]);
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

  // Tambah variable di mode biasa
  const addVariable = () => {
    setVariables([...variables, `Var${variables.length + 1}`]);
  };

  // Tambah group baru
  const addGroup = () => {
    setGroups([
      ...groups,
      { name: `Group${groups.length + 1}`, variables: [] },
    ]);
  };

  // Tambah variable dalam group
  const addVariableToGroup = (groupIndex) => {
    const newGroups = [...groups];
    newGroups[groupIndex].variables.push(
      `Var${newGroups[groupIndex].variables.length + 1}`
    );
    setGroups(newGroups);
  };

  return (
    <div>
      <Card
        className="no-hover"
        extra={
          <Space>
            <Text strong>Aggregation Group</Text>
            <Switch checked={isGrouped} onChange={setIsGrouped} />
          </Space>
        }
      >
        {!isGrouped ? (
          <div>
            <Text type="secondary">Assign Variables</Text>
            <div style={{ marginTop: 10 }}>
              {variables.map((v, i) => (
                <div key={i} style={{ padding: '5px 0' }}>
                  <Input value={v} />
                </div>
              ))}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                block
                onClick={addVariable}
              >
                Add Variable
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Collapse accordion>
              {groups.map((g, gi) => (
                <Panel header={g.name} key={gi}>
                  {g.variables.map((v, vi) => (
                    <div key={vi} style={{ padding: '5px 0' }}>
                      <Input value={v} />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    block
                    onClick={() => addVariableToGroup(gi)}
                  >
                    Add Variable
                  </Button>
                </Panel>
              ))}
            </Collapse>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              block
              style={{ marginTop: 10 }}
              onClick={addGroup}
            >
              Add Group
            </Button>
          </div>
        )}
      </Card>

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

export default VariableAggregator;
