import React, { useState, useEffect } from 'react';
import { Modal, Input, List, Avatar, Button, Typography, Spin, Empty, Pagination } from 'antd';
import { SearchOutlined, CheckOutlined, DatabaseOutlined } from '@ant-design/icons';
import {getSearchKnowledge} from '../../api/api';

const { Text } = Typography;

const KnowledgeSelectionModal = ({ visible, onCancel, onSelect, selectedKnowledgeIds = [] }) => {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [knowledgeList, setKnowledgeList] = useState([]);
  const [selectedKnowledge, setSelectedKnowledge] = useState(new Set(selectedKnowledgeIds));
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchTimeout, setSearchTimeout] = useState(null);

  const fetchKnowledge = async (search = '') => {
    try {
      setLoading(true);
      const response = await getSearchKnowledge({
          page: pagination.current,
          per_page: pagination.pageSize,
          keyword: search,
      });
      const { items, total } = response.data;
      setKnowledgeList(items);
      setPagination(prev => ({ ...prev, total }));
    } catch (error) {
      console.error('Error fetching knowledge:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchKnowledge(searchText);
    }
  }, [visible, pagination.current, pagination.pageSize]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      fetchKnowledge(searchText);
    }, 500);
    
    setSearchTimeout(timeout);
    
    return () => clearTimeout(timeout);
  }, [searchText]);

  const handleSearch = (e) => {
    setSearchText(e.target.value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleSelect = () => {
    if (selectedKnowledge.size > 0) {
      const selectedItems = knowledgeList.filter(item => selectedKnowledge.has(item.uuid));
      onSelect(selectedItems);
      handleCancel();
    }
  };

  const handleCancel = () => {
    setSearchText('');
    setSelectedKnowledge(new Set(selectedKnowledgeIds));
    onCancel();
  };

  const toggleKnowledgeSelection = (knowledgeId) => {
    setSelectedKnowledge(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(knowledgeId)) {
        newSelection.delete(knowledgeId);
      } else {
        newSelection.add(knowledgeId);
      }
      return newSelection;
    });
  };

  return (
    <Modal
      title="Select Knowledge Base"
      open={visible}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button 
          key="select" 
          type="primary" 
          onClick={handleSelect}
          disabled={selectedKnowledge.size === 0}
        >
          Select
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search knowledge bases..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={handleSearch}
          allowClear
        />
      </div>
      
      <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <Spin size="large" />
          </div>
        ) : knowledgeList.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={knowledgeList}
            renderItem={(item) => (
              <List.Item
                onClick={() => toggleKnowledgeSelection(item.uuid)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedKnowledge.has(item.uuid) ? '#f0f7ff' : 'transparent',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  border: `1px solid ${selectedKnowledge.has(item.uuid) ? '#1890ff' : '#f0f0f0'}`,
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      icon={<DatabaseOutlined />} 
                      style={{ backgroundColor: selectedKnowledge.has(item.uuid) ? '#1890ff' : '#d9d9d9' }}
                    />
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{item.name}</Text>
                      {selectedKnowledge.has(item.uuid) && <CheckOutlined style={{ color: '#52c41a' }} />}
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary" ellipsis style={{ maxWidth: '100%', display: 'block' }}>
                        {item.description || 'No description'}
                      </Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Documents: {item.document_count || 0}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>No knowledge bases found</span>
            }
          />
        )}
      </div>
      
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Pagination
          size="small"
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={(page, pageSize) => setPagination(prev => ({ ...prev, current: page, pageSize }))}
          showSizeChanger
          showQuickJumper
          showTotal={(total) => `Total ${total} items`}
        />
      </div>
    </Modal>
  );
};

export default KnowledgeSelectionModal;
