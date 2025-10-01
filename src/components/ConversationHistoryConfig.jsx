import React from 'react';
import { Typography, Switch, InputNumber, Divider } from 'antd';

const { Text } = Typography;

const ConversationHistoryConfig = ({ settings, updateSettings }) => {
  const conversationHistory = settings?.conversationHistory || {
    enabled: true,
    maxMessages: settings.nodeType === 'llm' ? 10 : 5,
    maxMessageLength: settings.nodeType === 'llm' ? 1000 : 500,
  };

  const handleChange = (key, value) => {
    const updatedHistory = {
      ...conversationHistory,
      [key]: value,
    };
    
    updateSettings({
      ...settings,
      conversationHistory: updatedHistory,
    });
  };

  return (
    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
      <Divider orientation="left">
        <Text strong>Conversation History</Text>
      </Divider>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px' 
      }}>
        <div>
          <Text strong>Enable Conversation History</Text>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Use previous messages for context
          </div>
        </div>
        <Switch
          checked={conversationHistory.enabled}
          onChange={(checked) => handleChange('enabled', checked)}
        />
      </div>

      {conversationHistory.enabled && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Max Messages
            </Text>
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>
              Maximum number of previous messages to include
            </div>
            <InputNumber
              min={1}
              max={50}
              value={conversationHistory.maxMessages}
              onChange={(value) => handleChange('maxMessages', value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Max Message Length
            </Text>
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>
              Maximum characters per message (longer messages will be truncated)
            </div>
            <InputNumber
              min={100}
              max={10000}
              step={100}
              value={conversationHistory.maxMessageLength}
              onChange={(value) => handleChange('maxMessageLength', value)}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ConversationHistoryConfig;
