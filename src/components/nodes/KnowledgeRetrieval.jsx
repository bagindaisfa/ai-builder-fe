import React, { useState, useEffect } from 'react';
import { Typography, Button, Slider, Radio, Space, Select } from 'antd';
import { DatabaseOutlined, CloseCircleFilled } from '@ant-design/icons';

const { Title, Text } = Typography;

const KnowledgeRetrieval = ({
  workflowId,
  selectedNode,
  updateNodeData,
  handleOpenKnowledgeModal,
  handleRemoveKnowledge,
}) => {
  // --- Local states ---
  const [topK, setTopK] = useState(selectedNode.data.topK || 5);
  const [method, setMethod] = useState(selectedNode.data.method || 'full-text');
  const [embeddingModel, setEmbeddingModel] = useState(
    selectedNode.data.embeddingModel || 'llama2'
  );

  // Reset state ketika node berganti
  useEffect(() => {
    setTopK(selectedNode.data.topK || 5);
    setMethod(selectedNode.data.method || 'full-text');
    setEmbeddingModel(selectedNode.data.embeddingModel || 'llama2');
  }, [selectedNode?.id]);

  if (!selectedNode) return null;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <Title level={5} style={{ margin: 0, color: '#262626' }}>
          Knowledge Retrieval
        </Title>
        <Button
          type="primary"
          onClick={handleOpenKnowledgeModal}
          icon={<DatabaseOutlined />}
        >
          Select Knowledge
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Selected Knowledge */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Selected Knowledge
            </Text>
            {selectedNode.data.knowledgeBases?.length > 0 ? (
              <div
                style={{
                  padding: '12px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  border: '1px solid #d9d9d9',
                }}
              >
                {selectedNode.data.knowledgeBases.map((kb) => (
                  <div
                    key={kb.id}
                    style={{
                      padding: '8px 12px',
                      background: 'white',
                      borderRadius: '4px',
                      border: '1px solid #f0f0f0',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.3s',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                        {kb.name}
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        ID: {kb.id}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      icon={<CloseCircleFilled style={{ color: '#ff4d4f' }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveKnowledge(kb.id);
                      }}
                      style={{ color: '#ff4d4f' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '12px',
                  background: '#fafafa',
                  borderRadius: '4px',
                  border: '1px dashed #d9d9d9',
                  color: '#999',
                  textAlign: 'center',
                }}
              >
                No knowledge base selected
              </div>
            )}
          </div>
        </div>

        {/* Top K Results */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            Top K Results: {topK}
          </Text>
          <Slider
            min={1}
            max={10}
            value={topK}
            onChange={(value) => setTopK(value)}
            onAfterChange={(value) =>
              updateNodeData(selectedNode.id, { topK: value })
            }
            marks={{ 1: '1', 3: '3', 5: '5', 7: '7', 10: '10' }}
          />
        </div>

        {/* Retrieval Method */}
        <div style={{ marginTop: '16px' }}>
          <Text strong style={{ display: 'block', marginBottom: '8px' }}>
            Retrieval Method
          </Text>
          <Radio.Group
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            onBlur={() => updateNodeData(selectedNode.id, { method })}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="full-text">
                <div>
                  <Text strong>Full-Text</Text>
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    Keyword-based search using text matching
                  </div>
                </div>
              </Radio>
              <Radio value="semantic">
                <div>
                  <Text strong>Semantic</Text>
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    Vector-based search using embeddings
                  </div>
                </div>
              </Radio>
              <Radio value="hybrid">
                <div>
                  <Text strong>Hybrid</Text>
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    Combined keyword and semantic search
                  </div>
                </div>
              </Radio>
            </Space>
          </Radio.Group>
        </div>

        {/* Embedding Model (conditional) */}
        {selectedNode.data.useOllamaEmbeddings && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Embedding Model
            </Text>
            <Select
              value={embeddingModel}
              onChange={(value) => setEmbeddingModel(value)}
              onBlur={() => updateNodeData(selectedNode.id, { embeddingModel })}
              style={{ width: '100%' }}
            >
              <Select.Option value="llama2">Llama 2</Select.Option>
              <Select.Option value="codellama">Code Llama</Select.Option>
              <Select.Option value="mistral">Mistral</Select.Option>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeRetrieval;
