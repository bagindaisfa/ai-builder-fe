import React, { useState } from 'react';
import { Modal, Image, Typography, Button } from 'antd';
import { EyeOutlined, FileImageOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Component to preview uploaded images
 * @param {Object} props - Component props
 * @param {string} props.filename - Name of the image file
 * @param {string} props.path - Path to the image file (server-side)
 * @param {string} props.url - URL to the image (if available)
 */
const ImagePreview = ({ filename, path, url }) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  // For server-side images, we might not have a direct URL
  // In a real app, you'd have an endpoint to serve these images
  const imageUrl = url || `/api/files/${encodeURIComponent(path)}`;

  const handlePreview = () => {
    setPreviewVisible(true);
    setPreviewError(false);
  };

  const handleClose = () => {
    setPreviewVisible(false);
  };

  const handleError = () => {
    setPreviewError(true);
  };

  return (
    <>
      <Button 
        type="text" 
        size="small" 
        icon={<EyeOutlined />} 
        onClick={handlePreview}
        style={{ padding: '0 4px' }}
      />
      
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={handleClose}
        title={`Image Preview: ${filename}`}
        width={800}
        centered
      >
        {previewError ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            background: '#f5f5f5',
            borderRadius: '8px'
          }}>
            <FileImageOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
            <Text>
              Unable to preview this image. The image may be unavailable or in an unsupported format.
            </Text>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Image
              alt={filename}
              src={imageUrl}
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
              onError={handleError}
              preview={false}
            />
          </div>
        )}
      </Modal>
    </>
  );
};

export default ImagePreview;
