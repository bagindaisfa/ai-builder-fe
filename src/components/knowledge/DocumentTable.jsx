import React, { useState } from 'react';
import { Table, Input, Select, Space, Typography, Button, Modal } from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import DocumentStatusBadge from './DocumentStatusBadge';
import DocumentActions from './DocumentActions';
import {
  formatFileSize,
  formatUploadDate,
} from '../../data/knowledgeBaseMockData';

export default function DocumentTable({
  documents,
  onDocumentView,
  onDocumentDownload,
  onDocumentDelete,
  enableBulkOperations = true,
  pagination = true,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
  };

  // Filter documents based on search and status
  const filteredDocuments = documents.filter((doc) => {
    if (!doc || !doc.filename) return false;
    const matchesSearch = doc.filename
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      !statusFilter || doc.embedding_status === statusFilter;
    const shouldInclude = matchesSearch && matchesStatus;

    return shouldInclude;
  });

  const handleBulkDelete = () => {
    selectedRowKeys.forEach((uuid) => onDocumentDelete(uuid));
    setSelectedRowKeys([]);
  };

  const rowSelection = enableBulkOperations
    ? {
        selectedRowKeys,
        onChange: setSelectedRowKeys,
        getCheckboxProps: (record) => ({
          disabled: record.status === 'processing',
        }),
      }
    : null;

  const columns = [
    {
      title: 'Name',
      dataIndex: 'filename',
      key: 'filename',
      width: 400,
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
      sorter: (a, b) => a.filename.localeCompare(b.filename),
    },
    {
      title: 'Status',
      dataIndex: 'embedding_status',
      key: 'embedding_status',
      width: 150,
      render: (embedding_status) => (
        <DocumentStatusBadge status={embedding_status} />
      ),
      filters: [
        { text: 'Completed', value: 'completed' },
        { text: 'Pending', value: 'pending' },
        { text: 'Error', value: 'error' },
      ],
      onFilter: (value, record) => record.embedding_status === value,
    },
    {
      title: 'Uploaded',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (date) => formatUploadDate(date),
      sorter: (a, b) => new Date(a.updated_at) - new Date(b.updated_at),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size) => formatFileSize(size),
      sorter: (a, b) => a.size - b.size,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="middle">
          <DocumentActions
            document={record}
            onView={onDocumentView}
            onDownload={onDocumentDownload}
            onDelete={onDocumentDelete}
          />
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Search and Filter Controls */}
      <Space size="middle">
        <Input
          placeholder="Search documents..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={handleSearch}
          style={{ width: 250 }}
          allowClear
        />

        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={handleStatusChange}
          style={{ width: 150 }}
          allowClear
          suffixIcon={<FilterOutlined />}
        >
          <Select.Option value="completed">Completed</Select.Option>
          <Select.Option value="pending">Pending</Select.Option>
          <Select.Option value="error">Error</Select.Option>
        </Select>

        <Button type="link" onClick={clearFilters}>
          Clear filters
        </Button>
      </Space>

      {enableBulkOperations && selectedRowKeys.length > 0 && (
        <Space>
          <Typography.Text>{selectedRowKeys.length} selected</Typography.Text>
          <Button danger onClick={handleBulkDelete} size="small">
            Delete Selected
          </Button>
        </Space>
      )}

      <Table
        columns={columns}
        dataSource={filteredDocuments}
        rowKey="uuid"
        rowSelection={rowSelection}
        pagination={
          pagination
            ? {
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Total ${total} documents`,
              }
            : false
        }
        style={{ width: '100%' }}
        size="middle"
      />
    </Space>
  );
}
