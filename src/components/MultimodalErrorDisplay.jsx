import React from 'react';
import { Alert, Typography, Space } from 'antd';
import { FileImageOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Component to display multimodal-specific errors in a user-friendly way
 * @param {Object} props - Component props
 * @param {string} props.error - Error message to display
 * @param {string} props.nodeId - ID of the node that encountered the error
 */
const MultimodalErrorDisplay = ({ error, nodeId }) => {
  // Check if this is a multimodal error
  const isMultimodalError = error && 
    (error.includes('multimodal') || 
     error.includes('image') || 
     error.includes('model') ||
     error.includes('gemma3') ||
     error.includes('llava'));

  if (!isMultimodalError) {
    return null;
  }

  // Determine error type for appropriate styling and icon
  let errorType = 'error';
  let icon = <WarningOutlined />;
  let title = 'Multimodal Error';
  
  if (error.includes('model') && (error.includes('support') || error.includes('compatible'))) {
    errorType = 'warning';
    icon = <InfoCircleOutlined />;
    title = 'Model Compatibility Issue';
  } else if (error.includes('file') && (error.includes('not found') || error.includes('deleted'))) {
    errorType = 'warning';
    icon = <FileImageOutlined />;
    title = 'Image File Issue';
  }

  return (
    <Alert
      message={title}
      description={
        <Space direction="vertical">
          <Text>{error}</Text>
          {errorType === 'warning' && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Make sure you've selected a multimodal-capable model and provided valid image files.
            </Text>
          )}
        </Space>
      }
      type={errorType}
      showIcon
      icon={icon}
      style={{ marginBottom: '16px' }}
    />
  );
};

export default MultimodalErrorDisplay;
