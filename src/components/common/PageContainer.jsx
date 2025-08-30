import React from "react";
import { Flex } from "antd";

export default function PageContainer({ children, style, fillHeight = true, ...props }) {
  return (
    <Flex
      vertical
      style={{
        height: fillHeight ? "100%" : "auto",
        width: "100%",
        overflow: "auto",
        flex: fillHeight ? 1 : "none",
        ...style,
      }}
      {...props}
    >
      {children}
    </Flex>
  );
}