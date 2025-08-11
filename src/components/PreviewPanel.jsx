import React, { useState } from "react";
import { Input, Button, List, message, Card, Typography, Avatar, Space } from "antd";
import { SendOutlined, UserOutlined, RobotOutlined, MessageOutlined } from "@ant-design/icons";
import { runWorkflow } from "../api/api";

const { Title, Text } = Typography;

export default function PreviewPanel() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);

  const onSend = async () => {
    if (!question) return;
    const q = question;
    setMessages((m) => [...m, { id: Date.now(), role: "user", text: q }]);
    setQuestion("");

    try {
      // NOTE: replace 'workflow-id' with actual id or call a 'test' endpoint
      const res = await runWorkflow("workflow-id", {
        inputs: { user_input: q },
      });
      const answer = res?.data?.result || JSON.stringify(res.data);
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, role: "bot", text: answer },
      ]);
    } catch (e) {
      console.error(e);
      message.error("Gagal panggil workflow");
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
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
            <MessageOutlined style={{ fontSize: "24px", color: "#fff" }} />
            <Title level={4} style={{ margin: 0, color: "#fff" }}>
              Chat Preview
            </Title>
          </div>
        </div>
      </Card>

      <Card
        style={{
          flex: 1,
          borderRadius: "12px",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
        }}
        bodyStyle={{ 
          padding: 0, 
          height: "100%", 
          display: "flex", 
          flexDirection: "column" 
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "16px",
            overflowY: "auto",
            background: "#fafafa",
            minHeight: "400px",
          }}
        >
          {messages.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "60px 20px",
              color: "#999"
            }}>
              <RobotOutlined style={{ fontSize: "48px", marginBottom: "16px", display: "block" }} />
              <Text type="secondary">Start a conversation with your AI assistant</Text>
            </div>
          ) : (
            <List
              dataSource={messages}
              renderItem={(item) => (
                <List.Item style={{ border: "none", padding: "8px 0" }}>
                  <div style={{ 
                    width: "100%", 
                    display: "flex", 
                    justifyContent: item.role === "user" ? "flex-end" : "flex-start"
                  }}>
                    <div style={{
                      maxWidth: "70%",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      flexDirection: item.role === "user" ? "row-reverse" : "row"
                    }}>
                      <Avatar 
                        icon={item.role === "user" ? <UserOutlined /> : <RobotOutlined />}
                        style={{
                          background: item.role === "user" ? "#667eea" : "#52c41a",
                          flexShrink: 0
                        }}
                      />
                      <div style={{
                        background: item.role === "user" ? "#667eea" : "#fff",
                        color: item.role === "user" ? "#fff" : "#333",
                        padding: "12px 16px",
                        borderRadius: "16px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                        border: item.role === "bot" ? "1px solid #f0f0f0" : "none",
                        wordBreak: "break-word"
                      }}>
                        {item.text}
                      </div>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
        
        <div style={{ 
          padding: "16px", 
          borderTop: "1px solid #f0f0f0",
          background: "#fff"
        }}>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              placeholder="Type your message here..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onPressEnter={onSend}
              style={{
                borderRadius: "8px 0 0 8px",
                fontSize: "14px",
                padding: "8px 12px",
                height: "40px"
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={onSend}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: "0 8px 8px 0",
                height: "40px",
                paddingLeft: "16px",
                paddingRight: "16px"
              }}
            >
              Send
            </Button>
          </Space.Compact>
        </div>
      </Card>
    </div>
  );
}
