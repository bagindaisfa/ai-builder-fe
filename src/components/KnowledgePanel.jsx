import React, { useState, useEffect } from "react";
import { Button, Typography, Card, Row, Col, message, Flex } from "antd";
import { PlusOutlined, DatabaseOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import DatasetCard from "./knowledge/DatasetCard";
import CreateDatasetModal from "./knowledge/CreateDatasetModal";
import { getDatasets } from "../api/datasetApi";
import GradientCard from "./common/GradientCard";

const { Title, Text } = Typography;

const KnowledgePanel = () => {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      setIsLoading(true);
      const data = await getDatasets();
      setDatasets(data);
    } catch (error) {
      console.error("Error fetching datasets:", error);
      message.error("Failed to load datasets");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDataset = async (newDataset) => {
    try {
      setDatasets((prev) => [newDataset, ...prev]);
      message.success(
        `Dataset created successfully with ${
          newDataset.documents?.length || 0
        } files`
      );
      setIsCreateModalVisible(false);
    } catch (error) {
      console.error("Error creating dataset:", error);
      message.error("Failed to create dataset");
    }
  };

  const handleDatasetClick = (datasetId) => {
    navigate(`/datasets/${datasetId}`);
  };

  return (
    <Flex vertical gap="large" style={{ height: "100%" }}>
      <GradientCard>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Flex align="center" gap="middle">
            <DatabaseOutlined style={{ fontSize: "24px", color: "#fff" }} />
            <div>
              <Title
                level={4}
                style={{
                  margin: 0,
                  color: "#fff",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                Knowledge
              </Title>
              <Text style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                Manage your knowledges and documents
              </Text>
            </div>
          </Flex>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalVisible(true)}
          >
            Create Knowledge
          </Button>
        </div>
      </GradientCard>

      <div style={{ marginTop: 24 }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">Loading datasets...</Text>
          </div>
        ) : datasets.length > 0 ? (
          <Row gutter={[16, 16]}>
            {datasets.map((dataset) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={dataset.id}>
                <DatasetCard
                  dataset={dataset}
                  onClick={() => handleDatasetClick(dataset.uuid)}
                />
              </Col>
            ))}
          </Row>
        ) : (
          <Card style={{ textAlign: "center", padding: "40px 0" }}>
            <DatabaseOutlined
              style={{ fontSize: 48, color: "#999", marginBottom: 16 }}
            />
            <Title level={4} style={{ marginBottom: 8 }}>
              No datasets yet
            </Title>
            <Text
              type="secondary"
              style={{ display: "block", marginBottom: 24 }}
            >
              Create your first dataset to get started
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalVisible(true)}
            >
              Create Knowledge
            </Button>
          </Card>
        )}
      </div>

      <CreateDatasetModal
        visible={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          fetchDatasets();
        }}
        onCreate={handleCreateDataset}
      />
    </Flex>
  );
};

export default KnowledgePanel;
