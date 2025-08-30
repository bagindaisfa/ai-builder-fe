import React from "react";
import { Layout, Menu, Flex } from "antd";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from '../../contexts/ThemeContext';
import Logo from "../common/Logo";
import {
  BuildOutlined,
  DatabaseOutlined,
  EyeOutlined,
  ApiOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

export default function AppSidebar() {
  const location = useLocation();
  const { isDarkMode } = useTheme();

  const getSelectedMenuKey = () => {
    if (location.pathname.startsWith("/studio")) return ["workflow"];
    if (location.pathname.startsWith("/builder")) return ["builder"];
    if (location.pathname.startsWith("/knowledge") || location.pathname.startsWith("/datasets/")) return ["knowledge"];
    if (location.pathname.startsWith("/preview")) return ["preview"];
    if (location.pathname.startsWith("/api")) return ["api"];
    return ["workflow"];
  };

  const menuItems = [
    {
      key: "workflow",
      icon: <BuildOutlined style={{ fontSize: "18px" }} />,
      label: (
        <Link to="/studio" style={{ textDecoration: "none" }}>
          Studio
        </Link>
      ),
    },
    {
      key: "knowledge",
      icon: <DatabaseOutlined style={{ fontSize: "18px" }} />,
      label: (
        <Link to="/knowledge" style={{ textDecoration: "none" }}>
          Knowledge
        </Link>
      ),
    },
    {
      key: "preview",
      icon: <EyeOutlined style={{ fontSize: "18px" }} />,
      label: (
        <Link to="/preview" style={{ textDecoration: "none" }}>
          Chat Preview
        </Link>
      ),
    },
    {
      key: "api",
      icon: <ApiOutlined style={{ fontSize: "18px" }} />,
      label: (
        <Link to="/api" style={{ textDecoration: "none" }}>
          API Access
        </Link>
      ),
    },
  ];

  return (
    <Sider
      width={280}
      style={{
        background: isDarkMode ? "#1f1f1f" : "#ffffff",
        borderRight: `1px solid ${isDarkMode ? "#333" : "#e5e7eb"}`,
        boxShadow: "2px 0 8px rgba(0, 0, 0, 0.05)",
      }}
      theme={isDarkMode ? "dark" : "light"}
    >
      {/* Logo Section */}
      <Flex
        align="center"
        justify="center"
        style={{
          height: 100,
          background: isDarkMode ? "#1f1f1f" : "#ffffff",
          borderBottom: `1px solid ${isDarkMode ? "#333" : "#e5e7eb"}`,
          padding: "20px",
        }}
      >
        <Logo size="medium" showText={false} />
      </Flex>

      {/* Navigation Menu */}
      <Menu
        theme={isDarkMode ? "dark" : "light"}
        mode="inline"
        selectedKeys={getSelectedMenuKey()}
        items={menuItems}
        style={{
          background: isDarkMode ? "#1f1f1f" : "#ffffff",
          border: "none",
          fontSize: "16px",
          fontFamily: "'Montserrat', sans-serif",
        }}
      />
    </Sider>
  );
}
