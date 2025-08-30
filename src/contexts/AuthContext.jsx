import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  login as loginApi,
  logout as logoutApi,
  refreshToken as refreshTokenApi,
} from "../api/api";

// Create the auth context
const AuthContext = createContext();

// Auth Provider Wrapper
export const AuthProvider = ({ children }) => {
  return <AuthProviderInternal>{children}</AuthProviderInternal>;
};

// Internal Auth Provider that handles authentication
const AuthProviderInternal = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Set auth tokens in storage and axios headers
  const setAuthTokens = (accessToken, refreshToken) => {
    if (accessToken) {
      // Save tokens to localStorage
      localStorage.setItem("access_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }

      // Only set the access token in axios headers for API requests
      // We'll enable this later when we implement API authorization
      // axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    } else {
      // Clear tokens
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      delete axios.defaults.headers.common["Authorization"];
    }
  };

  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = localStorage.getItem("access_token");
        const refreshToken = localStorage.getItem("refresh_token");
        const savedUser = localStorage.getItem("user");

        if (accessToken && refreshToken && savedUser) {
          // Store tokens (without setting auth header yet)
          setAuthTokens(accessToken, refreshToken);
          setUser(JSON.parse(savedUser));

          // Note: We're not validating the token here since we're not using it for API auth yet
          // When we implement API auth, we'll need to validate/refresh the token here
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setAuthTokens(null, null);
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = useCallback(
    async (username, password) => {
      try {
        setLoading(true);
        setError(null);

        const response = await loginApi({ username, password });
        const { user, access_token, refresh_token } = response.data;

        // Store tokens and user data
        setAuthTokens(access_token, refresh_token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);

        // Redirect to the intended URL or home
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });

        return user;
      } catch (err) {
        console.error("Login failed:", err);
        const errorMessage =
          err.response?.data?.message ||
          "Failed to login. Please check your credentials.";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [navigate, location.state]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Get refresh token for logout
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        // Send the refresh token in the Authorization header
        const config = {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        };
        await logoutApi(null, config);
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Clear all auth data
      setAuthTokens(null, null);
      localStorage.removeItem("user");
      setUser(null);
      navigate("/login");
    }
  }, [navigate]);

  // Signup function
  const signup = useCallback(async (userData) => {
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (
        !userData.email ||
        !userData.password ||
        !userData.username ||
        !userData.first_name ||
        !userData.last_name
      ) {
        throw new Error("All fields are required");
      }

      // Use the API function instead of direct axios call
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/signup`, {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        first_name: userData.first_name,
        last_name: userData.last_name,
      });
    } catch (err) {
      console.error("Signup error:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to create account. Please try again.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update profile function
  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/auth/me`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const { user: updatedUser } = response.data;

      // Update local storage with new user data
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Update state
      setUser(updatedUser);

      return updatedUser;
    } catch (err) {
      console.error("Update profile error:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to update profile. Please try again.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Forgot password function
  const forgotPassword = async (email) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        { email }
      );
      return response.data;
    } catch (err) {
      handleAuthError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to handle auth errors
  const handleAuthError = useCallback((err) => {
    let errorMessage = "An error occurred. Please try again.";

    if (err.response) {
      const { status, data } = err.response;

      if (status === 400 && data?.message) {
        errorMessage = data.message;
      } else if (status === 401) {
        errorMessage = "Invalid credentials. Please try again.";
      } else if (status === 409) {
        errorMessage = "An account with this email already exists.";
      } else if (status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }
    } else if (err.request) {
      errorMessage =
        "Unable to connect to the server. Please check your internet connection.";
    } else if (err.message) {
      errorMessage = err.message;
    }

    setError(errorMessage);
    return errorMessage;
  }, []);

  // Get authentication headers
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("auth_token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, []);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // The value that will be available to components
  const value = {
    user,
    loading,
    error,
    isInitialized,
    isAuthenticated: !!user,
    login,
    logout,
    signup,
    forgotPassword,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
