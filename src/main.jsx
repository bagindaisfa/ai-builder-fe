import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, BrowserRouter } from "react-router-dom";
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from "./contexts/AuthContext";
import App from "./App";
import "antd/dist/reset.css";
import "reactflow/dist/style.css";
import "./index.css";

const root = createRoot(document.getElementById("root"));

// Use HashRouter in development for easier setup
// In production, use BrowserRouter for clean URLs
const Router = import.meta.env.DEV ? HashRouter : BrowserRouter;

root.render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  </React.StrictMode>
);
