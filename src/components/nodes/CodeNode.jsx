import React, { useState, useEffect } from 'react';
import { Typography, Select, Input } from 'antd';

const { Title, Text } = Typography;

const CodeNode = ({ selectedNode, updateNodeData }) => {
  // --- Local states ---
  const [language, setLanguage] = useState(
    selectedNode.data.language || 'python'
  );
  const [code, setCode] = useState(selectedNode.data.code || '');

  // Reset kalau node berubah
  useEffect(() => {
    setLanguage(selectedNode.data.language || 'python');
    setCode(selectedNode.data.code || '');
  }, [selectedNode?.id]);

  if (!selectedNode) return null;

  return (
    <div>
      <Title level={5} style={{ marginBottom: '16px', color: '#262626' }}>
        Code Execution
      </Title>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Language Selector */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            Language
          </Text>
          <Select
            value={language}
            onChange={(value) => setLanguage(value)}
            onBlur={() => updateNodeData(selectedNode.id, { language })}
            style={{ width: '100%' }}
          >
            <Select.Option value="python">Python</Select.Option>
            <Select.Option value="javascript">JavaScript</Select.Option>
            <Select.Option value="sql">SQL</Select.Option>
          </Select>
        </div>

        {/* Code Editor */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            Code
          </Text>
          <Input.TextArea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={() => updateNodeData(selectedNode.id, { code })}
            placeholder="# Enter your code here"
            rows={6}
            autoSize={{ minRows: 6, maxRows: 20 }}
            style={{
              fontFamily: 'monospace',
              whiteSpace: 'pre',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeNode;
