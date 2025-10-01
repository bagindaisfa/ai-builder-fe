import {
  RobotOutlined,
  CodeOutlined,
  DatabaseOutlined,
  BranchesOutlined,
  ApiOutlined,
  MessageOutlined,
  SmileOutlined,
  FilterOutlined,
  FileTextOutlined,
  SyncOutlined,
  EditOutlined,
  ReloadOutlined,
  GroupOutlined,
  ScissorOutlined,
  CalculatorOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

export const nodeTypesConfig = [
  {
    category: 'Nodes',
    nodes: [
      { type: 'llm', label: 'LLM', icon: <RobotOutlined />, color: '#6366f1' },
      {
        type: 'knowledge',
        label: 'Knowledge Retrieval',
        icon: <DatabaseOutlined />,
        color: '#10b981',
      },
      {
        type: 'answer',
        label: 'Answer',
        icon: <MessageOutlined />,
        color: '#f59e0b',
      },
      {
        type: 'agent',
        label: 'Agent',
        icon: <SmileOutlined />,
        color: '#e11d48',
      },
    ],
  },
  {
    category: 'Question Understand',
    nodes: [
      {
        type: 'classifier',
        label: 'Question Classifier',
        icon: <FilterOutlined />,
        color: '#10b981',
      },
    ],
  },
  {
    category: 'Logic',
    nodes: [
      {
        type: 'ifelse',
        label: 'IF/ELSE',
        icon: <BranchesOutlined />,
        color: '#06b6d4',
      },
      {
        type: 'iteration',
        label: 'Iteration',
        icon: <ReloadOutlined />,
        color: '#06b6d4',
      },
      {
        type: 'loop',
        label: 'Loop',
        icon: <SyncOutlined />,
        color: '#06b6d4',
      },
    ],
  },
  {
    category: 'Transform',
    nodes: [
      {
        type: 'code',
        label: 'Code',
        icon: <CodeOutlined />,
        color: '#6366f1',
      },
      {
        type: 'template',
        label: 'Template',
        icon: <FileTextOutlined />,
        color: '#6366f1',
      },
      {
        type: 'variable_aggregator',
        label: 'Variable Aggregator',
        icon: <GroupOutlined />,
        color: '#6366f1',
      },
      {
        type: 'doc_extractor',
        label: 'Doc Extractor',
        icon: <ScissorOutlined />,
        color: '#10b981',
      },
      {
        type: 'variable_assigner',
        label: 'Variable Assigner',
        icon: <EditOutlined />,
        color: '#6366f1',
      },
      {
        type: 'parameter_extractor',
        label: 'Parameter Extractor',
        icon: <CalculatorOutlined />,
        color: '#6366f1',
      },
    ],
  },
  {
    category: 'Tools',
    nodes: [
      {
        type: 'http_request',
        label: 'HTTP Request',
        icon: <ApiOutlined />,
        color: '#8b5cf6',
      },
      {
        type: 'list_operator',
        label: 'List Operator',
        icon: <UnorderedListOutlined />,
        color: '#06b6d4',
      },
    ],
  },
];
