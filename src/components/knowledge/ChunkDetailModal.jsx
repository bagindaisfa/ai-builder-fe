import React from 'react';
import { Modal, Typography, Button } from 'antd';

const { Title, Text, Paragraph } = Typography;

const ChunkDetailModal = ({ chunk, visible, onClose }) => {
  if (!chunk) return null;

  return (
    <Modal
      title="Chunk Details"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={800}
      bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginBottom: 8 }}>Content</Title>
        <Paragraph style={{ 
          backgroundColor: '#f9f9f9', 
          padding: '12px', 
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          marginBottom: 16
        }}>
          {chunk.text || 'No content available'}
        </Paragraph>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Text strong>Similarity Score: </Text>
            <Text>{chunk.score ? chunk.score.toFixed(4) : 'N/A'}</Text>
          </div>
          
          {chunk.document?.filename && (
            <div>
              <Text strong>Source: </Text>
              <Text>{chunk.document.filename}</Text>
            </div>
          )}

          {chunk.metadata && Object.entries(chunk.metadata).map(([key, value]) => (
            <div key={key}>
              <Text strong>{key}: </Text>
              <Text>{String(value)}</Text>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default ChunkDetailModal;
