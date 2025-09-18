import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Flex,
  Card,
  Typography,
  Button,
  Divider,
  Spin,
  Form,
  Input,
  Alert,
  Row,
  Col,
  Checkbox,
  message,
} from 'antd';
import {
  LoadingOutlined,
  UserOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import dataCoreLogo from '../assets/datacore-logo.png';

const { Text, Title } = Typography;

const LoginPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const { login, signup, loading: authLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(location.state?.error || null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    // Check for remember me
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      form.setFieldsValue({ username: savedUsername });
      setRememberMe(true);
    }

    // Handle error from location state (e.g., from auth redirects)
    if (location.state?.error) {
      setError(location.state.error);
      // Clear the error from location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, form]);

  const handleForgotPassword = async () => {
    const email = form.getFieldValue('email') || '';

    if (!email) {
      setError('Please enter your email address to reset your password.');
      form.setFields([{ name: 'email', errors: ['Email is required'] }]);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Call the forgot password API endpoint
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        { email }
      );

      // Show success message to the user
      message.success(
        'Password reset instructions have been sent to your email.'
      );
    } catch (err) {
      console.error('Forgot password error:', err);

      let errorMessage = 'Failed to process your request. Please try again.';

      if (err.response) {
        const { status, data } = err.response;

        if (status === 404) {
          errorMessage = 'No account found with this email address.';
        } else if (status === 400 && data?.message) {
          errorMessage = data.message;
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (err.request) {
        errorMessage =
          'Unable to connect to the server. Please check your internet connection.';
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (values) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Clear any previous errors
      form.setFields([
        { name: 'username', errors: [] },
        { name: 'password', errors: [] },
      ]);

      // Call the login function from AuthContext with username
      await login(values.username, values.password);

      // If login is successful, redirect to the intended page or home
      const returnTo = location.state?.from?.pathname || '/';
      message.loading({ content: 'Signing in...', key: 'login', duration: 1 });
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error('Login error:', err);

      let errorMessage =
        err.message || 'An error occurred during login. Please try again.';

      // Handle different types of errors
      if (err.response) {
        const { status, data } = err.response;

        if (status === 401) {
          errorMessage =
            data?.message || 'Invalid email or password. Please try again.';
          form.setFields([
            { name: 'email', errors: [''] },
            { name: 'password', errors: [errorMessage] },
          ]);
        } else if (status === 400) {
          // Handle validation errors from the server
          if (data?.errors) {
            const fieldErrors = {};
            data.errors.forEach((error) => {
              const field = error.path?.[0] || 'email';
              if (!fieldErrors[field]) fieldErrors[field] = [];
              fieldErrors[field].push(error.msg || 'Invalid input');
            });

            form.setFields(
              Object.entries(fieldErrors).map(([name, errors]) => ({
                name,
                errors,
              }))
            );

            errorMessage = 'Please correct the errors in the form.';
          } else if (data?.message) {
            errorMessage = data.message;
          }
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response from server:', err.request);
        errorMessage =
          'Unable to connect to the server. Please check your internet connection.';
      } else if (err.message) {
        // Something happened in setting up the request
        errorMessage = err.message;
      }

      // Update the error state
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = () => {
    try {
      // Store the current path to return after signup if needed
      const returnTo = location.state?.from?.pathname || '/';
      if (returnTo && returnTo !== '/signup') {
        localStorage.setItem('returnTo', returnTo);
      }

      // Navigate to the signup page
      navigate('/signup');
    } catch (err) {
      console.error('Signup navigation error:', err);
      setError('Failed to redirect to signup. Please try again.');
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  // Styles
  const styles = {
    card: {
      minWidth: 450,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      borderRadius: 12,
      marginBottom: 16,
    },
    divider: {
      margin: '16px 0',
      borderTop: `1px solid ${isDarkMode ? '#2f2f2f' : '#f0f0f0'}`,
    },
    dividerText: {
      fontSize: '12px',
      padding: '0 16px',
      backgroundColor: isDarkMode ? '#141414' : '#fff',
    },
    formItem: {
      marginBottom: 16,
    },
    form: {
      width: '100%',
    },
    rememberMeContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    signupContainer: {
      marginTop: 24,
      textAlign: 'center',
      width: '100%',
    },
    button: {
      width: '100%',
      height: 44,
      fontWeight: 500,
      fontSize: 15,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    logo: {
      height: '48px',
      marginBottom: '8px',
    },
    container: {
      minHeight: '100vh',
      padding: '24px',
      background: isDarkMode ? '#141414' : '#f0f2f5',
    },
  };

  if (authLoading) {
    return (
      <Flex
        style={{ width: '100%', height: '100vh' }}
        justify="center"
        align="center"
      >
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </Flex>
    );
  }

  return (
    <Flex align="center" justify="center" style={styles.container}>
      <Card
        style={styles.card}
        bodyStyle={{ padding: '32px' }}
        bordered={false}
      >
        <Flex vertical align="center" gap={24}>
          <img src={dataCoreLogo} alt="DataCore Logo" style={styles.logo} />

          <Title level={3} style={{ margin: 0, textAlign: 'center' }}>
            Welcome back
          </Title>

          <Text type="secondary" style={{ textAlign: 'center' }}>
            Sign in to your account to continue
          </Text>

          {error && (
            <div style={{ width: '100%', marginBottom: 16 }}>
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ width: '100%' }}
                closable
                onClose={() => setError(null)}
              />
            </div>
          )}

          <Form
            form={form}
            onFinish={handleFormSubmit}
            style={styles.form}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'Please enter your username' },
              ]}
              style={styles.formItem}
            >
              <Input
                size="large"
                placeholder="Username"
                prefix={<UserOutlined />}
                disabled={isSubmitting}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter your password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
              style={styles.formItem}
            >
              <Input
                type={passwordVisible ? 'text' : 'password'}
                size="large"
                placeholder="Password"
                prefix={<LockOutlined />}
                disabled={isSubmitting}
                suffix={
                  <span
                    onClick={togglePasswordVisibility}
                    style={{ cursor: 'pointer' }}
                  >
                    {passwordVisible ? (
                      <EyeTwoTone />
                    ) : (
                      <EyeInvisibleOutlined />
                    )}
                  </span>
                }
              />
            </Form.Item>

            <div style={styles.rememberMeContainer}>
              <Button
                type="link"
                onClick={handleForgotPassword}
                style={{ padding: 0 }}
                disabled={isSubmitting}
              >
                Forgot password?
              </Button>
            </div>

            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={isSubmitting}
                style={styles.button}
                block
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </Form.Item>
          </Form>

          <div style={styles.signupContainer}>
            <Text>Don't have an account? </Text>
            <Button
              type="link"
              onClick={handleSignup}
              style={{ padding: 0 }}
              disabled={isSubmitting}
            >
              Sign up
            </Button>
          </div>
        </Flex>
      </Card>
    </Flex>
  );
};

export default LoginPage;
