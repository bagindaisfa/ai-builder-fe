import React, { useState, useEffect } from 'react';
import { Typography, Button, Input } from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import VariableSelector from '../VariableSelector';

const { Title, Text } = Typography;

const AnswerNode = ({ workflowId, selectedNode, updateNodeData }) => {
  const [answerText, setAnswerText] = useState(
    selectedNode?.data?.settings?.answerText || ''
  );

  // Update local state kalau node berubah
  useEffect(() => {
    setAnswerText(selectedNode?.data?.settings?.answerText || '');
  }, [selectedNode?.id]);

  if (!selectedNode) return null;

  return (
    <div>
      <Title level={5} style={{ marginBottom: '16px', color: '#262626' }}>
        Answer Configuration
      </Title>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <Text strong>Answer Text</Text>
            <VariableSelector
              workflowUuid={workflowId}
              currentNodeId={selectedNode.id}
              onSelect={(variable) => {
                setAnswerText((prev) => prev + variable);
                updateNodeData(selectedNode.id, {
                  settings: {
                    ...selectedNode.data.settings,
                    answerText: (answerText || '') + variable,
                  },
                });
              }}
            >
              <Button
                size="small"
                icon={<CodeOutlined />}
                style={{ marginLeft: 8 }}
              >
                Insert Variable
              </Button>
            </VariableSelector>
          </div>
          <Input.TextArea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            onBlur={() =>
              updateNodeData(selectedNode.id, {
                settings: {
                  ...selectedNode.data.settings,
                  answerText,
                },
              })
            }
            placeholder="Enter the answer text"
            rows={6}
            style={{ minHeight: '120px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default AnswerNode;
