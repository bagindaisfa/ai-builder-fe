import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Avatar,
  Upload,
  message,
  Row,
  Col,
  Space,
  Switch,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  CameraOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const ProfilePage = () => {
  const [form] = Form.useForm();
  const { user, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        status: user.status || 'active',
        enabled: user.enabled !== undefined ? user.enabled : true,
      });
    }
  }, [user, form]);

  const handleUpdateProfile = async (values) => {
    try {
      const profileData = {
        username: values.username,
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        status: values.status,
        enabled: values.enabled,
        ...(values.password &&
          values.password.trim() !== '' && {
            password: values.password,
            old_password: values.old_password,
          }),
      };

      // Only include password fields if a new password is provided
      if (!values.password || values.password.trim() === '') {
        delete profileData.password;
        delete profileData.old_password;
      }

      const result = await updateProfile(user.id, profileData);

      if (result?.shouldLogout) {
        messageApi.success(
          'Password updated successfully. Please log in again.'
        );
        // The AuthContext's logout will handle the navigation
      } else {
        messageApi.success('Profile updated successfully');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Update profile error:', err);
      messageApi.error(err.message || 'Failed to update profile');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: '16px' }}
      >
        Back
      </Button>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Title level={4} style={{ marginTop: '16px' }}>
                {user?.first_name + ' ' + user?.last_name || 'User'}
              </Title>
              <Text type="secondary">{user?.email || ''}</Text>
            </div>

            <Button
              type="primary"
              block
              onClick={() => setIsEditing(!isEditing)}
              style={{ marginTop: '16px' }}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card>
            <Title level={4} style={{ marginBottom: '24px' }}>
              Profile Information
            </Title>

            <Form form={form} layout="vertical" onFinish={handleUpdateProfile}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="username"
                    label="Username"
                    rules={[
                      {
                        required: true,
                        message: 'Please input your username!',
                      },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Username"
                      disabled={!isEditing}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Please input your email!' },
                      {
                        type: 'email',
                        message: 'Please enter a valid email!',
                      },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder="your.email@example.com"
                      disabled={!isEditing}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="first_name" label="First Name">
                    <Input placeholder="First Name" disabled={!isEditing} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="last_name" label="Last Name">
                    <Input placeholder="Last Name" disabled={!isEditing} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="status"
                label="Status"
                hidden
                initialValue="active"
              >
                <Input type="hidden" />
              </Form.Item>

              <Form.Item
                name="enabled"
                label="Account Enabled"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch disabled={!isEditing} />
              </Form.Item>

              <>
                <Title level={5} style={{ marginBottom: '16px' }}>
                  Change Password
                </Title>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="old_password"
                      label="Current Password"
                      dependencies={['password']}
                      rules={[
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (getFieldValue('password') && !value) {
                              return Promise.reject(
                                new Error('Please input your current password!')
                              );
                            }
                            return Promise.resolve();
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        placeholder="Current password"
                        disabled={!isEditing}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item
                      name="password"
                      label="New Password"
                      rules={[
                        {
                          min: 8,
                          message: 'Password must be at least 8 characters!',
                        },
                      ]}
                    >
                      <Input.Password
                        placeholder="New password"
                        disabled={!isEditing}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </>

              {isEditing && (
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Save Changes
                  </Button>
                  <Button onClick={() => setIsEditing(false)}>Cancel</Button>
                </Space>
              )}
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProfilePage;
