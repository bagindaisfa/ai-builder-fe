import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "antd/dist/reset.css";
import "reactflow/dist/style.css";
import "./index.css";

createRoot(document.getElementById("root")).render(<App />);
