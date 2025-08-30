import React, { useState, useEffect } from "react";
import { Input, Button, List, message, Card, Typography, Avatar, Select, Badge, Tag, Flex } from "antd";
import { SendOutlined, UserOutlined, RobotOutlined, MessageOutlined, ProjectOutlined } from "@ant-design/icons";
import { runWorkflow } from "../api/api";
import GradientCard from "./common/GradientCard";

const { Title, Text } = Typography;

export default function PreviewPanel() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMessages, setProjectMessages] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock workflows data - in real app, this would come from API
  const [workflows] = useState([
    {
      id: "project-1",
      name: "E-commerce Assistant",
      description: "AI assistant for product recommendations and customer support",
      status: "deployed",
      workflowId: "ecommerce-workflow-001",
      nodes: 8,
      lastUpdated: "2024-01-10"
    },
    {
      id: "project-2", 
      name: "Customer Support Bot",
      description: "Automated customer service with ticket routing",
      status: "deployed",
      workflowId: "support-workflow-002",
      nodes: 12,
      lastUpdated: "2024-01-09"
    },
    {
      id: "project-3",
      name: "Content Generator",
      description: "AI-powered content creation and blog writing assistant",
      status: "draft",
      workflowId: "content-workflow-003",
      nodes: 6,
      lastUpdated: "2024-01-08"
    },
    {
      id: "project-4",
      name: "Data Analysis Helper",
      description: "Automated data processing and insights generation",
      status: "deployed",
      workflowId: "analytics-workflow-004",
      nodes: 10,
      lastUpdated: "2024-01-07"
    }
  ]);

  const currentProject = workflows.find(p => p.id === selectedProject);

  // Load project-specific messages when project changes
  useEffect(() => {
    if (selectedProject) {
      setMessages(projectMessages[selectedProject] || []);
    } else {
      setMessages([]);
    }
  }, [selectedProject, projectMessages]);

  // Handle project selection
  const handleProjectChange = (workflowId) => {
    // Save current messages to project-specific storage
    if (selectedProject) {
      setProjectMessages(prev => ({
        ...prev,
        [selectedProject]: messages
      }));
    }
    setSelectedProject(workflowId);
  };

  const onSend = async () => {
    if (!question || !selectedProject) return;
    
    const q = question;
    const userMessage = { id: Date.now(), role: "user", text: q };
    
    // Update messages for current project
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setQuestion("");
    setIsLoading(true);

    // Update project messages storage
    setProjectMessages(prev => ({
      ...prev,
      [selectedProject]: newMessages
    }));

    try {
      // Use the selected project's workflow ID
      const res = await runWorkflow(currentProject.workflowId, {
        inputs: { user_input: q },
      });
      const answer = res?.data?.result || JSON.stringify(res.data);
      const botMessage = { id: Date.now() + 1, role: "bot", text: answer };
      
      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);
      
      // Update project messages storage
      setProjectMessages(prev => ({
        ...prev,
        [selectedProject]: updatedMessages
      }));
    } catch (e) {
      console.error(e);
      message.error(`Failed to run workflow for ${currentProject.name}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex 
      vertical 
      gap="large" 
      style={{ 
        height: "100%", 
        overflow: "auto",
      }}
    >
      {/* Header with project selector */}
      <GradientCard
        style={{
          overflow: "visible",
          zIndex: 1000
        }}
        bodyStyle={{ overflow: "visible" }}
      >
        <Flex vertical gap="large">
          <Flex align="center" gap="middle">
            <Flex
              align="center"
              justify="center"
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                padding: "12px",
              }}
            >
              <MessageOutlined style={{ fontSize: "24px", color: "#fff" }} />
            </Flex>
            <Flex vertical>
              <Title level={3} style={{ margin: 0, color: "#fff", fontWeight: "600", fontFamily: "'Montserrat', sans-serif" }}>
                Chat Preview
              </Title>
              <Text style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px", fontFamily: "'Montserrat', sans-serif" }}>
                Test and interact with your AI workflows
              </Text>
            </Flex>
          </Flex>
          <Select
            placeholder="🔍 Select a project to test"
            value={selectedProject}
            onChange={handleProjectChange}
            style={{ width: "100%", fontFamily: "'Montserrat', sans-serif" }}
            size="large"
            dropdownStyle={{
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
              zIndex: 1001,
              fontFamily: "'Montserrat', sans-serif"
            }}
            getPopupContainer={(triggerNode) => triggerNode.parentNode}
          >
          {workflows.map(project => (
            <Select.Option key={project.id} value={project.id}>
              <Flex justify="space-between" align="center" style={{ padding: "8px 0" }}>
                <Flex vertical style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: "16px",
                    fontWeight: "500",
                    color: "#374151",
                    fontFamily: "'Montserrat', sans-serif"
                  }}>
                    {project.name}
                  </Text>
                </Flex>
                <Badge 
                  status={project.status === 'deployed' ? 'success' : 'processing'} 
                  text={project.status === 'deployed' ? 'Live' : 'Draft'}
                />
              </Flex>
            </Select.Option>
          ))}
          </Select>
        </Flex>
      </GradientCard>

      {/* Project info banner */}
      {currentProject && (
        <Card
          style={{
            borderRadius: "16px",
            border: "1px solid #e1e7ef",
            background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)"
          }}
          bodyStyle={{ padding: "16px 20px" }}
        >
          <Flex align="center" gap="middle" style={{ marginBottom: "12px" }}>
            <Flex
              align="center"
              justify="center"
              style={{
                background: currentProject.status === 'deployed' ? '#10b981' : '#f59e0b',
                borderRadius: "10px",
                padding: "10px",
              }}
            >
              <ProjectOutlined style={{ 
                fontSize: "20px", 
                color: "#fff" 
              }} />
            </Flex>
            <Flex vertical style={{ flex: 1 }}>
              <Flex align="center" gap="middle" style={{ marginBottom: "4px" }}>
                <Title level={5} style={{ margin: 0, color: "#1f2937", fontWeight: "600", fontFamily: "'Montserrat', sans-serif" }}>
                  Testing: {currentProject.name}
                </Title>
                <Tag 
                  color={currentProject.status === 'deployed' ? 'green' : 'orange'}
                  style={{ 
                    borderRadius: "6px", 
                    fontWeight: "500",
                    fontSize: "12px",
                    padding: "2px 8px",
                    fontFamily: "'Montserrat', sans-serif"
                  }}
                >
                  {currentProject.status === 'deployed' ? '🟢 Live' : '🟡 Draft'}
                </Tag>
              </Flex>
              <Text style={{ color: "#6b7280", fontSize: "14px", lineHeight: "1.5", fontFamily: "'Montserrat', sans-serif" }}>
                {currentProject.description}
              </Text>
            </Flex>
          </Flex>
          <Flex
            style={{
              background: "#f8fafc",
              borderRadius: "8px",
              padding: "12px 16px",
              border: "1px solid #e5e7eb"
            }}
          >
            <Flex 
              align="center" 
              gap="middle"
              style={{
                fontSize: "12px",
                color: "#6b7280"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                🔗 <strong>Workflow:</strong> {currentProject.workflowId}
              </span>
              <span>•</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                📊 <strong>{currentProject.nodes}</strong> nodes
              </span>
              <span>•</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                📅 Updated: <strong>{currentProject.lastUpdated}</strong>
              </span>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* No project selected state */}
      {!selectedProject && (
        <Card 
          style={{ 
            flex: 1, 
            borderRadius: "16px",
            border: "2px dashed #e1e7ef",
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)"
          }}
          bodyStyle={{ 
            padding: "60px 40px"
          }}
        >
          <Flex vertical align="center" style={{ textAlign: "center", maxWidth: "400px", margin: "0 auto" }}>
            <Flex
              align="center"
              justify="center"
              style={{
                background: "linear-gradient(135deg, #277c90 0%, #66a0b8 100%)",
                borderRadius: "20px",
                padding: "20px",
                marginBottom: "24px"
              }}
            >
              <ProjectOutlined style={{ fontSize: "48px", color: "#fff" }} />
            </Flex>
            <Title level={4} style={{ color: "#1f2937", marginBottom: "8px", fontWeight: "600" }}>
              No Project Selected
            </Title>
            <Text style={{ color: "#6b7280", fontSize: "16px", lineHeight: "1.6" }}>
              Choose a project from the dropdown above to start testing your AI workflows
            </Text>
            <Flex
              style={{ 
                marginTop: "24px", 
                padding: "16px", 
                background: "#f0f9ff", 
                borderRadius: "12px",
                border: "1px solid #bae6fd"
              }}
            >
              <Text style={{ color: "#0369a1", fontSize: "14px" }}>
                💡 <strong>Tip:</strong> Each project maintains its own conversation history
              </Text>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Chat interface - only show when project is selected */}
      {selectedProject && (
        <Card
          style={{
            marginBottom: "16px",
            borderRadius: "16px",
            border: "1px solid #e1e7ef",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
            background: "#ffffff"
          }}
          bodyStyle={{ 
            padding: 0
          }}
        >
          {/* Chat Header */}
          <div style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f0f0f0",
            background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                background: "#10b981",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <RobotOutlined style={{ fontSize: "16px", color: "#fff" }} />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, color: "#1f2937", fontWeight: "600", fontFamily: "'Montserrat', sans-serif" }}>
                  {currentProject.name}
                </Title>
                <Text style={{ color: "#6b7280", fontSize: "14px", fontFamily: "'Montserrat', sans-serif" }}>
                  Ready to assist • Conversation isolated to this project
                </Text>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              background: "#f8fafc",
              minHeight: "400px",
              maxHeight: "600px",
              overflowY: "auto"
            }}
          >
            {messages.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "80px 20px",
                color: "#6b7280"
              }}>
                <div style={{
                  background: "linear-gradient(135deg, #277c90 0%, #66a0b8 100%)",
                  borderRadius: "20px",
                  padding: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px"
                }}>
                  <RobotOutlined style={{ fontSize: "48px", color: "#fff" }} />
                </div>
                <Title level={4} style={{ color: "#1f2937", marginBottom: "8px", fontWeight: "600" }}>
                  Start Testing {currentProject.name}
                </Title>
                <Text style={{ color: "#6b7280", fontSize: "16px", lineHeight: "1.6" }}>
                  Send a message below to test your AI workflow
                </Text>
                <div style={{ 
                  marginTop: "24px", 
                  padding: "16px", 
                  background: "#ecfdf5", 
                  borderRadius: "12px",
                  border: "1px solid #a7f3d0",
                  maxWidth: "300px",
                  margin: "24px auto 0"
                }}>
                  <Text style={{ color: "#065f46", fontSize: "14px" }}>
                    🚀 <strong>Ready to go!</strong> Your workflow is loaded and waiting
                  </Text>
                </div>
              </div>
            ) : (
            <List
              dataSource={messages}
              renderItem={(item) => (
                <List.Item style={{ border: "none", padding: "12px 0" }}>
                  <div style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: item.role === "user" ? "flex-end" : "flex-start"
                  }}>
                    <div style={{
                      maxWidth: "80%",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      flexDirection: item.role === "user" ? "row-reverse" : "row"
                    }}>
                      <Avatar 
                        icon={item.role === "user" ? <UserOutlined /> : <RobotOutlined />}
                        style={{
                          background: item.role === "user" 
                            ? "linear-gradient(135deg, #277c90 0%, #66a0b8 100%)" 
                            : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          flexShrink: 0,
                          border: "2px solid #fff",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                        }}
                        size={32}
                      />
                      <div style={{
                        background: item.role === "user" 
                          ? "linear-gradient(135deg, #277c90 0%, #66a0b8 100%)" 
                          : "#ffffff",
                        color: item.role === "user" ? "#fff" : "#1f2937",
                        padding: "16px 20px",
                        borderRadius: item.role === "user" ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
                        boxShadow: item.role === "user" 
                          ? "0 4px 16px rgba(102, 126, 234, 0.3)" 
                          : "0 4px 16px rgba(0, 0, 0, 0.1)",
                        fontSize: "15px",
                        lineHeight: "1.5",
                        wordBreak: "break-word",
                        border: item.role === "user" ? "none" : "1px solid #e5e7eb"
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
        
        {/* Enhanced Input Area */}
        <div style={{ 
          padding: "16px", 
          borderTop: "1px solid #e5e7eb",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          flexShrink: 0
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
            overflow: "hidden"
          }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Input
                placeholder={`💬 Ask ${currentProject.name} anything...`}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onPressEnter={onSend}
                disabled={isLoading}
                style={{
                  color: "#6b7280",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  fontFamily: "'Montserrat', sans-serif",
                  border: "none",
                  padding: "16px 20px",
                  background: "transparent",
                  boxShadow: "none"
                }}
                suffix={
                  isLoading && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <Text style={{ fontSize: "12px", color: "#6b7280" }}>Thinking...</Text>
                    </div>
                  )
                }
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={onSend}
                disabled={isLoading || !question.trim()}
                style={{
                  background: question.trim() && !isLoading 
                    ? "linear-gradient(135deg, #277c90 0%, #66a0b8 100%)" 
                    : "#d1d5db",
                  border: "none",
                  borderRadius: "12px",
                  height: "48px",
                  width: "48px",
                  margin: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease"
                }}
              />
            </div>
          </div>
          <Text style={{ 
            fontSize: "12px", 
            color: "#9ca3af", 
            marginTop: "12px", 
            display: "block",
            textAlign: "center"
          }}>
            🔒 This conversation is private and isolated to {currentProject.name}
          </Text>
        </div>
      </Card>
      )}
    </Flex>
  );
}