import React, { useEffect, useState } from "react";
import { Upload, Button, Table, message, Card, Typography, Space } from "antd";
import { UploadOutlined, DeleteOutlined, DatabaseOutlined, CloudUploadOutlined } from "@ant-design/icons";
import { getDatasets, uploadDocument, deleteDocument } from "../api/api";

const { Title, Text } = Typography;

export default function KnowledgePanel() {
  const [list, setList] = useState([]);

  const fetch = async () => {
    try {
      const res = await getDatasets();
      setList(res.data || []);
    } catch (e) {
      console.error(e);
      message.error("Gagal ambil dataset");
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const uploadProps = {
    name: "file",
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        await uploadDocument(fd);
        onSuccess?.({}, file);
        message.success("Upload sukses");
        fetch();
      } catch (err) {
        onError?.(err);
        message.error("Upload gagal");
      }
    },
  };

  const onDelete = async (id) => {
    try {
      await deleteDocument(id);
      message.success("Deleted");
      fetch();
    } catch (e) {
      message.error("Delete gagal");
    }
  };

  const columns = [
    { 
      title: "ID", 
      dataIndex: "id", 
      key: "id",
      width: 80,
      render: (id) => (
        <Text code style={{ fontSize: "12px" }}>
          #{id}
        </Text>
      ),
    },
    {
      title: "Document Name",
      dataIndex: "name",
      key: "name",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: "14px" }}>
            {row.filename || row.name}
          </Text>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, row) => (
        <Button 
          danger 
          icon={<DeleteOutlined />}
          onClick={() => onDelete(row.id)}
          style={{
            borderRadius: "8px",
            fontWeight: "500",
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div style={{ height: "100%" }}>
      <Card
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, #277c90 0%, #66a0b8 100%)",
          border: "none",
          borderRadius: "12px",
        }}
        bodyStyle={{ padding: "16px 24px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <DatabaseOutlined style={{ fontSize: "24px", color: "#fff" }} />
            <Title level={4} style={{ margin: 0, color: "#fff", fontFamily: "'Montserrat', sans-serif" }}>
              DATACORE Knowledge Base
            </Title>
          </div>
        </div>
      </Card>

      <Card
        style={{
          marginBottom: 24,
          borderRadius: "12px",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ textAlign: "center", padding: "24px" }}>
          <CloudUploadOutlined 
            style={{ 
              fontSize: "48px", 
              color: "#277c90", 
              marginBottom: "16px",
              display: "block"
            }} 
          />
          <Title level={5} style={{ marginBottom: "8px", color: "#333" }}>
            Upload Documents
          </Title>
          <Text type="secondary" style={{ marginBottom: "16px", display: "block" }}>
            Add documents to your knowledge base for AI training
          </Text>
          <Upload {...uploadProps}>
            <Button 
              type="primary"
              icon={<UploadOutlined />}
              size="large"
              style={{
                background: "linear-gradient(135deg, #277c90 0%, #66a0b8 100%)",
                border: "none",
                borderRadius: "8px",
                fontWeight: "500",
                height: "48px",
                paddingLeft: "24px",
                paddingRight: "24px",
              }}
            >
              Choose Files to Upload
            </Button>
          </Upload>
        </div>
      </Card>

      <Card
        style={{
          borderRadius: "12px",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <DatabaseOutlined style={{ color: "#277c90" }} />
            <span>Uploaded Documents</span>
          </div>
        }
      >
        <Table
          dataSource={list}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: true,
          }}
          style={{
            borderRadius: "8px",
          }}
        />
      </Card>
    </div>
  );
}
