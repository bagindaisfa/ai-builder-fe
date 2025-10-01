import React, { useState } from "react";
import {
  Button,
  List,
  Avatar,
  Space,
  Spin,
  Typography,
  Input,
  Tooltip,
} from "antd";
import {
  EyeOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  UserOutlined,
  RobotOutlined,
  DownOutlined,
  RightOutlined,
  MessageOutlined,
  SendOutlined,
  UploadOutlined,
  CloseCircleFilled,
  ExpandOutlined,
  CompressOutlined,
  FileOutlined,
  FileImageOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

import VirtualMessagesList from "./VirtualMessageList";

const { Text } = Typography;

// Simple wrapper to maintain compatibility with the existing code
const MessagesList = React.memo(
  ({ testMessages, setTestMessages, isFullWidth }) => (
    <div style={{ height: "calc(100vh - 200px)", overflow: "hidden" }}>
      <VirtualMessagesList
        testMessages={testMessages}
        setTestMessages={setTestMessages}
        isFullWidth={isFullWidth}
      />
    </div>
  )
);

const PreviewPanel = ({
  previewVisible,
  setPreviewVisible,
  clearTestMessages,
  testMessages,
  setTestMessages,
  messagesEndRef,
  isRunning,
  conversationId,
  setConversationId,
  messageApi,
  testInput,
  setTestInput,
  runWorkflowTest,
  handleFileUpload,
  isUploading,
  uploadedFiles = [],
  setUploadedFiles = () => {},
  onExpandChange = () => {},
}) => {
  const [isFullWidth, setIsFullWidth] = useState(false);

  const removeFile = (index) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);

    // Update input value
    setTestInput(newFiles.map((f) => f.filename || f.name).join(", "));
  };
  if (!previewVisible) return null;

  const handleChange = (e) => {
    setTestInput(e.target.value);
  };

  return (
    <div
      style={{
        width: isFullWidth ? "100%" : "500px",
        background: "#fff",
        borderLeft: "1px solid #e8e8e8",
        display: "flex",
        flexDirection: "column",
        boxShadow: "-2px 0 8px rgba(0,0,0,0.1)",
        transition: "width 0.3s ease-in-out",
        zIndex: isFullWidth ? 10 : 5,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #e8e8e8",
          background: "#fafafa",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <EyeOutlined style={{ color: "#1890ff" }} />
          <Text strong>Workflow Preview</Text>
        </div>
        <div>
          <Button
            type="text"
            size="small"
            onClick={clearTestMessages}
            style={{ marginRight: "8px" }}
          >
            Clear
          </Button>
          <Tooltip
            title={
              isFullWidth
                ? "Restore preview panel"
                : "Expand preview to full width"
            }
          >
            <Button
              type="text"
              size="small"
              icon={isFullWidth ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={() => {
                const newState = !isFullWidth;
                setIsFullWidth(newState);
                onExpandChange(newState);
              }}
              style={{ marginRight: "8px" }}
            />
          </Tooltip>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={() => setPreviewVisible(false)}
          />
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: "16px",
          overflowY: "auto",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {testMessages.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#999",
            }}
          >
            <PlayCircleOutlined
              style={{
                fontSize: "32px",
                marginBottom: "12px",
                display: "block",
              }}
            />
            <Text type="secondary">
              Test your workflow by sending a message below
            </Text>
          </div>
        ) : (
          <MessagesList
            testMessages={testMessages}
            setTestMessages={setTestMessages}
            isFullWidth={isFullWidth}
          />
        )}
        {isRunning && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px",
              background: "#fff",
              borderRadius: "12px",
              marginTop: "8px",
              border: "1px solid #f0f0f0",
            }}
          >
            <Avatar
              icon={<RobotOutlined />}
              size="small"
              style={{ background: "#52c41a" }}
            />
            <Spin size="small" />
            <Text style={{ fontSize: "13px", color: "#666" }}>
              Processing workflow...
            </Text>
          </div>
        )}
        <div ref={messagesEndRef} style={{ float: "left", clear: "both" }} />
      </div>

      {/* Test Input Area */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid #e8e8e8",
          background: "#fff",
        }}
      >
        <div style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {uploadedFiles.map((file, index) => {
                const isImage =
                  (file.type || "").startsWith("image/") ||
                  [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].some(
                    (ext) =>
                      (file.filename || file.name || "")
                        .toLowerCase()
                        .endsWith(ext)
                  );
                const fileUrl =
                  import.meta.env.VITE_API_BASE_URL +
                    "/file-upload/" +
                    file.url ||
                  (file instanceof File ? URL.createObjectURL(file) : null);

                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "#fff",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      gap: "8px",
                      maxWidth: "220px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      position: "relative",
                    }}
                  >
                    {isImage && fileUrl ? (
                      <img
                        src={fileUrl}
                        alt={file.filename || file.name}
                        style={{
                          width: "35px",
                          height: "35px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "inline";
                        }}
                      />
                    ) : file.icon ? (
                      file.icon
                    ) : (
                      <FileOutlined style={{ fontSize: 24, color: "#666" }} />
                    )}

                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {file.filename || file.name}
                    </span>

                    <CloseCircleFilled
                      style={{
                        fontSize: "14px",
                        color: "#888",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.target.style.color = "#ff4d4f")}
                      onMouseLeave={(e) => (e.target.style.color = "#888")}
                      onClick={() => removeFile(index)}
                    />
                  </div>
                );
              })}
            </div>
            {uploadedFiles.length === 0 && (
              <Text type="secondary" style={{ fontSize: "11px" }}>
                <InfoCircleOutlined style={{ marginRight: "4px" }} />
                Text files (.txt) and images (.jpg, .png, .gif, etc.) are
                supported
              </Text>
            )}
          </div>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              id="chat-message"
              placeholder={
                uploadedFiles.length > 0
                  ? "Type a message..."
                  : "Enter test input..."
              }
              value={testInput}
              onChange={handleChange}
              onPressEnter={runWorkflowTest}
              disabled={isRunning}
              style={{
                borderRadius: "6px 0 0 6px",
                fontSize: "13px",
              }}
            />
            <Button
              type="default"
              icon={<UploadOutlined />}
              onClick={() => document.getElementById("file-upload").click()}
              loading={isUploading}
            >
              <input
                id="file-upload"
                type="file"
                style={{ display: "none" }}
                onChange={(e) => handleFileUpload(e)}
                accept=".txt,.text,text/plain,.jpg,.jpeg,.png,.gif,.webp,.bmp,image/jpeg,image/png,image/gif,image/webp,image/bmp"
                multiple
              />
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={runWorkflowTest}
              disabled={
                isRunning || (!testInput.trim() && uploadedFiles.length === 0)
              }
              style={{
                borderRadius: "0 6px 6px 0",
              }}
              loading={isRunning}
            >
              Test
            </Button>
          </Space.Compact>
        </div>
        <Text
          style={{
            fontSize: "11px",
            color: "#999",
            marginTop: "8px",
            display: "block",
          }}
        >
          {conversationId
            ? "Continue your conversation or start a new one"
            : "Test your workflow with sample inputs"}
        </Text>
      </div>
    </div>
  );
};

export default PreviewPanel;
