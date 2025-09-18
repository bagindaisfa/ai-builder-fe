import React from 'react';
import { Button, Divider, Space, Typography } from 'antd';
import {
  NodeIndexOutlined,
  MenuOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

const ToolbarStudio = ({
  workflowName,
  setDrawerVisible,
  previewVisible,
  setPreviewVisible,
  runWorkflowTest,
  exportJson,
  saveWorkflow,
  saveWorkflowLoading,
}) => {
  return (
    <div
      style={{
        background: '#fff',
        borderBottom: '1px solid #e8e8e8',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NodeIndexOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <Title level={5} style={{ margin: 0, color: '#262626' }}>
            {workflowName}
          </Title>
        </div>
        <Divider type="vertical" style={{ height: '20px' }} />
        <Button
          type="primary"
          icon={<MenuOutlined />}
          onClick={() => setDrawerVisible(true)}
          style={{
            background: '#1890ff',
            borderColor: '#1890ff',
          }}
        >
          Add Nodes
        </Button>
      </div>
      <Space>
        <Button
          icon={<EyeOutlined />}
          onClick={() => setPreviewVisible(!previewVisible)}
          type={previewVisible ? 'primary' : 'default'}
        >
          {previewVisible ? 'Hide Preview' : 'Preview'}
        </Button>
        <Button
          icon={<PlayCircleOutlined />}
          type="primary"
          onClick={runWorkflowTest}
        >
          Publish
        </Button>
        <Button icon={<DownloadOutlined />} onClick={exportJson}>
          Export
        </Button>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={saveWorkflow}
          loading={saveWorkflowLoading}
        >
          Save Workflow
        </Button>
      </Space>
    </div>
  );
};

export default ToolbarStudio;
