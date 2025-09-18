import React, { useState, useEffect, useRef } from 'react';
import { Input, List, Popover, Typography, Badge, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getWorkflowVariables } from '../api/api';

const { Text } = Typography;

const VariableSelector = ({
  workflowUuid,
  currentNodeId,
  onSelect,
  children,
  style,
}) => {
  const [visible, setVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible && workflowUuid) {
      fetchVariables();
    }
  }, [visible, workflowUuid, currentNodeId]);

  const fetchVariables = async () => {
    if (!workflowUuid || !currentNodeId) {
      setVariables([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const variables = await getWorkflowVariables(workflowUuid, currentNodeId);
      console.log('Variables fetched:', variables);
      setVariables(Array.isArray(variables) ? variables : []);
    } catch (error) {
      console.error('Error fetching variables:', error);
      message.error('Failed to load variables');
      setError(error.message || 'Failed to load variables');
      setVariables([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (nodeId, variableName) => {
    const variable = `{{${nodeId}.${variableName}}}`;
    onSelect(variable);
    setVisible(false);
  };

  const filteredVariables = variables
    .map((node) => ({
      ...node,
      outputs: node.outputs.filter(
        (output) =>
          output.name.toLowerCase().includes(searchText.toLowerCase()) ||
          node.node_name.toLowerCase().includes(searchText.toLowerCase())
      ),
    }))
    .filter((node) => node.outputs.length > 0);

  const content = (
    <div style={{ width: 400 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="Search variables..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      </div>
      <div style={{ maxHeight: 300, overflow: 'auto', minHeight: 100 }}>
        <List
          size="small"
          loading={loading}
          locale={{
            emptyText: loading
              ? 'Loading variables...'
              : error
              ? `Error: ${error}`
              : 'No variables available',
          }}
          dataSource={filteredVariables}
          renderItem={(node) => (
            <List.Item key={node.node_id} style={{ padding: 0 }}>
              <List.Item.Meta
                title={
                  <div style={{ padding: '8px 12px', background: '#f9f9f9' }}>
                    <Text strong>{node.node_name}</Text>
                    <Badge
                      count={node.node_id}
                      style={{ marginLeft: 8, backgroundColor: '#1890ff' }}
                    />
                  </div>
                }
              />
              <List
                size="small"
                dataSource={node.outputs}
                renderItem={(output) => (
                  <List.Item
                    style={{ padding: '8px 16px', cursor: 'pointer' }}
                    onClick={() => handleSelect(node.node_id, output.name)}
                    className="variable-item"
                  >
                    <div>
                      <div>
                        <Text code>{output.name}</Text>
                        <Text
                          type="secondary"
                          style={{ marginLeft: 8, fontSize: 12 }}
                        >
                          {output.type}
                        </Text>
                      </div>
                      {output.description && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {output.description}
                        </Text>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            </List.Item>
          )}
        />
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={visible}
      onOpenChange={setVisible}
      placement="bottomLeft"
      overlayClassName="variable-selector-popover"
    >
      {children}
    </Popover>
  );
};

export default VariableSelector;
