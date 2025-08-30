import React from "react";
import { Badge, Spin } from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

export default function DocumentStatusBadge({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case "completed":
        return {
          status: "success",
          text: "Completed",
          icon: <CheckCircleOutlined style={{ color: "#10b981" }} />,
        };
      case "pending":
        return {
          status: "pending",
          text: "Pending",
          icon: <Spin size="small" />,
        };
      case "failed":
        return {
          status: "error",
          text: "Failed",
          icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
        };
      default:
        return {
          status: "default",
          text: "Unknown",
          icon: <ClockCircleOutlined style={{ color: "#6b7280" }} />,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      {config.icon}
      {config.text}
    </span>
  );
}
