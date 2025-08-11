import React, { useCallback, useState } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button, Space, Card, Typography, Drawer, Divider, Tooltip, Input, List, Avatar, Spin, Switch, Select, Slider } from "antd";
import { 
  PlusOutlined, 
  DownloadOutlined, 
  NodeIndexOutlined,
  RobotOutlined,
  CodeOutlined,
  QuestionCircleOutlined,
  DatabaseOutlined,
  BranchesOutlined,
  ApiOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  MenuOutlined,
  EyeOutlined,
  SendOutlined,
  UserOutlined,
  CloseOutlined,
  MessageOutlined,
  SmileOutlined,
  FilterOutlined,
  ReloadOutlined,
  SyncOutlined,
  FileTextOutlined,
  EditOutlined,
  GroupOutlined,
  ScissorOutlined,
  CalculatorOutlined,
  UnorderedListOutlined,
  FunctionOutlined
} from "@ant-design/icons";
import { saveAs } from "file-saver";

const { Title, Text } = Typography;

// Node types configuration exactly matching Dify.ai
const nodeTypes = [
  {
    category: "Nodes",
    nodes: [
      { type: "llm", label: "LLM", icon: <RobotOutlined />, color: "#6366f1" },
      { type: "knowledge", label: "Knowledge Retrieval", icon: <DatabaseOutlined />, color: "#10b981" },
      { type: "answer", label: "Answer", icon: <MessageOutlined />, color: "#f59e0b" },
      { type: "agent", label: "Agent", icon: <SmileOutlined />, color: "#8b5cf6" },
    ]
  },
  {
    category: "Question Understand",
    nodes: [
      { type: "classifier", label: "Question Classifier", icon: <FilterOutlined />, color: "#10b981" },
    ]
  },
  {
    category: "Logic",
    nodes: [
      { type: "ifelse", label: "IF/ELSE", icon: <BranchesOutlined />, color: "#06b6d4" },
      { type: "iteration", label: "Iteration", icon: <ReloadOutlined />, color: "#06b6d4" },
      { type: "loop", label: "Loop", icon: <SyncOutlined />, color: "#06b6d4" },
    ]
  },
  {
    category: "Transform",
    nodes: [
      { type: "code", label: "Code", icon: <CodeOutlined />, color: "#6366f1" },
      { type: "template", label: "Template", icon: <FileTextOutlined />, color: "#6366f1" },
      { type: "variable_aggregator", label: "Variable Aggregator", icon: <GroupOutlined />, color: "#6366f1" },
      { type: "doc_extractor", label: "Doc Extractor", icon: <ScissorOutlined />, color: "#10b981" },
      { type: "variable_assigner", label: "Variable Assigner", icon: <EditOutlined />, color: "#6366f1" },
      { type: "parameter_extractor", label: "Parameter Extractor", icon: <CalculatorOutlined />, color: "#6366f1" },
    ]
  },
  {
    category: "Tools",
    nodes: [
      { type: "http_request", label: "HTTP Request", icon: <ApiOutlined />, color: "#8b5cf6" },
      { type: "list_operator", label: "List Operator", icon: <UnorderedListOutlined />, color: "#06b6d4" },
    ]
  }
];

export default function BuilderCanvas() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [nodeSettingsVisible, setNodeSettingsVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [testInput, setTestInput] = useState("");
  const [testMessages, setTestMessages] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    autoSave: true,
    snapToGrid: false,
    showMiniMap: true,
    showBackground: true,
    backgroundType: 'dots', // 'dots', 'lines', 'cross'
    nodeSpacing: 150,
    edgeType: 'default', // 'default', 'straight', 'step', 'smoothstep'
    theme: 'light', // 'light', 'dark'
    showNodeLabels: true,
    enableAnimations: true
  });
  
  const initialNodes = [
    {
      id: "start-1",
      type: "input",
      data: { 
        label: "Start",
        nodeType: "start",
        description: "Workflow entry point"
      },
      position: { x: 100, y: 100 },
      style: {
        background: "#f6ffed",
        border: "2px solid #52c41a",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px"
      }
    },
    {
      id: "llm-1",
      data: { 
        label: "LLM Node",
        nodeType: "llm",
        description: "Large Language Model processing"
      },
      position: { x: 300, y: 100 },
      style: {
        background: "#e6f7ff",
        border: "2px solid #1890ff",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px"
      }
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (nodeType) => {
    const id = `${nodeType.type}-${Date.now()}`;
    const newNode = {
      id,
      data: { 
        label: nodeType.label,
        nodeType: nodeType.type,
        description: `${nodeType.label} node`
      },
      position: { 
        x: Math.random() * 300 + 100, 
        y: Math.random() * 200 + 100 
      },
      style: {
        background: `${nodeType.color}15`,
        border: `2px solid ${nodeType.color}`,
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px"
      }
    };
    
    setNodes((nds) => nds.concat(newNode));
    setDrawerVisible(false);
  };

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      
      const reactFlowBounds = event.target.getBoundingClientRect();
      const nodeData = JSON.parse(event.dataTransfer.getData('application/reactflow'));
      
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };
      
      addNode({ ...nodeData, position });
    },
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const exportJson = () => {
    const payload = { nodes, edges };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "workflow.json");
  };

  const runWorkflowTest = async () => {
    if (!testInput.trim()) return;
    
    setIsRunning(true);
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: testInput,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setTestMessages(prev => [...prev, userMessage]);
    setTestInput("");
    
    // Simulate workflow execution
    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: `Workflow executed successfully! Input: "${userMessage.content}" was processed through ${nodes.length} nodes.`,
        timestamp: new Date().toLocaleTimeString()
      };
      setTestMessages(prev => [...prev, botMessage]);
      setIsRunning(false);
    }, 2000);
  };

  const clearTestMessages = () => {
    setTestMessages([]);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetSettings = () => {
    setSettings({
      autoSave: true,
      snapToGrid: false,
      showMiniMap: true,
      showBackground: true,
      backgroundType: 'dots',
      nodeSpacing: 150,
      edgeType: 'default',
      theme: 'light',
      showNodeLabels: true,
      enableAnimations: true
    });
  };

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    setNodeSettingsVisible(true);
  };

  const updateNodeData = (nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
    
    // Update selectedNode if it's the same node being updated
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(prev => ({
        ...prev,
        data: { ...prev.data, ...newData }
      }));
    }
  };

  return (
    <div style={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      overflow: "hidden",
      background: "#f5f5f5"
    }}>
      {/* Dify-style toolbar */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e8e8e8",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <NodeIndexOutlined style={{ fontSize: "20px", color: "#1890ff" }} />
            <Title level={5} style={{ margin: 0, color: "#262626" }}>
              Workflow Studio
            </Title>
          </div>
          <Divider type="vertical" style={{ height: "20px" }} />
          <Button
            type="primary"
            icon={<MenuOutlined />}
            onClick={() => setDrawerVisible(true)}
            style={{
              background: "#1890ff",
              borderColor: "#1890ff",
            }}
          >
            Add Nodes
          </Button>
        </div>
        <Space>
          <Button 
            icon={<SettingOutlined />}
            onClick={() => setSettingsVisible(true)}
          >
            Settings
          </Button>
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => setPreviewVisible(!previewVisible)}
            type={previewVisible ? "primary" : "default"}
          >
            {previewVisible ? "Hide Preview" : "Preview"}
          </Button>
          <Button icon={<PlayCircleOutlined />} type="primary" onClick={runWorkflowTest}>Test Run</Button>
          <Button icon={<DownloadOutlined />} onClick={exportJson}>Export</Button>
        </Space>
      </div>

      {/* Main content area with canvas and preview */}
      <div style={{ flex: 1, display: "flex", background: "#fafafa" }}>
        {/* Canvas area */}
        <div style={{ 
          flex: previewVisible ? 1 : 1, 
          position: "relative", 
          background: "#fafafa",
          transition: "all 0.3s ease"
        }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          style={{ 
            width: "100%", 
            height: "100%", 
            background: "#fafafa"
          }}
        >
          <Background 
            color="#d9d9d9" 
            gap={16} 
            size={1}
            style={{ opacity: 0.5 }}
          />
          <MiniMap
            nodeColor={(node) => {
              const nodeType = nodeTypes.flat().find(cat => 
                cat.nodes?.find(n => n.type === node.data?.nodeType)
              )?.nodes?.find(n => n.type === node.data?.nodeType);
              return nodeType?.color || '#e0e0e0';
            }}
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #d9d9d9",
              borderRadius: "6px",
            }}
          />
          <Controls
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #d9d9d9",
              borderRadius: "6px",
            }}
          />
          <Panel position="top-center">
            <div style={{
              background: "rgba(255, 255, 255, 0.95)",
              padding: "8px 16px",
              borderRadius: "20px",
              border: "1px solid #d9d9d9",
              fontSize: "12px",
              color: "#666"
            }}>
              Drag nodes from the panel to build your workflow
            </div>
          </Panel>
        </ReactFlow>
        </div>

        {/* Preview Panel - Dify.ai style */}
        {previewVisible && (
          <div style={{
            width: "400px",
            background: "#fff",
            borderLeft: "1px solid #e8e8e8",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-2px 0 8px rgba(0,0,0,0.1)"
          }}>
            {/* Preview Header */}
            <div style={{
              padding: "16px",
              borderBottom: "1px solid #e8e8e8",
              background: "#fafafa",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <EyeOutlined style={{ color: "#1890ff" }} />
                <Text strong>Workflow Preview</Text>
              </div>
              <div>
                <Button 
                  type="text" 
                  size="small" 
                  onClick={clearTestMessages}
                  style={{ marginRight: "8px" }}
                >
                  Clear
                </Button>
                <Button 
                  type="text" 
                  size="small" 
                  icon={<CloseOutlined />}
                  onClick={() => setPreviewVisible(false)}
                />
              </div>
            </div>

            {/* Workflow Info */}
            <div style={{
              padding: "12px 16px",
              background: "#f0f9ff",
              borderBottom: "1px solid #e8e8e8"
            }}>
              <Text style={{ fontSize: "12px", color: "#666" }}>
                Nodes: {nodes.length} | Connections: {edges.length}
              </Text>
            </div>

            {/* Test Messages Area */}
            <div style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              background: "#fafafa"
            }}>
              {testMessages.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#999"
                }}>
                  <PlayCircleOutlined style={{ fontSize: "32px", marginBottom: "12px", display: "block" }} />
                  <Text type="secondary">Test your workflow by sending a message below</Text>
                </div>
              ) : (
                <List
                  dataSource={testMessages}
                  renderItem={(message) => (
                    <List.Item style={{ border: "none", padding: "8px 0" }}>
                      <div style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: message.type === "user" ? "flex-end" : "flex-start"
                      }}>
                        <div style={{
                          maxWidth: "85%",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          flexDirection: message.type === "user" ? "row-reverse" : "row"
                        }}>
                          <Avatar 
                            icon={message.type === "user" ? <UserOutlined /> : <RobotOutlined />}
                            size="small"
                            style={{
                              background: message.type === "user" ? "#1890ff" : "#52c41a",
                              flexShrink: 0
                            }}
                          />
                          <div>
                            <div style={{
                              background: message.type === "user" ? "#1890ff" : "#fff",
                              color: message.type === "user" ? "#fff" : "#333",
                              padding: "8px 12px",
                              borderRadius: "12px",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                              border: message.type === "assistant" ? "1px solid #f0f0f0" : "none",
                              fontSize: "13px",
                              lineHeight: "1.4"
                            }}>
                              {message.content}
                            </div>
                            <div style={{
                              fontSize: "10px",
                              color: "#999",
                              marginTop: "4px",
                              textAlign: message.type === "user" ? "right" : "left"
                            }}>
                              {message.timestamp}
                            </div>
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              )}
              {isRunning && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px",
                  background: "#fff",
                  borderRadius: "12px",
                  marginTop: "8px",
                  border: "1px solid #f0f0f0"
                }}>
                  <Avatar icon={<RobotOutlined />} size="small" style={{ background: "#52c41a" }} />
                  <Spin size="small" />
                  <Text style={{ fontSize: "13px", color: "#666" }}>Processing workflow...</Text>
                </div>
              )}
            </div>

            {/* Test Input Area */}
            <div style={{
              padding: "16px",
              borderTop: "1px solid #e8e8e8",
              background: "#fff"
            }}>
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  placeholder="Enter test input..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onPressEnter={runWorkflowTest}
                  disabled={isRunning}
                  style={{
                    borderRadius: "6px 0 0 6px",
                    fontSize: "13px"
                  }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={runWorkflowTest}
                  disabled={isRunning || !testInput.trim()}
                  style={{
                    borderRadius: "0 6px 6px 0"
                  }}
                >
                  Test
                </Button>
              </Space.Compact>
              <Text style={{ fontSize: "11px", color: "#999", marginTop: "8px", display: "block" }}>
                Test your workflow with sample inputs
              </Text>
            </div>
          </div>
        )}
      </div>

      {/* Node palette drawer - Dify style */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <PlusOutlined style={{ color: "#1890ff" }} />
            <span>Add Nodes</span>
          </div>
        }
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={320}
        bodyStyle={{ padding: "16px" }}
      >
        {nodeTypes.map((category, categoryIndex) => (
          <div key={categoryIndex} style={{ marginBottom: "24px" }}>
            <Text strong style={{ 
              fontSize: "14px", 
              color: "#262626",
              marginBottom: "12px",
              display: "block"
            }}>
              {category.category}
            </Text>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {category.nodes.map((nodeType, nodeIndex) => (
                <div
                  key={nodeIndex}
                  draggable
                  onDragStart={(event) => onDragStart(event, nodeType)}
                  onClick={() => addNode(nodeType)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    background: "#fff",
                    border: `1px solid ${nodeType.color}30`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    borderLeft: `4px solid ${nodeType.color}`
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = `0 4px 12px ${nodeType.color}20`;
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = "none";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ 
                    color: nodeType.color, 
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center"
                  }}>
                    {nodeType.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: "500", fontSize: "13px" }}>
                      {nodeType.label}
                    </div>
                    <div style={{ fontSize: "11px", color: "#8c8c8c" }}>
                      Click or drag to add
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Drawer>

      {/* Settings drawer */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SettingOutlined style={{ color: "#1890ff" }} />
            <span>Workflow Settings</span>
          </div>
        }
        placement="right"
        onClose={() => setSettingsVisible(false)}
        open={settingsVisible}
        width={400}
        bodyStyle={{ padding: "16px" }}
        extra={
          <Button size="small" onClick={resetSettings}>
            Reset to Default
          </Button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* General Settings */}
          <div>
            <Title level={5} style={{ marginBottom: "16px", color: "#262626" }}>
              General
            </Title>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text strong>Auto Save</Text>
                  <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                    Automatically save workflow changes
                  </div>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onChange={(checked) => updateSetting('autoSave', checked)}
                />
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text strong>Snap to Grid</Text>
                  <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                    Align nodes to grid when moving
                  </div>
                </div>
                <Switch
                  checked={settings.snapToGrid}
                  onChange={(checked) => updateSetting('snapToGrid', checked)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text strong>Show Node Labels</Text>
                  <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                    Display labels on workflow nodes
                  </div>
                </div>
                <Switch
                  checked={settings.showNodeLabels}
                  onChange={(checked) => updateSetting('showNodeLabels', checked)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text strong>Enable Animations</Text>
                  <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                    Smooth transitions and animations
                  </div>
                </div>
                <Switch
                  checked={settings.enableAnimations}
                  onChange={(checked) => updateSetting('enableAnimations', checked)}
                />
              </div>
            </div>
          </div>

          {/* Canvas Settings */}
          <div>
            <Title level={5} style={{ marginBottom: "16px", color: "#262626" }}>
              Canvas
            </Title>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text strong>Show Mini Map</Text>
                  <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                    Display navigation mini map
                  </div>
                </div>
                <Switch
                  checked={settings.showMiniMap}
                  onChange={(checked) => updateSetting('showMiniMap', checked)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Text strong>Show Background</Text>
                  <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                    Display canvas background pattern
                  </div>
                </div>
                <Switch
                  checked={settings.showBackground}
                  onChange={(checked) => updateSetting('showBackground', checked)}
                />
              </div>

              <div>
                <Text strong style={{ display: "block", marginBottom: "8px" }}>Background Pattern</Text>
                <Select
                  value={settings.backgroundType}
                  onChange={(value) => updateSetting('backgroundType', value)}
                  style={{ width: "100%" }}
                  disabled={!settings.showBackground}
                >
                  <Select.Option value="dots">Dots</Select.Option>
                  <Select.Option value="lines">Lines</Select.Option>
                  <Select.Option value="cross">Cross</Select.Option>
                </Select>
              </div>

              <div>
                <Text strong style={{ display: "block", marginBottom: "8px" }}>
                  Node Spacing: {settings.nodeSpacing}px
                </Text>
                <Slider
                  min={100}
                  max={300}
                  value={settings.nodeSpacing}
                  onChange={(value) => updateSetting('nodeSpacing', value)}
                  marks={{
                    100: '100px',
                    150: '150px',
                    200: '200px',
                    250: '250px',
                    300: '300px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Connection Settings */}
          <div>
            <Title level={5} style={{ marginBottom: "16px", color: "#262626" }}>
              Connections
            </Title>
            <div>
              <Text strong style={{ display: "block", marginBottom: "8px" }}>Edge Type</Text>
              <Select
                value={settings.edgeType}
                onChange={(value) => updateSetting('edgeType', value)}
                style={{ width: "100%" }}
              >
                <Select.Option value="default">Default</Select.Option>
                <Select.Option value="straight">Straight</Select.Option>
                <Select.Option value="step">Step</Select.Option>
                <Select.Option value="smoothstep">Smooth Step</Select.Option>
              </Select>
            </div>
          </div>

          {/* Appearance Settings */}
          <div>
            <Title level={5} style={{ marginBottom: "16px", color: "#262626" }}>
              Appearance
            </Title>
            <div>
              <Text strong style={{ display: "block", marginBottom: "8px" }}>Theme</Text>
              <Select
                value={settings.theme}
                onChange={(value) => updateSetting('theme', value)}
                style={{ width: "100%" }}
              >
                <Select.Option value="light">Light</Select.Option>
                <Select.Option value="dark">Dark</Select.Option>
              </Select>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Node Settings drawer */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {selectedNode && (
              <>
                <div style={{ 
                  color: selectedNode.data.nodeType === 'llm' ? '#6366f1' : 
                        selectedNode.data.nodeType === 'knowledge' ? '#10b981' :
                        selectedNode.data.nodeType === 'answer' ? '#f59e0b' :
                        selectedNode.data.nodeType === 'agent' ? '#8b5cf6' :
                        selectedNode.data.nodeType === 'classifier' ? '#10b981' :
                        selectedNode.data.nodeType === 'ifelse' ? '#06b6d4' :
                        selectedNode.data.nodeType === 'code' ? '#6366f1' :
                        selectedNode.data.nodeType === 'http_request' ? '#8b5cf6' : '#666',
                  fontSize: "16px"
                }}>
                  {selectedNode.data.nodeType === 'llm' ? <RobotOutlined /> :
                   selectedNode.data.nodeType === 'knowledge' ? <DatabaseOutlined /> :
                   selectedNode.data.nodeType === 'answer' ? <MessageOutlined /> :
                   selectedNode.data.nodeType === 'agent' ? <SmileOutlined /> :
                   selectedNode.data.nodeType === 'classifier' ? <FilterOutlined /> :
                   selectedNode.data.nodeType === 'ifelse' ? <BranchesOutlined /> :
                   selectedNode.data.nodeType === 'code' ? <CodeOutlined /> :
                   selectedNode.data.nodeType === 'http_request' ? <ApiOutlined /> : <SettingOutlined />}
                </div>
                <span>{selectedNode.data.label} Settings</span>
              </>
            )}
          </div>
        }
        placement="right"
        onClose={() => setNodeSettingsVisible(false)}
        open={nodeSettingsVisible}
        width={400}
        bodyStyle={{ padding: "16px" }}
      >
        {selectedNode && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Basic Node Info */}
            <div>
              <Title level={5} style={{ marginBottom: "16px", color: "#262626" }}>
                Basic Information
              </Title>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <Text strong style={{ display: "block", marginBottom: "8px" }}>Node Label</Text>
                  <Input
                    value={selectedNode.data.label || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                    placeholder="Enter node label"
                  />
                </div>
                
                <div>
                  <Text strong style={{ display: "block", marginBottom: "8px" }}>Description</Text>
                  <Input.TextArea
                    value={selectedNode.data.description || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                    placeholder="Enter node description"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Node Type Specific Settings */}
            {selectedNode.data.nodeType === 'llm' && (
              <div>
                <Title level={5} style={{ marginBottom: "16px", color: "#262626" }}>
                  LLM Configuration
                </Title>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Model</Text>
                    <Select
                      value={selectedNode.data.model || 'gpt-3.5-turbo'}
                      onChange={(value) => updateNodeData(selectedNode.id, { model: value })}
                      style={{ width: "100%" }}
                    >
                      <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
                      <Select.Option value="gpt-4">GPT-4</Select.Option>
                      <Select.Option value="claude-3">Claude 3</Select.Option>
                    </Select>
                  </div>
                  
                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>
                      Temperature: {selectedNode.data.temperature || 0.7}
                    </Text>
                    <Slider
                      min={0}
                      max={2}
                      step={0.1}
                      value={selectedNode.data.temperature || 0.7}
                      onChange={(value) => updateNodeData(selectedNode.id, { temperature: value })}
                      marks={{
                        0: '0',
                        0.5: '0.5',
                        1: '1',
                        1.5: '1.5',
                        2: '2'
                      }}
                    />
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>System Prompt</Text>
                    <Input.TextArea
                      value={selectedNode.data.systemPrompt || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { systemPrompt: e.target.value })}
                      placeholder="Enter system prompt"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedNode.data.nodeType === 'knowledge' && (
              <div>
                <Title level={5} style={{ marginBottom: "16px", color: "#262626" }}>
                  Knowledge Retrieval
                </Title>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Knowledge Base</Text>
                    <Select
                      value={selectedNode.data.knowledgeBase || ''}
                      onChange={(value) => updateNodeData(selectedNode.id, { knowledgeBase: value })}
                      style={{ width: "100%" }}
                      placeholder="Select knowledge base"
                    >
                      <Select.Option value="docs">Documentation</Select.Option>
                      <Select.Option value="faq">FAQ</Select.Option>
                      <Select.Option value="manual">User Manual</Select.Option>
                    </Select>
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>
                      Top K Results: {selectedNode.data.topK || 5}
                    </Text>
                    <Slider
                      min={1}
                      max={20}
                      value={selectedNode.data.topK || 5}
                      onChange={(value) => updateNodeData(selectedNode.id, { topK: value })}
                      marks={{
                        1: '1',
                        5: '5',
                        10: '10',
                        20: '20'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedNode.data.nodeType === 'http_request' && (
              <div>
                <Title level={5} style={{ marginBottom: "16px", color: "#262626" }}>
                  HTTP Request
                </Title>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Method</Text>
                    <Select
                      value={selectedNode.data.method || 'GET'}
                      onChange={(value) => updateNodeData(selectedNode.id, { method: value })}
                      style={{ width: "100%" }}
                    >
                      <Select.Option value="GET">GET</Select.Option>
                      <Select.Option value="POST">POST</Select.Option>
                      <Select.Option value="PUT">PUT</Select.Option>
                      <Select.Option value="DELETE">DELETE</Select.Option>
                    </Select>
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>URL</Text>
                    <Input
                      value={selectedNode.data.url || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { url: e.target.value })}
                      placeholder="https://api.example.com/endpoint"
                    />
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Headers</Text>
                    <Input.TextArea
                      value={selectedNode.data.headers || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { headers: e.target.value })}
                      placeholder='{"Content-Type": "application/json"}'
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedNode.data.nodeType === 'code' && (
              <div>
                <Title level={5} style={{ marginBottom: "16px", color: "#262626" }}>
                  Code Execution
                </Title>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Language</Text>
                    <Select
                      value={selectedNode.data.language || 'python'}
                      onChange={(value) => updateNodeData(selectedNode.id, { language: value })}
                      style={{ width: "100%" }}
                    >
                      <Select.Option value="python">Python</Select.Option>
                      <Select.Option value="javascript">JavaScript</Select.Option>
                      <Select.Option value="sql">SQL</Select.Option>
                    </Select>
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Code</Text>
                    <Input.TextArea
                      value={selectedNode.data.code || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { code: e.target.value })}
                      placeholder="# Enter your code here"
                      rows={6}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
