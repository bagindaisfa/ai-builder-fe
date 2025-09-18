import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';

import CustomEdge from './CustomEdge';
import CustomNode from './CustomNode';
import 'reactflow/dist/style.css';
import {
  Button,
  Space,
  Typography,
  Drawer,
  Tooltip,
  Input,
  Switch,
  Select,
  Slider,
  message,
  Radio,
} from 'antd';
import {
  PlusOutlined,
  RobotOutlined,
  CodeOutlined,
  DatabaseOutlined,
  BranchesOutlined,
  ApiOutlined,
  SettingOutlined,
  MenuOutlined,
  MessageOutlined,
  SmileOutlined,
  FilterOutlined,
  DeleteOutlined,
  PartitionOutlined,
  ArrowDownOutlined,
  ArrowRightOutlined,
  CloseCircleFilled,
} from '@ant-design/icons';
import KnowledgeSelectionModal from './knowledge/KnowledgeSelectionModal';
import HttpRequestNode from './nodes/HttpRequestNode';
import { saveAs } from 'file-saver';
import VariableSelector from './VariableSelector';
import { getWorkflow, updateWorkflow, executeWorkflow } from '../api/api';
import { nodeTypesConfig } from './builderUtils/nodeTypesConfig';
import { getLayoutedElements } from './builderUtils/getLayoutedElements';
import { getInitialNodes, getInitialEdges } from './builderUtils/getInitial';
import ToolbarStudio from './builderUtils/ToolbarStudio';
import PreviewPanel from './builderUtils/PreviewPanel';
import AgentNode from './nodes/AgentNode';
import LlmNode from './nodes/LlmNode';
import AnswerNode from './nodes/AnswareNode';
import KnowledgeRetrieval from './nodes/KnowledgeRetrieval';
import CodeNode from './nodes/CodeNode';

const { Title, Text } = Typography;

// Main component wrapper with ReactFlowProvider
export default function BuilderCanvasWrapper({ initialData, workflowId }) {
  return (
    <ReactFlowProvider>
      <BuilderCanvasContent initialData={initialData} workflowId={workflowId} />
    </ReactFlowProvider>
  );
}

// Inner component with access to React Flow context
function BuilderCanvasContent({ initialData, workflowId }) {
  const { isDarkMode } = useTheme();
  const [saveWorkflowLoading, setSaveWorkflowLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Get initial nodes with timestamp-based IDs
  const initialNodes = getInitialNodes(initialData);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [nodeSettingsVisible, setNodeSettingsVisible] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [knowledgeModalVisible, setKnowledgeModalVisible] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testMessages, setTestMessages] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    getInitialEdges(initialData, initialNodes, isDarkMode)
  );

  const [workflowName, setWorkflowName] = useState('');

  const messagesEndRef = useRef(null);
  const reactFlowInstance = useReactFlow();

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    // Use setTimeout to ensure the DOM has been updated
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest',
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [testMessages, isRunning]);

  const handleDeleteEdge = useCallback(
    (edgeId) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );

  const normalizeEdges = useCallback(
    (edges) =>
      edges.map((edge) => ({
        ...edge,
        type: 'custom',
        data: {
          ...edge.data,
          onDelete: handleDeleteEdge,
        },
      })),
    [handleDeleteEdge]
  );

  // Fetch workflow data when component mounts or workflowId changes
  useEffect(() => {
    if (workflowId) {
      const fetchWorkflow = async () => {
        try {
          const response = await getWorkflow(workflowId);
          if (response.data) {
            setWorkflowName(response.data.name || '');

            // inject onDelete ke edges hasil API
            if (response.data.edges && response.data.edges.length > 0) {
              setEdges(normalizeEdges(response.data.edges));
            }
            if (response.data.nodes && response.data.nodes.length > 0) {
              setNodes(response.data.nodes);
            }
          }
        } catch (error) {
          console.error('Error fetching workflow:', error);
        }
      };

      // const fetchWorkflow = async () => {
      //   try {
      //     const response = await getWorkflow(workflowId);
      //     if (response.data && response.data.name) {
      //       setWorkflowName(response.data.name);
      //     }
      //     setActiveWorkflowId(workflowId);
      //   } catch (error) {
      //     console.error('Error fetching workflow:', error);
      //   }
      // };

      fetchWorkflow();
    }
  }, [workflowId, normalizeEdges, setNodes, setEdges]);

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
    enableAnimations: true,
    layoutDirection: 'LR', // 'TB' (top to bottom), 'LR' (left to right)
  });

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
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
            animated: true,
          },
          eds
        )
      ),
    [setEdges, isDarkMode]
  );

  // Memoized node types and edge types to prevent unnecessary re-renders
  const customNodeTypes = React.useMemo(
    () => ({
      custom: (props) => (
        <CustomNode {...props} layoutDirection={settings.layoutDirection} />
      ),
    }),
    [settings.layoutDirection]
  ); // Re-create when layout direction changes

  const edgeTypes = React.useMemo(
    () => ({
      custom: CustomEdge,
    }),
    []
  );

  const addNode = (nodeType) => {
    const newNode = {
      id: `${nodeType.type}-${Date.now()}`,
      type: 'custom',
      data: {
        label: nodeType.label,
        nodeType: nodeType.type,
        description: `${nodeType.label} node`,
        color: nodeType.color,
      },
      position: {
        x: Math.random() * 300 + 100,
        y: Math.random() * 200 + 100,
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setDrawerVisible(false);
  };

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify(nodeType)
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback((event) => {
    event.preventDefault();

    const reactFlowBounds = event.target.getBoundingClientRect();
    const nodeData = JSON.parse(
      event.dataTransfer.getData('application/reactflow')
    );

    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    };

    addNode({ ...nodeData, position });
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onInit = useCallback(() => {
    // You can use the instance if needed later
    // For example: instance.fitView();
  }, []);

  const exportJson = () => {
    const payload = { nodes, edges };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, 'workflow.json');
  };

  const saveWorkflow = async () => {
    setSaveWorkflowLoading(true);
    if (!workflowId) {
      console.error('No project ID provided');
      return;
    }

    try {
      // Create a deep copy of nodes to avoid mutating the original state
      const nodesWithSettings = nodes.map((node) => {
        // For LLM nodes, ensure all settings are included
        if (node.data.nodeType === 'llm') {
          return {
            ...node,
            data: {
              ...node.data,
              // Ensure all LLM settings are included
              settings: {
                systemPrompt: node.data.systemPrompt || '',
                userPrompt: node.data.userPrompt || '',
                ollamaBaseUrl:
                  node.data.ollamaBaseUrl || 'http://localhost:11434',
                model: node.data.model || 'llama2',
                temperature: node.data.temperature ?? 0.8,
                numCtx: node.data.numCtx ?? 2048,
                streaming: node.data.streaming ?? true,
                structuredOutput: node.data.structuredOutput || {
                  enabled: false,
                  properties: [],
                  description: '',
                },
              },
              // Keep all other data properties
              ...Object.keys(node.data).reduce((acc, key) => {
                if (
                  ![
                    'ollamaBaseUrl',
                    'model',
                    'temperature',
                    'numCtx',
                    'streaming',
                    'systemPrompt',
                  ].includes(key)
                ) {
                  acc[key] = node.data[key];
                }
                return acc;
              }, {}),
            },
          };
        }
        // For other node types, include all data as is
        return node;
      });

      const payload = {
        nodes: nodesWithSettings,
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'smoothstep',
        })),
      };

      const response = await updateWorkflow(workflowId, payload);
      messageApi.success('Workflow saved successfully');
      return response;
    } catch (error) {
      console.error('Error saving workflow:', error);
      messageApi.error(
        'Failed to save workflow: ' +
          (error.response?.data?.message || error.message)
      );
      throw error;
    } finally {
      setSaveWorkflowLoading(false);
    }
  };

  const runWorkflowTest = async () => {
    if (!testInput.trim()) return;

    setIsRunning(true);
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: testInput,
      timestamp: new Date().toLocaleTimeString(),
    };

    setTestMessages((prev) => [...prev, userMessage]);
    setTestInput('');

    try {
      // Pass the conversation_id if it exists to maintain conversation continuity
      const response = await executeWorkflow(
        workflowId,
        testInput,
        conversationId
      );

      // Extract the conversation_id from the response and store it for future requests
      const newConversationId = response.data.result.conversation_id;
      if (newConversationId) {
        setConversationId(newConversationId);
        console.log(`Using conversation ID: ${newConversationId}`);
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content:
          response.data.result.result || 'Workflow executed successfully',
        processSteps: response.data.result.process_steps || [],
        showProcess: false,
        timestamp: new Date().toISOString(),
        conversationId: newConversationId, // Store conversation_id with the message
      };
      setTestMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error executing workflow:', error);
      messageApi.error(
        'Failed to execute workflow: ' +
          (error.response?.data?.message || error.message)
      );
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content:
          'Failed to execute workflow: ' +
          (error.response?.data?.message || error.message),
        timestamp: new Date().toLocaleTimeString(),
      };
      setTestMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsRunning(false);
    }
  };

  const clearTestMessages = () => {
    setTestMessages([]);
    setConversationId(null); // Reset conversation ID when clearing messages
    console.log('Conversation cleared, conversation_id reset');
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
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
      enableAnimations: true,
      layoutDirection: 'TB',
    });
  };

  // Auto-layout function
  const onLayout = useCallback(
    (direction = 'TB') => {
      if (!nodes.length) return;

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(
          nodes,
          edges,
          direction,
          200, // Node width
          100, // Node height
          settings.nodeSpacing // Node spacing from settings
        );

      setNodes([...layoutedNodes]);

      // Center the graph after layout
      window.requestAnimationFrame(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      });
    },
    [nodes, edges, settings.nodeSpacing, reactFlowInstance, setNodes]
  );

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

    messageApi.success('Node deleted successfully');
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
      setSelectedNode((prev) => ({
        ...prev,
        data: { ...prev.data, ...newData },
      }));
    }
  };

  // Open knowledge modal handler
  const handleOpenKnowledgeModal = () => {
    setKnowledgeModalVisible(true);
  };

  // Select knowledge handler
  const handleSelectKnowledge = (knowledgeItems) => {
    updateNodeData(selectedNode.id, {
      // Use standardized knowledge_id as primary field
      knowledge_id: knowledgeItems[0]?.uuid,
      // Keep these for backward compatibility
      knowledgeBases: knowledgeItems.map((k) => ({
        id: k.uuid,
        name: k.name,
      })),
      knowledgeBase: knowledgeItems[0]?.uuid,
      knowledgeName: knowledgeItems.map((k) => k.name).join(', '),
    });
    setKnowledgeModalVisible(false);
  };

  // Remove knowledge base handler
  const handleRemoveKnowledge = (knowledgeId) => {
    const updatedKnowledgeBases = selectedNode.data.knowledgeBases.filter(
      (kb) => kb.id !== knowledgeId
    );
    updateNodeData(selectedNode.id, {
      // Update standardized knowledge_id
      knowledge_id: updatedKnowledgeBases[0]?.uuid,
      knowledgeBases: updatedKnowledgeBases,
      // For backward compatibility
      knowledgeBase: updatedKnowledgeBases[0]?.uuid,
      knowledgeName: updatedKnowledgeBases.map((k) => k.name).join(', '),
    });
  };

  return (
    <>
      {contextHolder}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          background: isDarkMode ? '#1a202c' : '#f8fafc',
        }}
      >
        <ToolbarStudio
          workflowName={workflowName}
          setDrawerVisible={setDrawerVisible}
          previewVisible={previewVisible}
          setPreviewVisible={setPreviewVisible}
          runWorkflowTest={runWorkflowTest}
          exportJson={exportJson}
          saveWorkflow={saveWorkflow}
          saveWorkflowLoading={saveWorkflowLoading}
        />

        {/* Main content area with canvas and preview */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          {/* Canvas area */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              height: '100%',
              minHeight: '500px',
              background: isDarkMode ? '#1a202c' : '#f8fafc',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
            }}
          >
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
                type: 'custom',
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
                data: { onDelete: handleDeleteEdge },
              }}
              connectionLineStyle={{
                stroke: '#8c8c8c',
                strokeWidth: 2,
                strokeDasharray: '5,5',
              }}
              style={{
                width: '100%',
                height: '100%',
                background: isDarkMode ? '#1a202c' : '#f8fafc',
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
                  backgroundColor: isDarkMode ? '#1a202c' : '#f8fafc',
                }}
              />
              <MiniMap
                nodeColor={(node) => {
                  const nodeType = nodeTypesConfig
                    .flat()
                    .find((cat) =>
                      cat.nodes?.find((n) => n.type === node.data?.nodeType)
                    )
                    ?.nodes?.find((n) => n.type === node.data?.nodeType);
                  return nodeType?.color || '#e0e0e0';
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                }}
              />
              <Controls
                style={{
                  backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'}`,
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  padding: '4px',
                }}
                position="bottom-right"
                showZoom={true}
                showFitView={true}
                showInteractive={true}
                showBackground={true}
              />

              {/* Custom controls for Auto Layout */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '140px',
                  right: '10px',
                  zIndex: 10,
                  backgroundColor: isDarkMode ? '#2d3748' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'}`,
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <Tooltip title="Settings">
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    onClick={() => setSettingsVisible(true)}
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: '0',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: isDarkMode ? '#e2e8f0' : '#1a202c',
                    }}
                  />
                </Tooltip>
                <Tooltip title="Apply Auto Layout">
                  <Button
                    type="text"
                    icon={<PartitionOutlined />}
                    onClick={() => onLayout(settings.layoutDirection)}
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: '0',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: isDarkMode ? '#e2e8f0' : '#1a202c',
                    }}
                  />
                </Tooltip>
                <Tooltip
                  title={`Toggle Direction (${
                    settings.layoutDirection === 'TB'
                      ? 'Vertical ↓'
                      : 'Horizontal →'
                  })`}
                >
                  <Button
                    type="text"
                    icon={
                      settings.layoutDirection === 'TB' ? (
                        <ArrowDownOutlined />
                      ) : (
                        <ArrowRightOutlined />
                      )
                    }
                    onClick={() => {
                      const newDirection =
                        settings.layoutDirection === 'TB' ? 'LR' : 'TB';
                      updateSetting('layoutDirection', newDirection);
                      // Optionally apply layout immediately
                      // onLayout(newDirection);
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: '0',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: isDarkMode ? '#e2e8f0' : '#1a202c',
                    }}
                  />
                </Tooltip>
              </div>
              <Panel position="top-center">
                <div
                  style={{
                    background: isDarkMode
                      ? 'rgba(45, 55, 72, 0.9)'
                      : 'rgba(255, 255, 255, 0.95)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: `1px solid ${isDarkMode ? '#4a5568' : '#e2e8f0'}`,
                    fontSize: '13px',
                    color: isDarkMode ? '#e2e8f0' : '#4a5568',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <MenuOutlined
                    style={{ color: isDarkMode ? '#a0aec0' : '#718096' }}
                  />
                  <span>Drag nodes from the panel to build your workflow</span>
                </div>
              </Panel>
            </ReactFlow>
          </div>

          {/* Preview Panel */}
          <PreviewPanel
            previewVisible={previewVisible}
            setPreviewVisible={setPreviewVisible}
            clearTestMessages={clearTestMessages}
            testMessages={testMessages}
            setTestMessages={setTestMessages}
            messagesEndRef={messagesEndRef}
            isRunning={isRunning}
            conversationId={conversationId}
            setConversationId={setConversationId}
            messageApi={messageApi}
            testInput={testInput}
            setTestInput={setTestInput}
            runWorkflowTest={runWorkflowTest}
          />
        </div>

        {/* Node palette drawer */}
        <Drawer
          title={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: isDarkMode ? '#e2e8f0' : '#1a202c',
              }}
            >
              <PlusOutlined style={{ color: '#4299e1' }} />
              <span>Add Nodes</span>
            </div>
          }
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={320}
          styles={{
            header: {
              background: isDarkMode ? '#1a202c' : '#ffffff',
              borderBottom: `1px solid ${isDarkMode ? '#2d3748' : '#e2e8f0'}`,
              padding: '16px 24px',
              margin: 0,
            },
            body: {
              background: isDarkMode ? '#1a202c' : '#ffffff',
              padding: '16px',
              overflowY: 'auto',
            },
            content: {
              background: isDarkMode ? '#1a202c' : '#ffffff',
            },
          }}
        >
          {nodeTypesConfig.map((category, categoryIndex) => (
            <div key={categoryIndex} style={{ marginBottom: '24px' }}>
              <Text
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isDarkMode ? '#a0aec0' : '#718096',
                  marginBottom: '12px',
                  display: 'block',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  paddingLeft: '4px',
                }}
              >
                {category.category}
              </Text>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {category.nodes.map((nodeType, nodeIndex) => {
                  const nodeBg = isDarkMode
                    ? 'rgba(45, 55, 72, 0.8)'
                    : 'rgba(255, 255, 255, 0.9)';
                  const borderColor = isDarkMode
                    ? 'rgba(74, 85, 104, 0.5)'
                    : 'rgba(226, 232, 240, 0.8)';

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
                          transform: 'translateY(-2px)',
                        },
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
                      <div
                        style={{
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
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {React.cloneElement(nodeType.icon, {
                          style: {
                            color: nodeType.color,
                            transition: 'all 0.2s ease',
                          },
                        })}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: '13px',
                            color: isDarkMode ? '#e2e8f0' : '#1a202c',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            transition: 'color 0.2s ease',
                          }}
                        >
                          {nodeType.label}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: isDarkMode ? '#a0aec0' : '#718096',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            transition: 'color 0.2s ease',
                          }}
                        >
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingOutlined style={{ color: '#1890ff' }} />
              <span>Workflow Settings</span>
            </div>
          }
          placement="right"
          onClose={() => setSettingsVisible(false)}
          open={settingsVisible}
          width={400}
          styles={{
            body: {
              padding: '16px',
            },
          }}
          extra={
            <Button size="small" onClick={resetSettings}>
              Reset to Default
            </Button>
          }
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            {/* General Settings */}
            <div>
              <Title
                level={5}
                style={{ marginBottom: '16px', color: '#262626' }}
              >
                General
              </Title>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Auto Save</Text>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      Automatically save workflow changes
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoSave}
                    onChange={(checked) => updateSetting('autoSave', checked)}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Snap to Grid</Text>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      Align nodes to grid when moving
                    </div>
                  </div>
                  <Switch
                    checked={settings.snapToGrid}
                    onChange={(checked) => updateSetting('snapToGrid', checked)}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Show Node Labels</Text>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      Display labels on workflow nodes
                    </div>
                  </div>
                  <Switch
                    checked={settings.showNodeLabels}
                    onChange={(checked) =>
                      updateSetting('showNodeLabels', checked)
                    }
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Enable Animations</Text>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      Smooth transitions and animations
                    </div>
                  </div>
                  <Switch
                    checked={settings.enableAnimations}
                    onChange={(checked) =>
                      updateSetting('enableAnimations', checked)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Canvas Settings */}
            <div>
              <Title
                level={5}
                style={{ marginBottom: '16px', color: '#262626' }}
              >
                Canvas
              </Title>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Show Mini Map</Text>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      Display navigation mini map
                    </div>
                  </div>
                  <Switch
                    checked={settings.showMiniMap}
                    onChange={(checked) =>
                      updateSetting('showMiniMap', checked)
                    }
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>Show Background</Text>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      Display canvas background pattern
                    </div>
                  </div>
                  <Switch
                    checked={settings.showBackground}
                    onChange={(checked) =>
                      updateSetting('showBackground', checked)
                    }
                  />
                </div>

                <div>
                  <Text
                    strong
                    style={{ display: 'block', marginBottom: '8px' }}
                  >
                    Background Pattern
                  </Text>
                  <Select
                    value={settings.backgroundType}
                    onChange={(value) => updateSetting('backgroundType', value)}
                    style={{ width: '100%' }}
                    disabled={!settings.showBackground}
                  >
                    <Select.Option value="dots">Dots</Select.Option>
                    <Select.Option value="lines">Lines</Select.Option>
                    <Select.Option value="cross">Cross</Select.Option>
                  </Select>
                </div>

                <div>
                  <Text
                    strong
                    style={{ display: 'block', marginBottom: '8px' }}
                  >
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
                      300: '300px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Connection Settings */}
            <div>
              <Title
                level={5}
                style={{ marginBottom: '16px', color: '#262626' }}
              >
                Connections
              </Title>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  Edge Type
                </Text>
                <Select
                  value={settings.edgeType}
                  onChange={(value) => updateSetting('edgeType', value)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="default">Default</Select.Option>
                  <Select.Option value="straight">Straight</Select.Option>
                  <Select.Option value="step">Step</Select.Option>
                  <Select.Option value="smoothstep">Smooth Step</Select.Option>
                </Select>
              </div>
            </div>

            {/* Layout Settings */}
            <div>
              <Title
                level={5}
                style={{ marginBottom: '16px', color: '#262626' }}
              >
                Layout
              </Title>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div>
                  <Text
                    strong
                    style={{ display: 'block', marginBottom: '8px' }}
                  >
                    Layout Direction
                  </Text>
                  <Select
                    value={settings.layoutDirection}
                    onChange={(value) =>
                      updateSetting('layoutDirection', value)
                    }
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="TB">Top to Bottom</Select.Option>
                    <Select.Option value="LR">Left to Right</Select.Option>
                  </Select>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: '8px',
                  }}
                >
                  <Button
                    type="primary"
                    icon={<PartitionOutlined />}
                    onClick={() => onLayout(settings.layoutDirection)}
                  >
                    Apply Auto Layout
                  </Button>
                </div>
              </div>
            </div>

            {/* Appearance Settings */}
            <div>
              <Title
                level={5}
                style={{ marginBottom: '16px', color: '#262626' }}
              >
                Appearance
              </Title>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  Theme
                </Text>
                <Select
                  value={settings.theme}
                  onChange={(value) => updateSetting('theme', value)}
                  style={{ width: '100%' }}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {selectedNode && (
                  <>
                    <div
                      style={{
                        color:
                          selectedNode.data.nodeType === 'llm'
                            ? '#6366f1'
                            : selectedNode.data.nodeType === 'knowledge'
                            ? '#10b981'
                            : selectedNode.data.nodeType === 'answer'
                            ? '#f59e0b'
                            : selectedNode.data.nodeType === 'agent'
                            ? '#8b5cf6'
                            : selectedNode.data.nodeType === 'classifier'
                            ? '#10b981'
                            : selectedNode.data.nodeType === 'ifelse'
                            ? '#06b6d4'
                            : selectedNode.data.nodeType === 'code'
                            ? '#6366f1'
                            : selectedNode.data.nodeType === 'http_request'
                            ? '#8b5cf6'
                            : '#666',
                        fontSize: '16px',
                      }}
                    >
                      {selectedNode.data.nodeType === 'llm' ? (
                        <RobotOutlined />
                      ) : selectedNode.data.nodeType === 'knowledge' ? (
                        <DatabaseOutlined />
                      ) : selectedNode.data.nodeType === 'answer' ? (
                        <MessageOutlined />
                      ) : selectedNode.data.nodeType === 'agent' ? (
                        <SmileOutlined />
                      ) : selectedNode.data.nodeType === 'classifier' ? (
                        <FilterOutlined />
                      ) : selectedNode.data.nodeType === 'ifelse' ? (
                        <BranchesOutlined />
                      ) : selectedNode.data.nodeType === 'code' ? (
                        <CodeOutlined />
                      ) : selectedNode.data.nodeType === 'http_request' ? (
                        <ApiOutlined />
                      ) : (
                        <SettingOutlined />
                      )}
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
                  boxShadow: '0 2px 0 rgba(255, 77, 79, 0.2)',
                }}
              >
                Delete
              </Button>
            </div>
          }
          placement="right"
          onClose={() => setNodeSettingsVisible(false)}
          open={nodeSettingsVisible}
          width={600}
          styles={{ body: { padding: '16px' } }}
        >
          {selectedNode && (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              {/* Basic Node Info */}
              <div>
                <Title
                  level={5}
                  style={{ marginBottom: '16px', color: '#262626' }}
                >
                  Basic Information
                </Title>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div>
                    <Text
                      strong
                      style={{ display: 'block', marginBottom: '8px' }}
                    >
                      Node Label
                    </Text>
                    <Input
                      value={selectedNode.data.label || ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          label: e.target.value,
                        })
                      }
                      placeholder="Enter node label"
                    />
                  </div>

                  <div>
                    <Text
                      strong
                      style={{ display: 'block', marginBottom: '8px' }}
                    >
                      Description
                    </Text>
                    <Input.TextArea
                      value={selectedNode.data.description || ''}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter node description"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Node Type Specific Settings */}
              {selectedNode.data.nodeType === 'llm' && (
                <LlmNode
                  workflowId={workflowId}
                  selectedNode={selectedNode}
                  updateNodeData={updateNodeData}
                />
              )}

              {selectedNode.data.nodeType === 'agent' && (
                <AgentNode
                  workflowId={workflowId}
                  selectedNode={selectedNode}
                  updateNodeData={updateNodeData}
                />
              )}

              {selectedNode.data.nodeType === 'answer' && (
                <AnswerNode
                  workflowId={workflowId}
                  selectedNode={selectedNode}
                  updateNodeData={updateNodeData}
                />
              )}

              {selectedNode.data.nodeType === 'knowledge' && (
                <KnowledgeRetrieval
                  workflowId={workflowId}
                  selectedNode={selectedNode}
                  updateNodeData={updateNodeData}
                  handleOpenKnowledgeModal={handleOpenKnowledgeModal}
                  handleRemoveKnowledge={handleRemoveKnowledge}
                />
              )}

              {selectedNode.data.nodeType === 'http_request' && (
                <HttpRequestNode
                  selectedNode={selectedNode}
                  workflowId={workflowId}
                  updateNodeData={updateNodeData} // Add this line
                />
              )}

              {selectedNode.data.nodeType === 'code' && (
                <CodeNode
                  selectedNode={selectedNode}
                  updateNodeData={updateNodeData}
                />
              )}
            </div>
          )}
        </Drawer>

        {/* Knowledge Selection Modal */}
        <KnowledgeSelectionModal
          visible={knowledgeModalVisible}
          onCancel={() => setKnowledgeModalVisible(false)}
          onSelect={handleSelectKnowledge}
          selectedKnowledgeIds={
            selectedNode?.data?.knowledgeBases?.map((kb) => kb.id) || []
          }
        />
      </div>
    </>
  );
}
