import React from "react";
import { Layout, Menu } from "antd";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  BuildOutlined,
  DatabaseOutlined,
  EyeOutlined,
  ApiOutlined,
  RobotOutlined,
} from "@ant-design/icons";

import BuilderPage from "./pages/BuilderPage";
import KnowledgePage from "./pages/KnowledgePage";
import PreviewPage from "./pages/PreviewPage";
import ApiAccessPage from "./pages/ApiAccessPage";

const { Sider, Header, Content } = Layout;

// Component to handle dynamic header title
function AppContent() {
  const location = useLocation();
  
  // Function to get page title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Workflow Builder';
      case '/knowledge':
        return 'Knowledge Base';
      case '/preview':
        return 'Chat Preview';
      case '/api':
        return 'API Access';
      default:
        return 'DATACORE AI FORGE';
    }
  };

  // Function to get selected menu key based on current route
  const getSelectedMenuKey = () => {
    switch (location.pathname) {
      case '/':
        return ['builder'];
      case '/knowledge':
        return ['knowledge'];
      case '/preview':
        return ['preview'];
      case '/api':
        return ['api'];
      default:
        return ['builder'];
    }
  };

  return (
      <Layout style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Montserrat', sans-serif" }}>
        <Sider
          width={280}
          style={{
            background: "#ffffff",
            borderRight: "1px solid #e5e7eb",
            boxShadow: "2px 0 8px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div
            style={{
              height: 100,
              background: "#ffffff",
              color: "#1f2937",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {/* DATACORE Logo - Replace src with your logo file path */}
            <img 
              src="/src/assets/datacore-logo.png" 
              alt="DATACORE AI FORGE" 
              style={{
                maxWidth: "200px",
                maxHeight: "60px",
                objectFit: "contain"
              }}
              onError={(e) => {
                // Fallback to text if image fails to load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback text (hidden by default, shown if image fails) */}
            <div style={{ 
              display: "none",
              flexDirection: "column",
              alignItems: "center"
            }}>
              <div style={{ 
                width: "40px", 
                height: "40px", 
                background: "#fff", 
                borderRadius: "8px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                marginBottom: "8px",
                fontSize: "20px",
                fontWeight: "bold",
                color: "#277c90"
              }}>
                DC
              </div>
              <strong style={{ color: "#fff", fontSize: "18px", fontWeight: "600", fontFamily: "'Montserrat', sans-serif" }}>DATACORE</strong>
              <span style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "12px", fontFamily: "'Montserrat', sans-serif" }}>AI FORGE v1.0</span>
            </div>
          </div>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={getSelectedMenuKey()}
            style={{
              background: "#ffffff",
              border: "none",
              fontSize: "16px",
              fontFamily: "'Montserrat', sans-serif",
            }}
            items={[
              {
                key: "builder",
                icon: <BuildOutlined style={{ fontSize: "18px" }} />,
                label: <Link to="/" style={{ color: "#374151", textDecoration: "none" }}>Workflow Builder</Link>,
              },
              {
                key: "knowledge",
                icon: <DatabaseOutlined style={{ fontSize: "18px" }} />,
                label: <Link to="/knowledge" style={{ color: "#374151", textDecoration: "none" }}>Knowledge Base</Link>,
              },
              {
                key: "preview",
                icon: <EyeOutlined style={{ fontSize: "18px" }} />,
                label: <Link to="/preview" style={{ color: "#374151", textDecoration: "none" }}>Chat Preview</Link>,
              },
              {
                key: "api",
                icon: <ApiOutlined style={{ fontSize: "18px" }} />,
                label: <Link to="/api" style={{ color: "#374151", textDecoration: "none" }}>API Access</Link>,
              },
            ]}
          />
        </Sider>
        <Layout>
          <Header
            style={{
              height: "100px",
              background: "#ffffff",
              paddingLeft: 24,
              borderBottom: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h1 style={{ 
              margin: "35px 10px", 
              fontSize: "24px", 
              fontWeight: "600", 
              background: "linear-gradient(135deg, #277c90 0%, #66a0b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontFamily: "'Montserrat', sans-serif"
            }}>
              {getPageTitle()}
            </h1>
          </Header>
          <Content
            style={{
              margin: 24,
              padding: 24,
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <Routes>
              <Route path="/" element={<BuilderPage />} />
              <Route path="/knowledge" element={<KnowledgePage />} />
              <Route path="/preview" element={<PreviewPage />} />
              <Route path="/api" element={<ApiAccessPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
