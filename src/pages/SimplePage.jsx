import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Typography } from 'antd';

const { Title } = Typography;

const SimplePage = () => {
    const { documentId } = useParams();
    const navigate = useNavigate();
    
    console.log('SimplePage rendered with documentId:', documentId);
    
    useEffect(() => {
        console.log('useEffect triggered with documentId:', documentId);
        if (!documentId) {
            console.log('No documentId, navigating to /knowledge');
            navigate('/knowledge');
        }
    }, [documentId, navigate]);

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>Document Details</Title>
            <Title level={4}>Document ID: {documentId}</Title>
            <p>This is a simple page for document: {documentId}</p>
        </div>
    );
};

export default SimplePage;
