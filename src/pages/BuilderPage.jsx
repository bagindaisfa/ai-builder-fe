import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import PageContainer from '../components/common/PageContainer';
import BuilderCanvas from '../components/BuilderCanvas';
import { getWorkflow } from '../api/api';

export default function BuilderPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  // inject handler delete
  const normalizeEdges = useCallback(
    (edges, handleDelete) =>
      edges.map((edge) => ({
        ...edge,
        type: 'custom',
        data: {
          ...edge.data,
          onDelete: handleDelete,
        },
      })),
    []
  );

  useEffect(() => {
    const loadProject = async () => {
      if (!workflowId) {
        navigate('/studio');
        return;
      }

      try {
        setLoading(true);
        const response = await getWorkflow(workflowId);

        // definisikan handler delete disini (akan diteruskan via data.onDelete)
        const handleDeleteEdge = (edgeId) => {
          setInitialData((prev) => ({
            ...prev,
            edges: prev.edges.filter((e) => e.id !== edgeId),
          }));
        };

        // normalisasi edges sebelum masuk ke canvas
        const normalizedEdges = normalizeEdges(
          response.data.edges || [],
          handleDeleteEdge
        );

        setInitialData({
          nodes: response.data.nodes || [],
          edges: normalizedEdges,
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
  }, [workflowId, navigate, normalizeEdges]);

  if (loading) {
    return (
      <PageContainer>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '80vh',
          }}
        >
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
