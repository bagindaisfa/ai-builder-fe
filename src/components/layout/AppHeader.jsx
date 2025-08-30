import React, { useCallback, useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Switch,
  Flex,
  Space,
  Dropdown,
  Avatar,
  Menu,
  Button,
  message,
} from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from "../../contexts/AuthContext";
import {
  BulbOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  DownOutlined,
} from "@ant-design/icons";

const { Header } = Layout;
const { Title, Text } = Typography;

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // The AuthContext will handle navigation and page reload
    } catch (error) {
      console.error("Logout error:", error);
      messageApi.error(error.message || 'Failed to log out');
      setIsLoggingOut(false);
    }
  }, [logout, messageApi]);

  const userMenu = (
    <Menu
      items={[
        {
          key: 'profile',
          label: 'Profile',
          icon: <UserOutlined />,
          onClick: () => navigate('/profile'),
        },
        {
          type: 'divider',
        },
        {
          key: 'logout',
          label: 'Logout',
          icon: <LogoutOutlined />,
          onClick: handleLogout,
        },
      ]}
    />
  );

  const getPageTitle = () => {
    return "DataCore AI Forge";
  };


  return (
    <>
      {contextHolder}
      <Header
        style={{
          height: "100px",
          background: isDarkMode ? "#1f1f1f" : "#ffffff",
          paddingLeft: 24,
          paddingRight: 24,
          borderBottom: `1px solid ${isDarkMode ? "#333" : "#e5e7eb"}`,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Flex justify="space-between" align="center" style={{ height: "100%" }}>
          <Title
            level={3}
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "600",
              fontFamily: "'Montserrat', sans-serif",
              color: isDarkMode ? "#fff" : "#1f2937",
            }}
          >
            {getPageTitle()}
          </Title>
          <Space align="center" size="middle">
            <BulbOutlined
              style={{
                fontSize: "18px",
                color: isDarkMode ? "#fff" : "#1f2937",
                marginRight: 8,
              }}
            />
            <Switch
              checked={isDarkMode}
              onChange={toggleTheme}
              checkedChildren="🌙"
              unCheckedChildren="☀️"
              style={{ marginRight: 16 }}
            />
            
            {user ? (
              <Dropdown overlay={userMenu} trigger={['click']} placement="bottomRight">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 4, ':hover': { backgroundColor: isDarkMode ? '#333' : '#f5f5f5' } }}>
                  <Avatar 
                    size="default" 
                    icon={<UserOutlined />} 
                    style={{ backgroundColor: isDarkMode ? '#1890ff' : '#1890ff' }}
                  />
                  <Text style={{ color: isDarkMode ? '#fff' : '#1f2937' }}>{user.name || 'User'}</Text>
                  <DownOutlined style={{ color: isDarkMode ? '#fff' : '#1f2937', fontSize: 12 }} />
                </div>
              </Dropdown>
            ) : (
              <Button 
                type="primary" 
                onClick={() => navigate('/login')}
                loading={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out...' : 'Login'}
              </Button>
            )}
          </Space>
        </Flex>
      </Header>
    </>
  );
}
