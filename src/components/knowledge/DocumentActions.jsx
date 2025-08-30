import React from "react";
import { Button, Space, Tooltip, Popconfirm } from "antd";
import { EyeOutlined, DownloadOutlined, DeleteOutlined } from "@ant-design/icons";

export default function DocumentActions({ 
  document, 
  onView, 
  onDownload, 
  onDelete 
}) {
  return (
    <Space size="small">
      <Tooltip title="View document">
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => onView(document.id)}
          size="small"
        />
      </Tooltip>
      
      <Tooltip title="Download document">
        <Button
          type="text"
          icon={<DownloadOutlined />}
          onClick={() => onDownload(document.id)}
          size="small"
        />
      </Tooltip>

      <Popconfirm
        title="Delete document"
        description="Are you sure you want to delete this document?"
        onConfirm={() => onDelete(document.id)}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ danger: true }}
      >
        <Tooltip title="Delete document">
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            size="small"
          />
        </Tooltip>
      </Popconfirm>
    </Space>
  );
}