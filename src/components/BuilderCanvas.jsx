import React, { useCallback, useState, useRef, useEffect } from "react";
import { useTheme } from '../contexts/ThemeContext';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position,
  getSmoothStepPath,
} from "reactflow";
import CustomEdge from './CustomEdge';
import "reactflow/dist/style.css";
import { Button, Space, Card, Typography, Drawer, Divider, Tooltip, Input, List, Avatar, Spin, Switch, Select, Slider } from "antd";
import { 
  PlusOutlined, 
  SaveOutlined,
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
  DownOutlined,
  RightOutlined,
  FunctionOutlined,
  DeleteOutlined
} from "@ant-design/icons";
import { saveAs } from "file-saver";
import { getWorkflow, updateWorkflow, executeWorkflow, cancelWorkflow } from "../api/api";

const { Title, Text } = Typography;

// Node types configuration
const nodeTypesConfig = [
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

// Get theme-aware styles
const getThemeStyles = (isDarkMode) => ({
  container: {
    width: '100%',
    height: '100%',
    background: isDarkMode ? '#1a202c' : '#f8fafc',
  },
  node: {
    background: isDarkMode ? '#2d3748' : '#ffffff',
    border: `1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'}`,
    color: isDarkMode ? '#e2e8f0' : '#1a202c',
    hover: {
      borderColor: isDarkMode ? '#63b3ed' : '#4299e1',
      boxShadow: isDarkMode 
        ? '0 0 0 2px rgba(99, 179, 237, 0.2)'
        : '0 1px 3px rgba(0, 0, 0, 0.1)'
    }
  },
  text: {
    primary: isDarkMode ? '#e2e8f0' : '#1a202c',
    secondary: isDarkMode ? '#a0aec0' : '#4a5568',
  },
  drawer: {
    background: isDarkMode ? '#1a202c' : '#ffffff',
    border: isDarkMode ? '#2d3748' : '#e2e8f0',
    header: {
      background: isDarkMode ? '#1a202c' : '#ffffff',
      borderBottom: isDarkMode ? '1px solid #2d3748' : '1px solid #e2e8f0',
    }
  }
});

export default function BuilderCanvas({ initialData, workflowId }) {
  const { isDarkMode } = useTheme();
  const theme = getThemeStyles(isDarkMode);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [nodeSettingsVisible, setNodeSettingsVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [testInput, setTestInput] = useState("");
  const [testMessages, setTestMessages] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [activeWorkflowId, setActiveWorkflowId] = useState(null);
  
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
  
  // Initialize nodes and edges from initialData if available
  const getInitialNodes = () => {
    if (initialData?.nodes?.length > 0) {
      return initialData.nodes;
    }
    
    // Default nodes if no initial data
    return [
      {
        id: `start-${Date.now()}`,
        type: "custom",
        data: { 
          label: "Start",
          nodeType: "start",
          description: "Workflow entry point",
          color: "#52c41a"
        },
        position: { x: 100, y: 100 }
      },
      {
        id: `llm-${Date.now() + 1}`,
        type: "custom",
        data: { 
          label: "LLM Node",
          nodeType: "llm",
          description: "LLM Node",
          color: "#6366f1"
        },
        position: { x: 400, y: 100 }
      },
      {
        id: `answer-${Date.now() + 2}`,
        type: "custom",
        data: { 
          label: "Answer",
          nodeType: "answer",
          description: "Answer Node",
          color: "#f59e0b"
        },
        position: { x: 700, y: 100 }
      }
    ];
  };

  // Get initial nodes with timestamp-based IDs
  const initialNodes = getInitialNodes();
  
  // Create an initial edge connecting the start node to the LLM node
  const getInitialEdges = () => {
    if (initialData?.edges?.length > 0) {
      return initialData.edges;
    }
    
    // Default edge connecting start to LLM if no initial data
    return [
      {
        id: `edge-${Date.now()}`,
        source: initialNodes[0].id,
        target: initialNodes[1].id,
        style: {
          stroke: isDarkMode ? '#94a3b8' : '#64748b',
          strokeWidth: 2,
          opacity: 0.9,
        },
        markerEnd: {
          type: 'arrowclosed',
          color: isDarkMode ? '#94a3b8' : '#64748b',
        },
        animated: true
      },
      {
        id: `edge-${Date.now() + 1}`,
        source: initialNodes[1].id,
        target: initialNodes[2].id,
        style: {
          stroke: isDarkMode ? '#94a3b8' : '#64748b',
          strokeWidth: 2,
          opacity: 0.9,
        },
        markerEnd: {
          type: 'arrowclosed',
          color: isDarkMode ? '#94a3b8' : '#64748b',
        },
        animated: true
      }     
    ];
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(getInitialEdges());

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
      ...params,
      style: {
        stroke: isDarkMode ? '#94a3b8' : '#64748b',
        strokeWidth: 2,
        opacity: 0.9,
      },
      markerEnd: {
        type: 'arrowclosed',
        color: isDarkMode ? '#94a3b8' : '#64748b',
      },
      animated: true
    }, eds)),
    [setEdges, isDarkMode]
  );

  // Get appropriate colors based on theme
  const getThemeColors = () => ({
    text: isDarkMode ? '#e2e8f0' : '#1a202c',
    textSecondary: isDarkMode ? '#a0aec0' : '#4a5568',
    background: isDarkMode ? '#1f1f1f' : '#ffffff',
    backgroundSecondary: isDarkMode ? '#2d3748' : '#f7fafc',
    border: isDarkMode ? '#4a5568' : '#e2e8f0',
    primary: isDarkMode ? '#63b3ed' : '#3182ce',
    nodeBackground: isDarkMode ? '#2d3748' : '#ffffff',
    nodeBorder: isDarkMode ? '#4a5568' : '#e2e8f0',
    nodeText: isDarkMode ? '#e2e8f0' : '#1a202c',
    nodeTextSecondary: isDarkMode ? '#a0aec0' : '#4a5568',
  });

  const colors = getThemeColors();

  // Custom node component with right/left handles
  const CustomNode = ({ data, id }) => {
    const nodeColors = getThemeColors();
    return (
      <div style={{
        background: isDarkMode 
          ? `${data.color || '#6366f1'}20` 
          : `${data.color || '#6366f1'}10`,
        border: `2px solid ${data.color || (isDarkMode ? '#4a5568' : '#6366f1')}`,
        borderRadius: "8px",
        padding: "16px",
        minWidth: "200px",
        boxShadow: isDarkMode 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: data.color || (isDarkMode ? '#63b3ed' : '#4f46e5'),
          boxShadow: isDarkMode 
            ? '0 0 0 2px rgba(99, 179, 237, 0.2)'
            : '0 0 0 2px rgba(99, 102, 241, 0.2)'
        }
      }}>
        {id !== 'start-1' && (
          <Handle 
            type="target" 
            position={Position.Left} 
            style={{ 
              width: '10px',
              height: '10px',
              background: data.color || '#555',
              border: `2px solid ${data.color || '#555'}`,
              borderRadius: '50%'
            }} 
          />
        )}
        <div style={{ 
          textAlign: 'left', 
          fontWeight: '600',
          marginBottom: '8px',
          color: isDarkMode ? '#e2e8f0' : (data.color || '#333'),
          fontSize: '14px',
          fontFamily: 'Montserrat, sans-serif'
        }}>
          {data.label}
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: isDarkMode ? '#a0aec0' : '#4a5568',
          marginBottom: '8px',
          fontFamily: 'Montserrat, sans-serif'
        }}>
          {data.description}
        </div>
        {id !== 'start-1' && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            marginTop: '8px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: isDarkMode ? '#2d3748' : '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                background: data.color || '#999',
                borderRadius: '2px'
              }} />
            </div>
          </div>
        )}
        <Handle 
          type="source" 
          position={Position.Right} 
          style={{ 
            width: '10px',
            height: '10px',
            background: data.color || '#555',
            border: `2px solid ${data.color || '#555'}`,
            borderRadius: '50%'
          }} 
        />
      </div>
    );
  };

  // Edge types mapping
  const edgeTypes = {
    custom: CustomEdge,
  };

  // Node types mapping
  const customNodeTypes = {
    custom: CustomNode,
  };

  const addNode = (nodeType) => {
    const id = `${nodeType.type}-${Date.now()}`;
    const newNode = {
      id,
      type: 'custom',
      data: { 
        label: nodeType.label,
        nodeType: nodeType.type,
        description: `${nodeType.label} node`,
        color: nodeType.color
      },
      position: { 
        x: Math.random() * 300 + 100, 
        y: Math.random() * 200 + 100 
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

  const onInit = useCallback((instance) => {
    // You can use the instance if needed later
    // For example: instance.fitView();
  }, []);

  const exportJson = () => {
    const payload = { nodes, edges };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "workflow.json");
  };

  const saveWorkflow = async () => {
    if (!workflowId) {
      console.error('No project ID provided');
      return;
    }
    
    try {
      // Create a deep copy of nodes to avoid mutating the original state
      const nodesWithSettings = nodes.map(node => {
        // For LLM nodes, ensure all settings are included
        if (node.data.nodeType === 'llm') {
          return {
            ...node,
            data: {
              ...node.data,
              // Ensure all LLM settings are included
              settings: {
                ollamaBaseUrl: node.data.ollamaBaseUrl || 'http://localhost:11434',
                model: node.data.model || 'llama2',
                temperature: node.data.temperature ?? 0.7,
                maxTokens: node.data.maxTokens ?? 2048,
                contextWindow: node.data.contextWindow ?? 4000,
                topP: node.data.topP ?? 0.9,
                streaming: node.data.streaming ?? true,
                systemPrompt: node.data.systemPrompt || ''
              },
              // Keep all other data properties
              ...Object.keys(node.data).reduce((acc, key) => {
                if (!['ollamaBaseUrl', 'model', 'temperature', 'maxTokens', 
                      'contextWindow', 'topP', 'streaming', 'systemPrompt'].includes(key)) {
                  acc[key] = node.data[key];
                }
                return acc;
              }, {})
            }
          };
        }
        // For other node types, include all data as is
        return node;
      });

      const payload = {
        nodes: nodesWithSettings,
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'smoothstep'
        }))
      };
      
      const response = await updateWorkflow(workflowId, payload);
      message.success('Workflow saved successfully');
      return response;
    } catch (error) {
      console.error('Error saving workflow:', error);
      message.error('Failed to save workflow: ' + (error.response?.data?.message || error.message));
      throw error;
    }
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
    
    try {
      const response = await executeWorkflow(workflowId, testInput);
      const botMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: response.data.result.result || 'Workflow executed successfully',
        processSteps: response.data.result.process_steps || [],
        showProcess: false,
        timestamp: new Date().toISOString()
      };
      setTestMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error executing workflow:', error);
      message.error('Failed to execute workflow: ' + (error.response?.data?.message || error.message));
      const errorMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: 'Failed to execute workflow: ' + (error.response?.data?.message || error.message),
        timestamp: new Date().toLocaleTimeString()
      };
      setTestMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsRunning(false);
    }
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

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    
    // Remove the node
    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    
    // Remove any edges connected to this node
    setEdges((eds) => 
      eds.filter(
        (edge) => 
          edge.source !== selectedNode.id && edge.target !== selectedNode.id
      )
    );
    
    // Close the settings drawer
    setNodeSettingsVisible(false);
    setSelectedNode(null);
    
    message.success('Node deleted successfully');
  }, [selectedNode, setNodes, setEdges]);

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

  // Get node type configuration with theme support
  const getNodeTypeConfig = () => {
    return nodeTypesConfig.map(section => ({
      ...section,
      nodes: section.nodes.map(node => ({
        ...node,
        style: {
          background: isDarkMode ? 'rgba(45, 55, 72, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          border: `1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'}`,
          color: isDarkMode ? '#e2e8f0' : '#1a202c',
          '&:hover': {
            borderColor: isDarkMode ? '#63b3ed' : '#3182ce',
            boxShadow: isDarkMode 
              ? '0 0 0 2px rgba(99, 179, 237, 0.2)'
              : '0 1px 3px rgba(0, 0, 0, 0.1)'
          }
        },
      })),
    }));
  };

  const nodeTypeConfig = getNodeTypeConfig();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      background: isDarkMode ? '#1a202c' : '#f8fafc'
    }}>
      {/* Toolbar */}
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
              Workflow
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
          <Button icon={<PlayCircleOutlined />} type="primary" onClick={runWorkflowTest}>Publish</Button>
          <Button icon={<DownloadOutlined />} onClick={exportJson}>Export</Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={saveWorkflow}
            loading={false} // You can add a loading state if needed
          >
            Save Workflow
          </Button>
        </Space>
      </div>

      {/* Main content area with canvas and preview */}
      <div style={{
        flex: 1,
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row'
      }}>
        {/* Canvas area */}
        <div style={{
          flex: 1,
          position: 'relative',
          height: '100%',
          minHeight: '500px',
          background: isDarkMode ? '#1a202c' : '#f8fafc',
          transition: 'all 0.3s ease',
          overflow: 'hidden'
        }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={customNodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          fitView
          snapToGrid={settings.snapToGrid}
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: 'custom', // Use our custom edge type
            animated: settings.enableAnimations,
            style: {
              stroke: isDarkMode ? '#94a3b8' : '#64748b',
              strokeWidth: 2,
              opacity: 0.9,
            },
            markerEnd: {
              type: 'arrowclosed',
              color: isDarkMode ? '#94a3b8' : '#64748b',
            },
            pathOptions: {
              borderRadius: 8,
              offset: 10, // Add some offset between parallel edges
            },
          }}
          connectionLineStyle={{
            stroke: '#8c8c8c',
            strokeWidth: 2,
            strokeDasharray: '5,5'
          }}
          style={{ 
            width: '100%',
            height: '100%',
            background: isDarkMode ? '#1a202c' : '#f8fafc'
          }}
          nodeOrigin={[0.5, 0.5]}
          fitViewOptions={{
            padding: 0.2,
            includeHiddenNodes: false,
          }}
        >
          <Background 
            variant={settings.backgroundType}
            gap={16}
            size={1}
            color={isDarkMode ? '#2d3748' : '#e2e8f0'}
            style={{
              backgroundColor: isDarkMode ? '#1a202c' : '#f8fafc'
            }}
          />
          <MiniMap
            nodeColor={(node) => {
              const nodeType = nodeTypesConfig.flat().find(cat => 
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
              backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'}`,
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              padding: '4px'
            }}
            position="bottom-right"
          />
          <Panel position="top-center">
            <div style={{
              background: isDarkMode ? 'rgba(45, 55, 72, 0.9)' : 'rgba(255, 255, 255, 0.95)',
              padding: '8px 16px',
              borderRadius: '20px',
              border: `1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'}`,
              fontSize: '13px',
              color: isDarkMode ? '#e2e8f0' : '#4a5568',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(4px)'
            }}>
              <MenuOutlined style={{ color: isDarkMode ? '#a0aec0' : '#718096' }} />
              <span>Drag nodes from the panel to build your workflow</span>
            </div>
          </Panel>
        </ReactFlow>
        </div>

        {/* Preview Panel */}
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
                              {message.type === "assistant" && message.processSteps && (
                                <div style={{ marginBottom: "8px", background: "#f0f9ff", padding: "8px", borderRadius: "8px" }}>
                                  <div 
                                    style={{ 
                                      display: "flex", 
                                      alignItems: "center", 
                                      gap: "8px", 
                                      marginBottom: message.showProcess ? "4px" : 0,
                                      cursor: "pointer"
                                    }}
                                    onClick={() => {
                                      setTestMessages(prev => prev.map(msg => 
                                        msg.id === message.id 
                                          ? { ...msg, showProcess: !msg.showProcess } 
                                          : msg
                                      ));
                                    }}
                                  >
                                    {message.showProcess 
                                      ? <DownOutlined style={{ color: "#1890ff", fontSize: "12px" }} />
                                      : <RightOutlined style={{ color: "#1890ff", fontSize: "12px" }} />
                                    }
                                    <Text strong style={{ fontSize: "12px" }}>Workflow Process</Text>
                                    <Text type="secondary" style={{ fontSize: "11px", marginLeft: "auto" }}>
                                      {message.processSteps.length} steps
                                    </Text>
                                  </div>
                                  {message.showProcess && message.processSteps.map((step, stepIdx) => (
                                    <div key={stepIdx} style={{
                                      marginTop: "8px",
                                      padding: "8px",
                                      background: "#fff",
                                      borderRadius: "4px",
                                      border: "1px solid #e8e8f0"
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                        <div style={{
                                          width: "6px",
                                          height: "6px",
                                          borderRadius: "50%",
                                          background: step.status === "completed" ? "#52c41a" : "#1890ff"
                                        }} />
                                        <Text strong style={{ fontSize: "11px" }}>{step.label} ({step.type})</Text>
                                        <Text type="secondary" style={{ fontSize: "11px", marginLeft: "auto" }}>{step.time}ms</Text>
                                      </div>
                                      <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                                        <div><Text type="secondary">Input:</Text> {step.input || '-'}</div>
                                        <div style={{ marginTop: "2px" }}><Text type="secondary">Output:</Text> {step.output || '-'}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
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

      {/* Node palette drawer */}
      <Drawer
        title={
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            color: isDarkMode ? '#e2e8f0' : '#1a202c'
          }}>
            <PlusOutlined style={{ color: "#4299e1" }} />
            <span>Add Nodes</span>
          </div>
        }
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={320}
        headerStyle={{
          background: isDarkMode ? '#1a202c' : '#ffffff',
          borderBottom: `1px solid ${isDarkMode ? '#2d3748' : '#e2e8f0'}`,
          padding: '16px 24px',
          margin: 0,
        }}
        bodyStyle={{
          background: isDarkMode ? '#1a202c' : '#ffffff',
          padding: '16px',
          overflowY: 'auto'
        }}
        drawerStyle={{
          background: isDarkMode ? '#1a202c' : '#ffffff',
        }}
      >
        {nodeTypesConfig.map((category, categoryIndex) => (
          <div key={categoryIndex} style={{ marginBottom: '24px' }}>
            <Text style={{ 
              fontSize: '12px',
              fontWeight: 600,
              color: isDarkMode ? '#a0aec0' : '#718096',
              marginBottom: '12px',
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              paddingLeft: '4px'
            }}>
              {category.category}
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {category.nodes.map((nodeType, nodeIndex) => {
                const nodeBg = isDarkMode ? 'rgba(45, 55, 72, 0.8)' : 'rgba(255, 255, 255, 0.9)';
                const borderColor = isDarkMode ? 'rgba(74, 85, 104, 0.5)' : 'rgba(226, 232, 240, 0.8)';
                
                return (
                  <div
                    key={nodeIndex}
                    draggable
                    onDragStart={(event) => onDragStart(event, nodeType)}
                    onClick={() => addNode(nodeType)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: nodeBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backdropFilter: 'blur(4px)',
                      borderLeft: `4px solid ${nodeType.color}`,
                      '&:hover': {
                        borderColor: isDarkMode ? '#63b3ed' : '#3182ce',
                        boxShadow: isDarkMode 
                          ? '0 4px 12px rgba(99, 179, 237, 0.2)'
                          : '0 2px 8px rgba(0, 0, 0, 0.1)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.boxShadow = isDarkMode 
                        ? `0 4px 12px ${nodeType.color}20`
                        : '0 2px 8px rgba(0, 0, 0, 0.1)';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.borderColor = isDarkMode 
                        ? `${nodeType.color}80` 
                        : `${nodeType.color}60`;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.borderColor = borderColor;
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: `${nodeType.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: nodeType.color,
                      fontSize: '16px',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}>
                      {React.cloneElement(nodeType.icon, { 
                        style: { 
                          color: nodeType.color,
                          transition: 'all 0.2s ease'
                        } 
                      })}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ 
                        fontWeight: 500, 
                        fontSize: '13px',
                        color: isDarkMode ? '#e2e8f0' : '#1a202c',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'color 0.2s ease'
                      }}>
                        {nodeType.label}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: isDarkMode ? '#a0aec0' : '#718096',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'color 0.2s ease'
                      }}>
                        Click or drag to add
                      </div>
                    </div>
                  </div>
                );
              })}
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
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
            <Button 
              type="primary" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={handleDeleteNode}
              style={{
                marginLeft: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500,
                boxShadow: '0 2px 0 rgba(255, 77, 79, 0.2)'
              }}
            >
              Delete
            </Button>
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
                  Ollama Configuration
                </Title>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Ollama Base URL</Text>
                    <Input
                      value={selectedNode.data.settings?.ollamaBaseUrl || 'http://localhost:11434'}
                      onChange={(e) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, ollamaBaseUrl: e.target.value } })}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                  
                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Model</Text>
                    <Input
                      value={selectedNode.data.settings?.model || 'llama2'}
                      onChange={(e) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, model: e.target.value } })}
                      placeholder="Enter model name"
                    />
                  </div>
                  
                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Temperature</Text>
                    <Slider
                      min={0}
                      max={2}
                      step={0.1}
                      value={selectedNode.data.settings?.temperature || 0.7}
                      onChange={(value) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, temperature: value } })}
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
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Max Tokens</Text>
                    <Slider
                      min={256}
                      max={4096}
                      step={256}
                      value={selectedNode.data.settings?.maxTokens || 2048}
                      onChange={(value) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, maxTokens: value } })}
                      marks={{
                        256: '256',
                        2048: '2K',
                        4096: '4K'
                      }}
                    />
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Context Window</Text>
                    <Slider
                      min={1024}
                      max={8192}
                      step={1024}
                      value={selectedNode.data.settings?.contextWindow || 4000}
                      onChange={(value) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, contextWindow: value } })}
                      marks={{
                        1024: '1K',
                        4096: '4K',
                        8192: '8K'
                      }}
                    />
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Top P</Text>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={selectedNode.data.settings?.topP || 0.9}
                      onChange={(value) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, topP: value } })}
                      marks={{
                        0: '0',
                        0.5: '0.5',
                        1: '1'
                      }}
                    />
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>
                      Max Tokens: {selectedNode.data.settings?.maxTokens || 2048}
                    </Text>
                    <Slider
                      min={256}
                      max={8192}
                      step={256}
                      value={selectedNode.data.settings?.maxTokens || 2048}
                      onChange={(value) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, maxTokens: value } })}
                      marks={{
                        256: '256',
                        1024: '1K',
                        2048: '2K',
                        4096: '4K',
                        8192: '8K'
                      }}
                    />
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>
                      Context Window: {selectedNode.data.contextWindow || 4096}
                    </Text>
                    <Select
                      value={selectedNode.data.settings?.contextWindow || 4096}
                      onChange={(value) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, contextWindow: value } })}
                      style={{ width: "100%" }}
                    >
                      <Select.Option value={2048}>2K tokens</Select.Option>
                      <Select.Option value={4096}>4K tokens</Select.Option>
                      <Select.Option value={8192}>8K tokens</Select.Option>
                      <Select.Option value={16384}>16K tokens</Select.Option>
                      <Select.Option value={32768}>32K tokens</Select.Option>
                    </Select>
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>
                      Top P: {selectedNode.data.topP || 0.9}
                    </Text>
                    <Slider
                      min={0.1}
                      max={1}
                      step={0.1}
                      value={selectedNode.data.settings?.topP || 0.9}
                      onChange={(value) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, topP: value } })}
                      marks={{
                        0.1: '0.1',
                        0.5: '0.5',
                        0.9: '0.9',
                        1: '1.0'
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <Text strong>Stream Response</Text>
                      <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                        Enable streaming for real-time responses
                      </div>
                    </div>
                    <Switch
                      checked={selectedNode.data.settings?.streaming ?? true}
                      onChange={(checked) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, streaming: checked } })}
                    />
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>System Prompt</Text>
                    <Input.TextArea
                      value={selectedNode.data.settings?.systemPrompt || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { settings: { ...selectedNode.data.settings, systemPrompt: e.target.value } })}
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
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>Knowledge</Text>
                    <Select
                      value={selectedNode.data.knowledgeBase || 'default'}
                      onChange={(value) => updateNodeData(selectedNode.id, { knowledgeBase: value })}
                      style={{ width: "100%" }}
                      placeholder="Select knowledge base"
                    >
                      <Select.Option value="default">Default Knowledge</Select.Option>
                      <Select.Option value="project_docs">Workflow Documentation</Select.Option>
                      <Select.Option value="api_docs">API Documentation</Select.Option>
                      <Select.Option value="custom">Custom Collection</Select.Option>
                    </Select>
                  </div>

                  <div>
                    <Text strong style={{ display: "block", marginBottom: "8px" }}>
                      Top K Results: {selectedNode.data.topK || 5}
                    </Text>
                    <Slider
                      min={1}
                      max={10}
                      value={selectedNode.data.topK || 5}
                      onChange={(value) => updateNodeData(selectedNode.id, { topK: value })}
                      marks={{
                        1: '1',
                        3: '3',
                        5: '5',
                        7: '7',
                        10: '10'
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <Text strong>Use Ollama Embeddings</Text>
                      <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
                        Generate embeddings using Ollama instead of default
                      </div>
                    </div>
                    <Switch
                      checked={selectedNode.data.useOllamaEmbeddings || false}
                      onChange={(checked) => updateNodeData(selectedNode.id, { useOllamaEmbeddings: checked })}
                    />
                  </div>

                  {selectedNode.data.useOllamaEmbeddings && (
                    <div>
                      <Text strong style={{ display: "block", marginBottom: "8px" }}>Embedding Model</Text>
                      <Select
                        value={selectedNode.data.embeddingModel || 'llama2'}
                        onChange={(value) => updateNodeData(selectedNode.id, { embeddingModel: value })}
                        style={{ width: "100%" }}
                      >
                        <Select.Option value="llama2">Llama 2</Select.Option>
                        <Select.Option value="codellama">Code Llama</Select.Option>
                        <Select.Option value="mistral">Mistral</Select.Option>
                      </Select>
                    </div>
                  )}
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