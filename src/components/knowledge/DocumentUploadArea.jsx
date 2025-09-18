import React, { useState } from 'react';
import {
  Upload,
  Card,
  Typography,
  Flex,
  Progress,
  message,
  Button,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export default function DocumentUploadArea({
  onDocumentUpload,
  isUploading = false,
  uploadProgress = 0,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedFileTypes = ['.pdf', '.doc', '.docx', '.txt', '.md'],
}) {
  const [fileList, setFileList] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleChange = ({ file, fileList: newFileList, event }) => {
    // Filter out files that are too large
    const filteredFileList = newFileList.filter((file) => {
      if (file.size > maxFileSize) {
        messageApi.error(
          `${file.name} is too large. Max size is ${
            maxFileSize / (1024 * 1024)
          }MB`
        );
        return false;
      }
      return true;
    });

    setFileList(filteredFileList);
  };

  const handleUpload = () => {
    if (fileList.length === 0) {
      messageApi.warning('Please select at least one file to upload');
      return;
    }

    fileList.forEach((file) => {
      onDocumentUpload(file);
    });

    // Clear file list after upload starts
    setFileList([]);
  };

  const uploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
      return false;
    },
    beforeUpload: (file) => {
      // Check file type
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!allowedFileTypes.includes(`.${fileExt}`)) {
        messageApi.error(
          `File type not supported. Allowed types: ${allowedFileTypes.join(
            ', '
          )}`
        );
        return Upload.LIST_IGNORE;
      }

      // Check file size
      if (file.size > maxFileSize) {
        messageApi.error(
          `File ${file.name} is too large. Max size is ${
            maxFileSize / (1024 * 1024)
          }MB`
        );
        return Upload.LIST_IGNORE;
      }

      return false; // Prevent auto upload
    },
    fileList,
    onChange: handleChange,
    multiple: true,
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
      showDownloadIcon: false,
    },
    accept: allowedFileTypes.join(','),
    onDrop: (e) => {
      setDragOver(false);
      // Handle dropped files
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter((file) => {
        const fileExt = file.name.split('.').pop().toLowerCase();
        return (
          allowedFileTypes.includes(`.${fileExt}`) && file.size <= maxFileSize
        );
      });

      if (validFiles.length !== files.length) {
        messageApi.warning(
          'Some files were not added due to invalid type or size'
        );
      }

      if (validFiles.length > 0) {
        setFileList((prev) => [...prev, ...validFiles]);
      }
    },
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
    disabled: isUploading,
  };

  return (
    <>
      {contextHolder}
      <Card
        style={{
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Flex vertical gap="middle">
          <Dragger
            {...uploadProps}
            style={{
              background: dragOver ? '#f0f9ff' : '#fafafa',
              border: `2px dashed ${dragOver ? '#277c90' : '#d1d5db'}`,
              borderRadius: '8px',
              transition: 'all 0.3s ease',
            }}
          >
            <Flex
              vertical
              align="center"
              gap="middle"
              style={{ padding: '32px 16px' }}
            >
              <InboxOutlined style={{ fontSize: '48px', color: '#277c90' }} />
              <div>
                <Title level={5} style={{ margin: 0, color: '#1f2937' }}>
                  Click or drag files to this area to upload
                </Title>
                <Text type="secondary">
                  Supported formats: {allowedFileTypes.join(', ').toUpperCase()}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Max file size: {maxFileSize / (1024 * 1024)}MB
              </Text>
            </Flex>
          </Dragger>

          {fileList.length > 0 && (
            <Button
              type="primary"
              onClick={handleUpload}
              loading={isUploading}
              style={{ marginTop: '8px' }}
              block
            >
              {isUploading
                ? `Uploading... ${uploadProgress}%`
                : 'Upload Selected Files'}
            </Button>
          )}

          {isUploading && (
            <Progress
              percent={uploadProgress}
              status="active"
              strokeColor={{
                '0%': '#277c90',
                '100%': '#66a0b8',
              }}
            />
          )}
        </Flex>
      </Card>
    </>
  );
}
