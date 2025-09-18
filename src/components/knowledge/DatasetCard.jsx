import React from 'react';
import { Card, Typography, Space, Tag } from 'antd';
import {
  FolderOpenOutlined,
  FileOutlined,
  ClockCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const DatasetCard = ({ dataset }) => {
  const navigate = useNavigate();
  const { uuid, name, document_count, updated_at, word_count, linked_app } =
    dataset;

  return (
    <Card
      style={{ width: '100%', marginBottom: 16 }}
      onClick={() => navigate(`/datasets/${uuid}`)}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <FolderOpenOutlined
          style={{ fontSize: 24, color: '#1890ff', marginRight: 12 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong ellipsis style={{ display: 'block', fontSize: 16 }}>
            {name}
          </Text>
          <Space size="middle">
            <Text type="secondary" style={{ fontSize: 12 }}>
              <FileOutlined /> {document_count}{' '}
              {document_count === 1 ? 'file' : 'files'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined />{' '}
              {new Date(updated_at).toLocaleDateString()}
            </Text>
          </Space>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: '16px' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            Words
          </Text>
          <Text strong>{formatNumber(word_count)}</Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            <LinkOutlined /> Linked Apps
          </Text>
          <Text strong>{linked_app}</Text>
        </div>
      </div>
    </Card>
  );
};

export default DatasetCard;
