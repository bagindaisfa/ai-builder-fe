import React from "react";
import { Select, Flex, Typography, Badge } from "antd";
import { ProjectOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function ProjectSelector({ 
  workflows, 
  selectedProject, 
  onProjectSelect, 
  placeholder = "Select a project to link documents",
  style = {} 
}) {
  return (
    <Select
      placeholder={placeholder}
      value={selectedProject}
      onChange={onProjectSelect}
      style={{ width: "100%", ...style }}
      size="large"
      allowClear
      suffixIcon={<ProjectOutlined />}
    >
      {workflows.map(project => (
        <Select.Option key={project.id} value={project.id}>
          <Flex justify="space-between" align="center" style={{ padding: "4px 0" }}>
            <Flex vertical style={{ flex: 1 }}>
              <Text style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                fontFamily: "'Montserrat', sans-serif"
              }}>
                {project.name}
              </Text>
              <Text style={{
                fontSize: "12px",
                color: "#6b7280",
                fontFamily: "'Montserrat', sans-serif"
              }}>
                {project.description}
              </Text>
            </Flex>
            <Badge 
              status={project.status === 'deployed' ? 'success' : 'processing'} 
              text={project.status === 'deployed' ? 'Live' : 'Draft'}
              style={{ marginLeft: "8px" }}
            />
          </Flex>
        </Select.Option>
      ))}
    </Select>
  );
}