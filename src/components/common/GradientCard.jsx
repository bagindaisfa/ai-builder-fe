import React from "react";
import { Card } from "antd";

export default function GradientCard({ 
  children, 
  gradient = "linear-gradient(135deg, #277c90 0%, #66a0b8 100%)",
  style,
  bodyStyle,
  ...props 
}) {
  return (
    <Card
      style={{
        background: gradient,
        border: "none",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(39, 124, 144, 0.3)",
        ...style,
      }}
      bodyStyle={{
        padding: "20px 24px",
        ...bodyStyle,
      }}
      {...props}
    >
      {children}
    </Card>
  );
}