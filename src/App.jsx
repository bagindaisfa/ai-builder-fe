import React from "react";
import { Layout, Menu } from "antd";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
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

export default function App() {
  return (
    <Router>
      <Layout style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <Sider
          width={280}
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRight: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <div
            style={{
              height: 80,
              background: "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <RobotOutlined style={{ fontSize: "24px", marginBottom: "8px" }} />
            <strong style={{ color: "#fff", fontSize: "18px", fontWeight: "600" }}>AI Builder</strong>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={["builder"]}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "16px",
            }}
            items={[
              {
                key: "builder",
                icon: <BuildOutlined style={{ fontSize: "18px" }} />,
                label: <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Workflow Builder</Link>,
              },
              {
                key: "knowledge",
                icon: <DatabaseOutlined style={{ fontSize: "18px" }} />,
                label: <Link to="/knowledge" style={{ color: "#fff", textDecoration: "none" }}>Knowledge Base</Link>,
              },
              {
                key: "preview",
                icon: <EyeOutlined style={{ fontSize: "18px" }} />,
                label: <Link to="/preview" style={{ color: "#fff", textDecoration: "none" }}>Chat Preview</Link>,
              },
              {
                key: "api",
                icon: <ApiOutlined style={{ fontSize: "18px" }} />,
                label: <Link to="/api" style={{ color: "#fff", textDecoration: "none" }}>API Access</Link>,
              },
            ]}
          />
        </Sider>
        <Layout>
          <Header
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              paddingLeft: 24,
              borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h1 style={{ 
              margin: 0, 
              fontSize: "24px", 
              fontWeight: "600", 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              Custom AI Builder Studio
            </h1>
          </Header>
          <Content
            style={{
              margin: 24,
              padding: 24,
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "16px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
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
    </Router>
  );
}
