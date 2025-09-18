import React from "react";
import { Layout, ConfigProvider, theme } from "antd";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import antdTheme from "../../theme/antdTheme";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import StudioPage from "../../pages/StudioPage";
import BuilderPage from "../../pages/BuilderPage";
import KnowledgePage from "../../pages/KnowledgePage";
import PreviewPage from "../../pages/PreviewPage";
import ApiAccessPage from "../../pages/ApiAccessPage";
import ProfilePage from "../../pages/ProfilePage";
import DatasetDetailPage from "../../pages/DatasetDetailPage";
import DocumentChunksPage from "../../pages/DocumentChunksPage";

const { Content } = Layout;

function AppContent() {
  const { isDarkMode } = useTheme();
  
  return (
    <ConfigProvider
      theme={{
        ...antdTheme,
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Layout style={{ height: "100vh", width: "100%" }}>
        <AppSidebar />
        <Layout style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
          <AppHeader />
          <Content
            style={{
              flex: 1,
              margin: "16px",
              padding: "16px",
              background: isDarkMode ? "#1f1f1f" : "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: `1px solid ${isDarkMode ? "#333" : "#e5e7eb"}`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1, overflow: "auto" }}>
              <Routes>
                <Route path="/" element={<Navigate to="/studio" replace />} />
                <Route path="/studio" element={<StudioPage />} />
                <Route path="/builder/:workflowId" element={<BuilderPage />} />
                <Route path="/knowledge" element={<KnowledgePage />} />
                <Route path="/datasets/:datasetId" element={<DatasetDetailPage />} />
                <Route path="/document/details/:documentId" element={<DocumentChunksPage />} />
                <Route path="/preview" element={<PreviewPage />} />
                <Route path="/api" element={<ApiAccessPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

// Removed the duplicate Router since it's already provided in main.jsx
export default function AppLayoutWrapper() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}