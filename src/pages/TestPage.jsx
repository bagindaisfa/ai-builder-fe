import React from 'react';
import { useParams } from 'react-router-dom';

const TestPage = () => {
  const { documentId } = useParams();
  
  console.log('TestPage rendered with documentId:', documentId);
  
  return (
    <div style={{ 
      padding: '24px',
      backgroundColor: '#f0f2f5',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      color: '#1890ff'
    }}>
      <h1>Test Page</h1>
      <p>Document ID: {documentId}</p>
    </div>
  );
};

export default TestPage;
