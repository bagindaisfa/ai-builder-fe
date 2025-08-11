import React, { useEffect, useState } from "react";
import { Table, Button, Input, Space, message, Card, Typography, Alert } from "antd";
import { KeyOutlined, PlusOutlined, DeleteOutlined, ApiOutlined, CopyOutlined } from "@ant-design/icons";
import { getApiKeys, createApiKey, deleteApiKey } from "../api/api";

const { Title, Text, Paragraph } = Typography;

export default function ApiAccessPanel() {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState("");

  const fetch = async () => {
    try {
      const res = await getApiKeys();
      setKeys(res.data || []);
    } catch (e) {
      message.error("Gagal ambil api keys");
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const onCreate = async () => {
    try {
      await createApiKey(name || "key-" + Date.now());
      message.success("API Key dibuat");
      setName("");
      fetch();
    } catch (e) {
      message.error("Create key gagal");
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteApiKey(id);
      message.success("Deleted");
      fetch();
    } catch (e) {
      message.error("Delete gagal");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success("API key copied to clipboard!");
  };

  const cols = [
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
      title: "API Key",
      dataIndex: "key",
      key: "key",
      render: (_, r) => {
        const keyValue = r.key || r.token || "—";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Text code style={{ fontSize: "12px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
              {keyValue.length > 20 ? `${keyValue.substring(0, 20)}...` : keyValue}
            </Text>
            {keyValue !== "—" && (
              <Button 
                type="text" 
                size="small" 
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(keyValue)}
                style={{ padding: "2px 4px" }}
              />
            )}
          </div>
        );
      },
    },
    { 
      title: "Name", 
      dataIndex: "name", 
      key: "name",
      render: (name) => (
        <Text strong style={{ fontSize: "14px" }}>
          {name}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "action",
      width: 120,
      render: (_, r) => (
        <Button 
          danger 
          icon={<DeleteOutlined />}
          onClick={() => onDelete(r.id)}
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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
          borderRadius: "12px",
        }}
        bodyStyle={{ padding: "16px 24px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ApiOutlined style={{ fontSize: "24px", color: "#fff" }} />
            <Title level={4} style={{ margin: 0, color: "#fff" }}>
              API Access Management
            </Title>
          </div>
        </div>
      </Card>

      <Alert
        message="API Key Security"
        description="Keep your API keys secure and never share them publicly. Use them to authenticate requests to your AI Builder endpoints."
        type="info"
        showIcon
        style={{
          marginBottom: 24,
          borderRadius: "8px",
          border: "1px solid #d9d9d9",
        }}
      />

      <Card
        style={{
          marginBottom: 24,
          borderRadius: "12px",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <KeyOutlined style={{ color: "#667eea" }} />
            <span>Create New API Key</span>
          </div>
        }
      >
        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="Enter a name for your API key (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={onCreate}
            style={{
              borderRadius: "8px 0 0 8px",
              fontSize: "14px",
              height: "40px"
            }}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={onCreate}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "0 8px 8px 0",
              height: "40px",
              paddingLeft: "16px",
              paddingRight: "16px",
              fontWeight: "500"
            }}
          >
            Create Key
          </Button>
        </Space.Compact>
      </Card>

      <Card
        style={{
          borderRadius: "12px",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <KeyOutlined style={{ color: "#667eea" }} />
            <span>Your API Keys</span>
          </div>
        }
      >
        <Table 
          dataSource={keys} 
          columns={cols} 
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: true,
          }}
          locale={{
            emptyText: (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <KeyOutlined style={{ fontSize: "48px", color: "#d9d9d9", marginBottom: "16px" }} />
                <div>
                  <Text type="secondary">No API keys created yet</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: "12px" }}>Create your first API key to get started</Text>
                </div>
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
}
