// Initialize nodes and edges from initialData if available
export const getInitialNodes = (initialData) => {
  if (initialData?.nodes?.length > 0) {
    return initialData.nodes;
  }

  // Default nodes if no initial data
  return [
    {
      id: `start-${Date.now()}`,
      type: 'custom',
      data: {
        label: 'Start',
        nodeType: 'start',
        description: 'Workflow entry point',
        color: '#52c41a',
      },
      position: { x: 100, y: 100 },
    },
    {
      id: `llm-${Date.now() + 1}`,
      type: 'custom',
      data: {
        label: 'LLM Node',
        nodeType: 'llm',
        description: 'LLM Node',
        color: '#6366f1',
      },
      position: { x: 400, y: 100 },
    },
    {
      id: `answer-${Date.now() + 2}`,
      type: 'custom',
      data: {
        label: 'Answer',
        nodeType: 'answer',
        description: 'Answer Node',
        color: '#f59e0b',
      },
      position: { x: 700, y: 100 },
    },
  ];
};

export const getInitialEdges = (initialData, initialNodes, isDarkMode) => {
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
      animated: true,
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
      animated: true,
    },
  ];
};
