import React, { useState } from "react";
import { Table, Input, Button, Space, Typography, Tag, Tooltip } from "antd";
import {
  SearchOutlined,
  FileTextOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns";

const { Text } = Typography;

const DocumentStatusBadge = ({ status }) => {
  const statusMap = {
    processing: { color: "blue", text: "Processing" },
    ready: { color: "green", text: "Ready" },
    error: { color: "red", text: "Error" },
  };

  const statusInfo = statusMap[status] || { color: "default", text: status };
  return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
};

const DocumentTable = ({
  documents = [],
  onDocumentView,
  onDocumentDownload,
  onDocumentDelete,
  enableBulkOperations = true,
  pagination = true,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const handleSearch = (e) => setSearchQuery(e.target.value || "");
  const handleStatusChange = (value) => setStatusFilter(value);
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter(null);
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!doc) return false;
    const matchesSearch =
      doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleBulkDelete = () => {
    if (selectedRowKeys.length > 0) {
      onDocumentDelete?.(selectedRowKeys);
      setSelectedRowKeys([]);
    }
  };

  const rowSelection = enableBulkOperations
    ? {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
        getCheckboxProps: (record) => ({
          disabled: record.status === "processing",
        }),
      }
    : null;

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 300,
      render: (text, record) => (
        <Space>
          <FileTextOutlined style={{ color: "#1890ff" }} />
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.type?.toUpperCase() || "FILE"}
            </Text>
          </div>
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => <DocumentStatusBadge status={status} />,
      filters: [
        { text: "Ready", value: "ready" },
        { text: "Processing", value: "processing" },
        { text: "Error", value: "error" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Uploaded",
      dataIndex: "uploadedAt",
      key: "uploadedAt",
      width: 150,
      render: (date) =>
        date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : "-",
      sorter: (a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt),
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 120,
      render: (size) => {
        if (!size) return "-";
        const kb = size / 1024;
        return kb > 1024
          ? `${(kb / 1024).toFixed(1)} MB`
          : `${Math.round(kb)} KB`;
      },
      sorter: (a, b) => (a.size || 0) - (b.size || 0),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="View">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onDocumentView?.(record)}
              disabled={record.status !== "ready"}
            />
          </Tooltip>
          <Tooltip title="Download">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => onDocumentDownload?.(record)}
              disabled={record.status !== "ready"}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDocumentDelete?.([record.id])}
              disabled={record.status === "processing"}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="document-table">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="Search documents..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={handleSearch}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Filter by status"
            style={{ width: 150 }}
            allowClear
            value={statusFilter}
            onChange={handleStatusChange}
            options={[
              { value: "ready", label: "Ready" },
              { value: "processing", label: "Processing" },
              { value: "error", label: "Error" },
            ]}
          />
          {(searchQuery || statusFilter) && (
            <Button onClick={clearFilters}>Clear filters</Button>
          )}
          {selectedRowKeys.length > 0 && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleBulkDelete}
              disabled={!enableBulkOperations}
            >
              Delete ({selectedRowKeys.length})
            </Button>
          )}
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredDocuments}
        rowSelection={rowSelection}
        pagination={
          pagination
            ? {
                pageSize: 10,
                showSizeChanger: false,
                showTotal: (total) => `${total} documents`,
              }
            : false
        }
        scroll={{ x: "max-content" }}
        rowClassName={(record) =>
          record.status === "processing" ? "processing-row" : ""
        }
      />
    </div>
  );
};

export default DocumentTable;
