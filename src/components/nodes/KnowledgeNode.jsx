import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Typography, Tag } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';

const { Text } = Typography;

const KnowledgeNode = ({ data, selected }) => {
  const { label, knowledgeName } = data;

  return (
    <div className="custom-node knowledge-node">
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      <Card
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DatabaseOutlined style={{ color: '#722ed1' }} />
            <Text ellipsis style={{ maxWidth: 150 }}>
              {knowledgeName
                ? `Knowledge: ${knowledgeName}`
                : 'Select Knowledge'}
            </Text>
          </div>
        }
        headStyle={{
          backgroundColor: '#f9f0ff',
          borderBottom: '1px solid #d9d9d9',
          padding: '8px 12px',
          minHeight: 40,
        }}
        bodyStyle={{ padding: '12px' }}
        style={{
          width: 220,
          border: selected ? '2px solid #722ed1' : '1px solid #d9d9d9',
          borderRadius: 6,
          boxShadow: selected ? '0 0 10px rgba(114, 46, 209, 0.3)' : 'none',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {knowledgeName ? (
            <Tag color="purple" style={{ margin: 0 }}>
              {knowledgeName}
            </Tag>
          ) : (
            <Text
              type="secondary"
              style={{ fontSize: 12, textAlign: 'center' }}
            >
              Click to select a knowledge base
            </Text>
          )}
        </div>
      </Card>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
      <style jsx global>{`
        .knowledge-node .ant-card-head {
          min-height: 40px;
        }
        .knowledge-node .ant-card-body {
          padding: 12px;
        }
      `}</style>
    </div>
  );
};

export default KnowledgeNode;
