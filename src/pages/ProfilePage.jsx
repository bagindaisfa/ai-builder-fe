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
  Space
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  LockOutlined, 
  CameraOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const ProfilePage = () => {
  const [form] = Form.useForm();
  const { user, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
      });
      if (user.avatar) {
        setAvatarUrl(user.avatar);
      }
    }
  }, [user, form]);

  const handleUpdateProfile = async (values) => {
    try {
      await updateProfile({
        ...values,
        ...(avatarUrl && { avatar: avatarUrl })
      });
      message.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleAvatarChange = (info) => {
    if (info.file.status === 'done') {
      // In a real app, you would upload the image to your server here
      // and get back the URL to save to the user's profile
      const url = URL.createObjectURL(info.file.originFileObj);
      setAvatarUrl(url);
      message.success('Profile picture updated');
    }
  };

  const uploadButton = (
    <div>
      {avatarUrl ? (
        <Avatar size={100} src={avatarUrl} icon={<UserOutlined />} />
      ) : (
        <Avatar size={100} icon={<UserOutlined />} />
      )}
      <div style={{ marginTop: 8 }}>
        <CameraOutlined /> Change Photo
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px' }}>
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
              <Upload
                name="avatar"
                listType="picture-card"
                className="avatar-uploader"
                showUploadList={false}
                beforeUpload={() => false} // Prevent auto upload
                onChange={handleAvatarChange}
                disabled={!isEditing}
              >
                {uploadButton}
              </Upload>
              <Title level={4} style={{ marginTop: '16px' }}>{user?.name || 'User'}</Title>
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
          
          {isEditing && (
            <Card style={{ marginTop: '16px' }}>
              <Title level={5} style={{ marginBottom: '16px' }}>Change Password</Title>
              <Form layout="vertical">
                <Form.Item
                  name="currentPassword"
                  label="Current Password"
                  rules={[{ required: true, message: 'Please input your current password!' }]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="Current password" 
                  />
                </Form.Item>
                
                <Form.Item
                  name="newPassword"
                  label="New Password"
                  rules={[
                    { required: true, message: 'Please input new password!' },
                    { min: 6, message: 'Password must be at least 6 characters!' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="New password" 
                  />
                </Form.Item>
                
                <Form.Item
                  name="confirmPassword"
                  label="Confirm New Password"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: 'Please confirm your new password!' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('The two passwords do not match!'));
                      },
                    }),
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="Confirm new password" 
                  />
                </Form.Item>
                
                <Button type="primary" htmlType="submit" block>
                  Update Password
                </Button>
              </Form>
            </Card>
          )}
        </Col>
        
        <Col xs={24} md={16}>
          <Card>
            <Title level={4} style={{ marginBottom: '24px' }}>Profile Information</Title>
            
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateProfile}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="name"
                    label="Full Name"
                    rules={[{ required: true, message: 'Please input your name!' }]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="Your name" 
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
                      { type: 'email', message: 'Please enter a valid email!' }
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
              
              <Form.Item
                name="bio"
                label="Bio"
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="Tell us about yourself..." 
                  disabled={!isEditing}
                />
              </Form.Item>
              
              <Form.Item
                name="company"
                label="Company"
              >
                <Input 
                  placeholder="Your company" 
                  disabled={!isEditing}
                />
              </Form.Item>
              
              <Form.Item
                name="location"
                label="Location"
              >
                <Input 
                  placeholder="Your location" 
                  disabled={!isEditing}
                />
              </Form.Item>
              
              <Form.Item
                name="website"
                label="Website"
              >
                <Input 
                  placeholder="https://yourwebsite.com" 
                  disabled={!isEditing}
                />
              </Form.Item>
              
              {isEditing && (
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Save Changes
                  </Button>
                  <Button onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
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
