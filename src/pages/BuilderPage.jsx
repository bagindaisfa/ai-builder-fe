import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message, Spin } from "antd";
import PageContainer from "../components/common/PageContainer";
import BuilderCanvas from "../components/BuilderCanvas";
import { getWorkflow } from "../api/api";

export default function BuilderPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    const loadProject = async () => {
      if (!workflowId) {
        // If no project ID is provided, redirect to workflow page
        navigate('/studio');
        return;
      }

      try {
        setLoading(true);
        const response = await getWorkflow(workflowId);
        // Pass the entire workflow data including nodes and edges
        setInitialData({
          nodes: response.data.nodes || [],
          edges: response.data.edges || []
        });
      } catch (error) {
        console.error('Error loading project:', error);
        message.error('Failed to load project');
        navigate('/studio');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [workflowId, navigate]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BuilderCanvas initialData={initialData} workflowId={workflowId} />
    </PageContainer>
  );
}