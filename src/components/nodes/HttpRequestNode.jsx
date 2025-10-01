/**
 * HttpRequestNode component
 * 
 */

import ReactFlow, {
    Handle,
    Position
    } from 'reactflow';
import { Card, Typography, Tag, Select, Input, InputNumber, Button, Modal, message, Tooltip, Table, Space, Radio } from 'antd';
import { DatabaseOutlined, CodeOutlined, CloseOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import VariableSelector from '../VariableSelector';

const { Text } = Typography;

const HttpRequestNode = ({ selectedNode, workflowId, updateNodeData }) => {

  const { label, method, url, headers = [], params = [] } = selectedNode.data;

  return (
    <div className="custom-node http-request-node">
      <Card
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DatabaseOutlined style={{ color: '#722ed1' }} />
            <Text ellipsis style={{ maxWidth: 150 }}>
              {label}
            </Text>
          </div>
        }
        headStyle={{
          backgroundColor: '#f9f0ff',
          borderBottom: '1px solid #d9d9d9',
          padding: '8px 12px',
          minHeight: 40,
        }}
        bodyStyle={{ padding: '12px' }}
      >
        <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <Text
                        strong
                        style={{ display: 'block', marginBottom: '8px' }}
                      >
                        Method
                      </Text>
                      <Select
                        value={selectedNode.data.method || 'GET'}
                        onChange={(value) =>
                          updateNodeData(selectedNode.id, { method: value })
                        }
                        style={{ width: '100%' }}
                      >
                        <Select.Option value="GET">GET</Select.Option>
                        <Select.Option value="POST">POST</Select.Option>
                        <Select.Option value="PUT">PUT</Select.Option>
                        <Select.Option value="DELETE">DELETE</Select.Option>
                      </Select>
                    </div>

                    <div>
                        <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                        }}
                        >
                            <Text
                                strong
                                style={{ display: 'block', marginBottom: '8px' }}
                            >
                                URL
                            </Text>
                                <VariableSelector
                                    workflowUuid={workflowId}
                                    currentNodeId={selectedNode.id}
                                    onSelect={(variable) => {
                                        updateNodeData(selectedNode.id, {
                                            url: selectedNode.data.url + variable,
                                        });
                                    }}
                                >
                                    <Button
                                    size="small"
                                    icon={<CodeOutlined />}
                                    style={{ marginLeft: 8 }}
                                    >
                                    Insert Variable
                                    </Button>
                                </VariableSelector>
                                
                        </div>
                            <Input
                                value={selectedNode.data.url || ''}
                                onChange={(e) =>
                                updateNodeData(selectedNode.id, {   
                                    url: e.target.value,
                                })
                                }
                                placeholder="https://api.example.com/endpoint"
                            />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <Text strong>Headers</Text>
                            <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                const currentHeaders = Array.isArray(selectedNode.data.headers) 
                                ? [...selectedNode.data.headers] 
                                : [];
                                currentHeaders.push({ key: '', value: '' });
                                updateNodeData(selectedNode.id, {
                                headers: currentHeaders
                                });
                            }}
                            >
                            Add Header
                            </Button>
                        </div>
                        <Table
                            size="small"
                            pagination={false}
                            dataSource={Array.isArray(selectedNode.data.headers) ? selectedNode.data.headers : []}
                            columns={[
                            {
                                title: 'Key',
                                dataIndex: 'key',
                                key: 'key',
                                width: '40%',
                                render: (_, record, index) => (
                                <Input
                                    value={record.key}
                                    onChange={(e) => {
                                    const newHeaders = [...(Array.isArray(selectedNode.data.headers) ? selectedNode.data.headers : [])];
                                    newHeaders[index].key = e.target.value;
                                    updateNodeData(selectedNode.id, {
                                        headers: newHeaders
                                    });
                                    }}
                                    placeholder="Header name"
                                    size="small"
                                />
                                ),
                            },
                            {
                                title: 'Value',
                                dataIndex: 'value',
                                key: 'value',
                                width: '50%',
                                render: (_, record, index) => (
                                <Input
                                    value={record.value}
                                    onChange={(e) => {
                                    const newHeaders = [...(Array.isArray(selectedNode.data.headers) ? selectedNode.data.headers : [])];
                                    newHeaders[index].value = e.target.value;
                                    updateNodeData(selectedNode.id, {
                                        headers: newHeaders
                                    });
                                    }}
                                    placeholder="Header value"
                                    size="small"
                                />
                                ),
                            },
                            {
                                title: '',
                                key: 'action',
                                width: '10%',
                                render: (_, record, index) => (
                                <Button
                                    danger
                                    type="text"
                                    icon={<DeleteOutlined />}
                                    onClick={() => {
                                    const newHeaders = [...(Array.isArray(selectedNode.data.headers) ? selectedNode.data.headers : [])];
                                    newHeaders.splice(index, 1);
                                    updateNodeData(selectedNode.id, {
                                        headers: newHeaders
                                    });
                                    }}
                                    size="small"
                                />
                                ),
                            },
                            ]}
                            rowKey={(record, index) => index}
                            style={{ marginBottom: '16px' }}
                        />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <Text strong>Params</Text>
                            <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                const currentParams = Array.isArray(selectedNode.data.params) 
                                ? [...selectedNode.data.params] 
                                : [];
                                currentParams.push({ key: '', value: '' });
                                updateNodeData(selectedNode.id, {
                                    params: currentParams
                                });
                            }}
                            >
                            Add Params
                            </Button>
                        </div>
                        <Table
                            size="small"
                            pagination={false}
                            dataSource={Array.isArray(selectedNode.data.params) ? selectedNode.data.params : []}
                            columns={[
                            {
                                title: 'Key',
                                dataIndex: 'key',
                                key: 'key',
                                width: '40%',
                                render: (_, record, index) => (
                                <Input
                                    value={record.key}
                                    onChange={(e) => {
                                    const newParams = [...(Array.isArray(selectedNode.data.params) ? selectedNode.data.params : [])];
                                    newParams[index].key = e.target.value;
                                    updateNodeData(selectedNode.id, {
                                        params: newParams
                                    });
                                    }}
                                    placeholder="Param name"
                                    size="small"
                                />
                                ),
                            },
                            {
                                title: 'Value',
                                dataIndex: 'value',
                                key: 'value',
                                width: '50%',
                                render: (_, record, index) => (
                                <Input
                                    value={record.value}
                                    onChange={(e) => {
                                    const newParams = [...(Array.isArray(selectedNode.data.params) ? selectedNode.data.params : [])];
                                    newParams[index].value = e.target.value;
                                    updateNodeData(selectedNode.id, {
                                        params: newParams
                                    });
                                    }}
                                    placeholder="Param value"
                                    size="small"
                                />
                                ),
                            },
                            {
                                title: '',
                                key: 'action',
                                width: '10%',
                                render: (_, record, index) => (
                                <Button
                                    danger
                                    type="text"
                                    icon={<DeleteOutlined />}
                                    onClick={() => {
                                    const newParams = [...(Array.isArray(selectedNode.data.params) ? selectedNode.data.params : [])];
                                    newParams.splice(index, 1);
                                    updateNodeData(selectedNode.id, {
                                        params: newParams
                                    });
                                    }}
                                    size="small"
                                />
                                ),
                            },
                            ]}
                            rowKey={(record, index) => index}
                            style={{ marginBottom: '16px' }}
                        />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <Text strong>Body *</Text>
                        </div>

                        <Radio.Group
                            value={selectedNode.data.bodyType || 'none'}
                            onChange={(e) => {
                                updateNodeData(selectedNode.id, {
                                    bodyType: e.target.value,
                                    // Initialize the corresponding data structure when switching types
                                    bodyData: e.target.value === 'form-data' ? [] : 
                                            e.target.value === 'x-www-form-urlencoded' ? [] : 
                                            e.target.value === 'json' ? '{}' :
                                            e.target.value === 'raw' ? '' :
                                            e.target.value === 'binary' ? '' :
                                            null
                                });
                            }}
                            style={{ marginBottom: '16px' }}
                        >
                            <Radio.Button value="none">None</Radio.Button>
                            <Radio.Button value="raw">Raw</Radio.Button>
                            <Radio.Button value="form-data">Form Data</Radio.Button>
                            <Radio.Button value="x-www-form-urlencoded">x-www-form-urlencoded</Radio.Button>
                            <Radio.Button value="json">JSON</Radio.Button>
                        </Radio.Group>

                        {/* Raw Body */}
                        {selectedNode.data.bodyType === 'raw' && (
                            <Input.TextArea
                                value={selectedNode.data.bodyData || ''}
                                onChange={(e) => updateNodeData(selectedNode.id, { bodyData: e.target.value })}
                                rows={4}
                                placeholder="Enter raw body content"
                                style={{ marginBottom: '16px' }}
                            />
                        )}

                        {/* Form Data */}
                        {selectedNode.data.bodyType === 'form-data' && (
                            <div>
                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        const currentFormData = Array.isArray(selectedNode.data.bodyData) 
                                            ? [...selectedNode.data.bodyData] 
                                            : [];
                                        currentFormData.push({ key: '', type: 'text', value: '' });
                                        updateNodeData(selectedNode.id, {
                                            bodyData: currentFormData
                                        });
                                    }}
                                    style={{ marginBottom: '8px' }}
                                >
                                    Add Field
                                </Button>
                                <Table
                                    size="small"
                                    pagination={false}
                                    dataSource={Array.isArray(selectedNode.data.bodyData) ? selectedNode.data.bodyData : []}
                                    columns={[
                                        {
                                            title: 'Key',
                                            dataIndex: 'key',
                                            width: '30%',
                                            render: (_, record, index) => (
                                                <Input
                                                    value={record.key}
                                                    onChange={(e) => {
                                                        const newData = [...selectedNode.data.bodyData];
                                                        newData[index].key = e.target.value;
                                                        updateNodeData(selectedNode.id, { bodyData: newData });
                                                    }}
                                                    placeholder="Key"
                                                    size="small"
                                                />
                                            ),
                                        },
                                        {
                                            title: 'Type',
                                            dataIndex: 'type',
                                            width: '20%',
                                            render: (_, record, index) => (
                                                <Select
                                                    value={record.type}
                                                    onChange={(value) => {
                                                        const newData = [...selectedNode.data.bodyData];
                                                        newData[index].type = value;
                                                        updateNodeData(selectedNode.id, { bodyData: newData });
                                                    }}
                                                    size="small"
                                                    style={{ width: '100%' }}
                                                >
                                                    <Select.Option value="text">Text</Select.Option>
                                                    <Select.Option value="file">File</Select.Option>
                                                </Select>
                                            ),
                                        },
                                        {
                                            title: 'Value',
                                            dataIndex: 'value',
                                            width: '40%',
                                            render: (_, record, index) => (
                                                record.type === 'file' ? (
                                                    
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Input
                                                            value={record.value}
                                                            onChange={(e) => {
                                                                const newData = [...selectedNode.data.bodyData];
                                                                newData[index].value = e.target.value;
                                                                updateNodeData(selectedNode.id, { bodyData: newData });
                                                            }}
                                                            onClick={() => {
                                                                setIsDropdownOpen(true);
                                                            }}
                                                            placeholder="Select Variable"
                                                            size="small"
                                                            style={{ flex: 1 }}
                                                            readOnly
                                                        />
                                                        <VariableSelector
                                                            workflowUuid={workflowId}
                                                            currentNodeId={selectedNode.id}
                                                            onSelect={(variable) => {
                                                                const currentValue = record.value || '';
                                                                const newData = [...selectedNode.data.bodyData];
                                                                newData[index].value = currentValue + variable;
                                                                updateNodeData(selectedNode.id, { bodyData: newData });
                                                            }}
                                                        >
                                                            <Button 
                                                                size="small"
                                                                icon={<CodeOutlined />}
                                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                Var
                                                            </Button>
                                                        </VariableSelector>

                                                     </div>

                                                ) : (
                                                    
                                                <Input
                                                    value={record.value}
                                                    onChange={(e) => {
                                                        const newData = [...selectedNode.data.bodyData];
                                                        newData[index].value = e.target.value;
                                                        updateNodeData(selectedNode.id, { bodyData: newData });
                                                    }}
                                                    placeholder="Value"
                                                    size="small"
                                                />
                                                )
                                                
                                            ),
                                        },
                                        {
                                            title: '',
                                            key: 'action',
                                            width: '10%',
                                            render: (_, __, index) => (
                                                <Button
                                                    danger
                                                    type="text"
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => {
                                                        const newData = [...selectedNode.data.bodyData];
                                                        newData.splice(index, 1);
                                                        updateNodeData(selectedNode.id, { bodyData: newData });
                                                    }}
                                                    size="small"
                                                />
                                            ),
                                        },
                                    ]}
                                    rowKey={(_, index) => index}
                                />
                            </div>
                        )}

                        {/* x-www-form-urlencoded */}
                        {selectedNode.data.bodyType === 'x-www-form-urlencoded' && (
                            <div>
                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        const currentData = Array.isArray(selectedNode.data.bodyData) 
                                            ? [...selectedNode.data.bodyData] 
                                            : [];
                                        currentData.push({ key: '', value: '' });
                                        updateNodeData(selectedNode.id, {
                                            bodyData: currentData
                                        });
                                    }}
                                    style={{ marginBottom: '8px' }}
                                >
                                    Add Field
                                </Button>
                                <Table
                                    size="small"
                                    pagination={false}
                                    dataSource={Array.isArray(selectedNode.data.bodyData) ? selectedNode.data.bodyData : []}
                                    columns={[
                                        {
                                            title: 'Key',
                                            dataIndex: 'key',
                                            width: '45%',
                                            render: (_, record, index) => (
                                                <Input
                                                    value={record.key}
                                                    onChange={(e) => {
                                                        const newData = [...selectedNode.data.bodyData];
                                                        newData[index].key = e.target.value;
                                                        updateNodeData(selectedNode.id, { bodyData: newData });
                                                    }}
                                                    placeholder="Key"
                                                    size="small"
                                                />
                                            ),
                                        },
                                        {
                                            title: 'Value',
                                            dataIndex: 'value',
                                            width: '45%',
                                            render: (_, record, index) => (
                                                <Input
                                                    value={record.value}
                                                    onChange={(e) => {
                                                        const newData = [...selectedNode.data.bodyData];
                                                        newData[index].value = e.target.value;
                                                        updateNodeData(selectedNode.id, { bodyData: newData });
                                                    }}
                                                    placeholder="Value"
                                                    size="small"
                                                />
                                            ),
                                        },
                                        {
                                            title: '',
                                            key: 'action',
                                            width: '10%',
                                            render: (_, __, index) => (
                                                <Button
                                                    danger
                                                    type="text"
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => {
                                                        const newData = [...selectedNode.data.bodyData];
                                                        newData.splice(index, 1);
                                                        updateNodeData(selectedNode.id, { bodyData: newData });
                                                    }}
                                                    size="small"
                                                />
                                            ),
                                        },
                                    ]}
                                    rowKey={(_, index) => index}
                                />
                            </div>
                        )}

                        {/* JSON Body */}
                        {selectedNode.data.bodyType === 'json' && (
                            <div>
                                <Input.TextArea
                                    value={selectedNode.data.bodyData || '{}'}
                                    onChange={(e) => {
                                        try {
                                            // Try to parse to validate JSON
                                            JSON.parse(e.target.value);
                                            updateNodeData(selectedNode.id, { 
                                                bodyData: e.target.value,
                                                jsonValid: true
                                            });
                                        } catch (e) {
                                            // If invalid JSON, still update but mark as invalid
                                            updateNodeData(selectedNode.id, { 
                                                bodyData: e.target.value,
                                                jsonValid: false
                                            });
                                        }
                                    }}
                                    rows={6}
                                    placeholder="Enter JSON content"
                                    style={{ 
                                        marginBottom: '16px',
                                        fontFamily: 'monospace',
                                        borderColor: selectedNode.data.jsonValid === false ? '#ff4d4f' : undefined
                                    }}
                                />
                                {selectedNode.data.jsonValid === false && (
                                    <div style={{ color: '#ff4d4f', marginTop: '-12px', marginBottom: '16px', fontSize: '12px' }}>
                                        Invalid JSON format
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Binary Input */}
                        {selectedNode.data.bodyType === 'binary' && (
                            // <Input
                            //     type="file"
                            //     onChange={(e) => {
                            //         const file = e.target.files[0];
                            //         if (file) {
                            //             updateNodeData(selectedNode.id, { 
                            //                 bodyData: file.name,
                            //                 bodyFile: file
                            //             });
                            //         }
                            //     }}
                            //     style={{ marginBottom: '16px' }}
                            // />
                            <Input
                                    value={record.value}
                                    onChange={(e) => {
                                        const newData = [...selectedNode.data.bodyData];
                                        newData[index].value = e.target.value;
                                        updateNodeData(selectedNode.id, { bodyData: newData });
                                    }}
                                    placeholder="Value"
                                    size="small"
                                />
                        )}
                    </div>
                  </div>
      </Card>
    </div>
  );
};

export default HttpRequestNode;