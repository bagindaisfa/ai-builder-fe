import React, { useEffect, useState, useMemo } from 'react';
import {
  Input,
  Button,
  Modal,
  Select,
  Switch,
  Form,
  Space,
  List,
  Divider,
  Typography,
  Collapse,
  Checkbox,
  Slider,
  InputNumber,
  Segmented,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { nodeTypesConfig } from '../builderUtils/nodeTypesConfig';

const { Panel } = Collapse;

const { TextArea } = Input;
const { Text } = Typography;
const parameterTypes = ['String', 'Number', 'Boolean', 'Object', 'Array'];

const ParameterExtractor = ({
  selectedNode,
  updateNodeData,
  workflowId,
  availableNodes = [],
  onChange,
}) => {
  const settings = selectedNode?.data?.settings || {};
  const [model, setModel] = useState('');
  const [parameters, setParameters] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [nextStep, setNextStep] = useState(settings.nextStep || null);
  const [instruction, setInstruction] = useState('');
  // Advanced setting states
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [windowEnabled, setWindowEnabled] = useState(false);
  const [windowSize, setWindowSize] = useState(50); // default 50
  const [reasoningMode, setReasoningMode] = useState('Prompt'); // "Function/Tool Calling" or "Prompt"

  // notify parent (if any)
  useEffect(() => {
    if (typeof onChange === 'function') {
      onChange({
        model,
        parameters,
        memoryEnabled,
        windowEnabled,
        windowSize,
        reasoningMode,
      });
    }
  }, [
    model,
    parameters,
    memoryEnabled,
    windowEnabled,
    windowSize,
    reasoningMode,
    onChange,
  ]);

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

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleAdd = () => {
    form
      .validateFields()
      .then((values) => {
        setParameters([...parameters, values]);
        handleCancel();
      })
      .catch(() => {});
  };

  const handleDelete = (index) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleInstructionChange = (e) => {
    setInstruction(e.target.value);
    setSettings({ instruction: e.target.value });
  };

  const onSliderChange = (val) => setWindowSize(val);
  const onNumberChange = (val) => {
    // InputNumber may pass undefined on cleared value
    if (typeof val === 'number') setWindowSize(val);
  };

  return (
    <div>
      <div style={{ width: '100%' }}>
        {/* Model Input */}
        <Form layout="vertical">
          <Form.Item label="Model" required>
            <Input
              placeholder="Enter model (e.g. gpt-4, gpt-3.5)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </Form.Item>
        </Form>

        {/* Extract Parameters */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '500' }}>Extract Parameters *</span>
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={showModal}
            ></Button>
          </div>

          {parameters.length === 0 ? (
            <div
              style={{
                background: '#141414',
                border: '1px solid #303030',
                borderRadius: 4,
                padding: '8px',
                marginTop: 8,
                color: '#aaa',
              }}
            >
              Extract Parameters not setup
            </div>
          ) : (
            <List
              size="small"
              bordered
              dataSource={parameters}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(index)}
                    />,
                  ]}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <strong>{item.name}</strong> ({item.type}){' '}
                    <span style={{ fontSize: 12, color: '#aaa' }}>
                      {item.description}
                    </span>
                    {item.required && (
                      <span style={{ fontSize: 12, color: '#f87171' }}>
                        * Required
                      </span>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          )}
        </div>

        <div>
          <Text
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#1f1f1f',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            INSTRUCTION{' '}
          </Text>
          <TextArea
            value={instruction}
            onChange={handleInstructionChange}
            autoSize={{ minRows: 6 }}
            placeholder="{{ arg1 }}"
            style={{
              width: '100%',
              backgroundColor: 'white',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              fontSize: '14px',
              padding: '12px',
              resize: 'vertical',
              minHeight: '120px',
              fontFamily: 'monospace',
            }}
          />
        </div>

        {/* Advanced Setting (collapsible) */}
        <Collapse ghost>
          <Panel header="ADVANCED SETTING" key="1">
            {/* Memory row */}
            <Row align="middle" style={{ marginBottom: 12 }}>
              <Col flex="auto">
                <div style={{ fontWeight: 500 }}>Memory</div>
              </Col>
              <Col>
                <Switch checked={memoryEnabled} onChange={setMemoryEnabled} />
              </Col>
            </Row>

            {/* Window Size (only visible if memory enabled) */}
            {memoryEnabled && (
              <div style={{ paddingLeft: 6, marginBottom: 12 }}>
                <Row align="middle" gutter={12}>
                  <Col>
                    <Checkbox
                      checked={windowEnabled}
                      onChange={(e) => setWindowEnabled(e.target.checked)}
                    >
                      Window Size
                    </Checkbox>
                  </Col>

                  <Col flex="auto" style={{ minWidth: 200 }}>
                    <Slider
                      min={1}
                      max={200}
                      value={windowSize}
                      onChange={onSliderChange}
                      disabled={!windowEnabled}
                    />
                  </Col>

                  <Col>
                    <InputNumber
                      min={1}
                      max={200}
                      value={windowSize}
                      onChange={onNumberChange}
                      disabled={!windowEnabled}
                    />
                  </Col>
                </Row>
                <div style={{ marginTop: 6, color: '#888', fontSize: 12 }}>
                  {windowEnabled
                    ? 'Custom window size enabled.'
                    : 'Window size disabled (using default behaviour).'}
                </div>
              </div>
            )}

            {/* Reasoning Mode */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>
                Reasoning Mode
              </div>
              <Segmented
                options={['Function/Tool Calling', 'Prompt']}
                value={reasoningMode}
                onChange={(val) => setReasoningMode(val)}
              />
            </div>
          </Panel>
        </Collapse>

        {/* Modal */}
        <Modal
          title="Add Extract Parameter"
          open={isModalVisible}
          onCancel={handleCancel}
          footer={[
            <Button key="cancel" onClick={handleCancel}>
              Cancel
            </Button>,
            <Button key="add" type="primary" onClick={handleAdd}>
              Add
            </Button>,
          ]}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="Name"
              name="name"
              rules={[
                { required: true, message: 'Please input parameter name' },
              ]}
            >
              <Input placeholder="Extract Parameter Name" />
            </Form.Item>

            <Form.Item label="Type" name="type" initialValue="String">
              <Select>
                {parameterTypes.map((t) => (
                  <Select.Option key={t} value={t}>
                    {t}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Description" name="description">
              <Input.TextArea placeholder="Extract Parameter Description" />
            </Form.Item>

            <Form.Item
              label="Required"
              name="required"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
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

export default ParameterExtractor;
