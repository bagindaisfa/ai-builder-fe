import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Table,
  Space,
  Input,
  Typography,
  Card,
  Tag,
  message,
  Spin,
  Modal,
} from 'antd';
import {
  LeftOutlined,
  SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import PageContainer from '../components/common/PageContainer';
import {
  getDocumentDetails,
  getDocumentChunksPaginated,
} from '../api/datasetApi';
import ChunkDetailModal from '../components/knowledge/ChunkDetailModal';

const { Title, Text } = Typography;

const DocumentChunksPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [chunks, setChunks] = useState([]);
  const [chunksTotal, setChunksTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [documentInfo, setDocumentInfo] = useState(null);
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
  });

  console.log('DocumentChunksPage mounted with documentId:', documentId);

  const fetchDocumentChunks = async (page = 1, pageSize = 10, keyword = '') => {
    console.log('Fetching document chunks with params:', {
      documentId,
      page,
      pageSize,
      keyword,
    });

    if (!documentId) {
      console.error('No documentId provided');
      setError('No document ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Calling getDocumentDetails...');
      const response = await getDocumentChunksPaginated(
        documentId,
        keyword,
        page,
        pageSize
      );
      console.log('Received response:', response);

      if (!response || !response.document) {
        throw new Error('Invalid response format');
      }

      setDocumentInfo({
        name: response.document.filename,
        type: response.document.content_type,
        size: response.document.file_size,
      });

      setChunks(response.items || []);
      setChunksTotal(response.total || 0);
      setPagination((prev) => ({
        ...prev,
        current: response.page || page,
        pageSize: response.per_page || pageSize,
        total: response.total || 0,
        totalPages: response.total_pages || 1,
      }));
    } catch (error) {
      console.error('Error in fetchDocumentChunks:', error);
      setError(error.message || 'Failed to load document chunks');
      message.error(error.message || 'Failed to load document chunks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect triggered with documentId:', documentId);
    if (documentId) {
      fetchDocumentChunks(pagination.current, pagination.pageSize, searchText);
    }
  }, [
    documentId,
    pagination.current,
    pagination.pageSize,
    searchText,
    navigate,
  ]);

  const handleTableChange = (pagination, filters, sorter) => {
    fetchDocumentChunks(pagination.current, pagination.pageSize, searchText);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchDocumentChunks(1, pagination.pageSize, value);
  };

  const handleChunkClick = (chunk) => {
    setSelectedChunk(chunk);
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Chunk #',
      dataIndex: 'chunk_index',
      key: 'chunk_index',
      width: 120,
      sorter: {
        compare: (a, b) => a.chunk_index - b.chunk_index,
        multiple: 1,
      },
      defaultSortOrder: 'ascend',
      render: (text) => <div style={{ fontWeight: 500 }}>{text + 1}</div>,
    },
    {
      title: 'Content',
      dataIndex: 'text_content',
      key: 'text_content',
      render: (text) => {
        // Truncate text to a single line for the one-liner view
        const truncatedText =
          text.length > 150
            ? text.substring(0, 150).replace(/\n/g, ' ') + '...'
            : text.replace(/\n/g, ' ');

        return (
          <div
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: 'pointer',
            }}
          >
            {truncatedText}
          </div>
        );
      },
    },
    {
      title: 'Words Count',
      dataIndex: 'word_count',
      key: 'word_count',
      width: 120,
      sorter: (a, b) => a.word_count - b.word_count,
    },
  ];

  // Render loading state
  if (loading && !documentInfo) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" tip="Loading document details..." />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Button
          type="link"
          icon={<LeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ marginBottom: '16px' }}
        >
          Back to Documents
        </Button>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Title level={4}>Error Loading Document</Title>
            <Text type="danger">{error}</Text>
            <div style={{ marginTop: '16px' }}>
              <Button type="primary" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <PageContainer>
        <div style={{ padding: '24px' }}>
          <Button
            type="link"
            icon={<LeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ marginBottom: '16px' }}
          >
            Back to Documents
          </Button>

          {documentInfo && (
            <Card style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {documentInfo.name}
                  </Title>
                  <Text type="secondary">
                    {documentInfo.type} • {documentInfo.size} • Uploaded{' '}
                    {new Date(documentInfo.uploadedAt).toLocaleDateString()}
                  </Text>
                </div>
                <Tag color="blue">{chunksTotal} Chunks</Tag>
              </div>
            </Card>
          )}

          <div
            style={{
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Input.Search
              placeholder="Search chunks..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              style={{ width: 300 }}
              allowClear
              enterButton
            />
            <Text type="secondary">
              Showing {chunks.length} of {pagination.total} chunks
            </Text>
          </div>

          <Table
            columns={columns}
            dataSource={chunks}
            rowKey="uuid"
            loading={loading}
            pagination={{
              ...pagination,
              showTotal: (total) => `Total ${total} chunks`,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            onChange={handleTableChange}
            scroll={{ y: 'calc(100vh - 350px)' }}
            onRow={(record) => ({
              onClick: () => handleChunkClick(record),
              style: { cursor: 'pointer' },
            })}
          />

          {/* Chunk Detail Modal */}
          <ChunkDetailModal
            chunk={{
              text: selectedChunk?.text_content,
              document: documentInfo ? { filename: documentInfo.name } : null,
              metadata: selectedChunk
                ? {
                    'Chunk Index': selectedChunk.chunk_index + 1,
                    'Word Count': selectedChunk.word_count,
                    Position: selectedChunk.chunk_index + 1,
                  }
                : {},
            }}
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
          />
        </div>
      </PageContainer>
    </>
  );
};

export default DocumentChunksPage;
