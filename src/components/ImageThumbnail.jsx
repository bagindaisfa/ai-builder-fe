import React, { useState } from 'react';
import { Modal, Image, Typography, Button } from 'antd';
import { EyeOutlined, FileImageOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Component to display a thumbnail of an image with preview capability
 * @param {Object} props - Component props
 * @param {string} props.filename - Name of the image file
 * @param {string} props.path - Path to the image file (server-side)
 * @param {string} props.url - URL to the image (if available)
 * @param {string} props.base64 - Base64 encoded image data (if available)
 * @param {string} props.size - Size of the thumbnail (small, medium, large)
 */
const ImageThumbnail = ({ filename, path, url, base64, size = 'small' }) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  // Determine the image source
  let imageSource = '';
  if (base64) {
    // If base64 data is provided, use it directly
    imageSource = `data:image/jpeg;base64,${base64}`;
  } else if (url) {
    // If URL is provided, use it
    imageSource = url;
  } else if (path) {
    // For server-side images, we might need an endpoint to serve these images
    imageSource = `/api/files/${encodeURIComponent(path)}`;
  }

  // Determine thumbnail size
  const sizeMap = {
    small: { width: 40, height: 40 },
    medium: { width: 80, height: 80 },
    large: { width: 120, height: 120 }
  };
  const { width, height } = sizeMap[size] || sizeMap.small;

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
      <div 
        onClick={handlePreview}
        style={{ 
          cursor: 'pointer',
          position: 'relative',
          width,
          height,
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid #d9d9d9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f0f0'
        }}
      >
        {imageSource ? (
          <Image
            src={imageSource}
            alt={filename}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%',
              objectFit: 'cover'
            }}
            preview={false}
            onError={handleError}
          />
        ) : (
          <FileImageOutlined style={{ fontSize: '24px', color: '#bfbfbf' }} />
        )}
        
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <EyeOutlined style={{ color: '#fff', fontSize: '12px' }} />
        </div>
      </div>
      
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
              src={imageSource}
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
              onError={handleError}
            />
          </div>
        )}
      </Modal>
    </>
  );
};

export default ImageThumbnail;
