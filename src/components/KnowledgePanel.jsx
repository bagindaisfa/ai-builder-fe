import React, { useState, useEffect } from 'react';
import {
  Button,
  Typography,
  Card,
  Row,
  Col,
  message,
  Flex,
  Input,
  Pagination,
  Space,
} from 'antd';
import {
  PlusOutlined,
  DatabaseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import DatasetCard from './knowledge/DatasetCard';
import CreateDatasetModal from './knowledge/CreateDatasetModal';
import { getSearchKnowledge } from '../api/api';
import GradientCard from './common/GradientCard';

const { Title, Text } = Typography;

const KnowledgePanel = () => {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    // Cleanup function to clear timeout on unmount
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

  useEffect(() => {
    fetchDatasets();
  }, [pagination.current, pagination.pageSize, searchKeyword]);

  const fetchDatasets = async () => {
    try {
      setIsLoading(true);
      const response = await getSearchKnowledge({
        page: pagination.current,
        per_page: pagination.pageSize,
        keyword: searchKeyword,
      });
      const { items, total } = response.data;
      setDatasets(items);
      setPagination((prev) => ({
        ...prev,
        total,
      }));
    } catch (error) {
      console.error('Error fetching datasets:', error);
      message.error('Failed to load datasets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchKeyword(value);

    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);

    // Set a new timeout to delay the search
    setSearchTimeout(
      setTimeout(() => {
        setPagination((prev) => ({
          ...prev,
          current: 1, // Reset to first page on new search
        }));
      }, 500)
    );
  };

  const handlePageChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const handleCreateDataset = async (newDataset) => {
    try {
      setDatasets((prev) => [newDataset, ...prev]);
      message.success(
        `Dataset created successfully with ${
          newDataset.documents?.length || 0
        } files`
      );
      setIsCreateModalVisible(false);
    } catch (error) {
      console.error('Error creating dataset:', error);
      message.error('Failed to create dataset');
    }
  };

  const handleDatasetClick = (datasetId) => {
    navigate(`/datasets/${datasetId}`);
  };

  return (
    <Flex vertical gap="large" style={{ height: '100%' }}>
      <GradientCard>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Flex align="center" gap="middle">
              <DatabaseOutlined style={{ fontSize: '24px', color: '#fff' }} />
              <div>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: '#fff',
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  Knowledge
                </Title>
                <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Manage your knowledges and documents
                </Text>
              </div>
            </Flex>
          </div>
        </div>
      </GradientCard>

      <div
        style={{
          marginTop: 10,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            marginBottom: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, maxWidth: 400 }}>
            <Input
              placeholder="Search knowledges..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={handleSearch}
              onPressEnter={() => handleSearch(searchKeyword)}
              style={{ maxWidth: 400 }}
              allowClear
            />
          </div>
          <div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalVisible(true)}
            >
              Create Knowledge
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">Loading datasets...</Text>
          </div>
        ) : datasets.length > 0 ? (
          <>
            <Row gutter={[16, 16]} style={{ flex: 0 }}>
              {datasets.map((dataset) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={dataset.id}>
                  <DatasetCard
                    dataset={dataset}
                    onClick={() => handleDatasetClick(dataset.uuid)}
                  />
                </Col>
              ))}
            </Row>

            {pagination.total > 0 && (
              <div
                style={{
                  marginTop: 16,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  onChange={handlePageChange}
                  showSizeChanger
                  showTotal={(total, range) =>
                    `${range[0]}-${range[1]} of ${total} items`
                  }
                  pageSizeOptions={['10', '20', '50', '100']}
                />
              </div>
            )}
          </>
        ) : (
          <Card style={{ textAlign: 'center', padding: '40px 0' }}>
            <DatabaseOutlined
              style={{ fontSize: 48, color: '#999', marginBottom: 16 }}
            />
            <Title level={4} style={{ marginBottom: 8 }}>
              No datasets yet
            </Title>
            <Text
              type="secondary"
              style={{ display: 'block', marginBottom: 24 }}
            >
              Create your first dataset to get started
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalVisible(true)}
            >
              Create Knowledge
            </Button>
          </Card>
        )}
      </div>

      <CreateDatasetModal
        visible={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          fetchDatasets();
        }}
        onCreate={handleCreateDataset}
      />
    </Flex>
  );
};

export default KnowledgePanel;
