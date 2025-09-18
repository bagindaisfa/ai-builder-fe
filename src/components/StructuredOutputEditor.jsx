import React, { useState } from 'react';
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Typography,
  Divider,
  Tooltip,
  Switch,
  Collapse,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined,
  CodeOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

/**
 * Component for editing structured output schemas
 * @param {Object} props
 * @param {Object} props.schema - The current schema object
 * @param {Function} props.onChange - Callback when schema changes
 */
const StructuredOutputEditor = ({ schema, onChange }) => {
  // Initialize with empty schema if none provided
  const [currentSchema, setCurrentSchema] = useState(
    schema || {
      enabled: false,
      properties: [],
      description: '',
    }
  );

  // Handle schema changes and propagate to parent
  const handleSchemaChange = (newSchema) => {
    setCurrentSchema(newSchema);
    onChange(newSchema);
  };

  // Add a new property to the schema
  const addProperty = () => {
    const newProperty = {
      name: `property${currentSchema.properties.length + 1}`,
      type: 'string',
      description: '',
      required: true,
    };

    handleSchemaChange({
      ...currentSchema,
      properties: [...currentSchema.properties, newProperty],
    });
  };

  // Update a property in the schema
  const updateProperty = (index, field, value) => {
    const updatedProperties = [...currentSchema.properties];
    updatedProperties[index] = {
      ...updatedProperties[index],
      [field]: value,
    };

    handleSchemaChange({
      ...currentSchema,
      properties: updatedProperties,
    });
  };

  // Remove a property from the schema
  const removeProperty = (index) => {
    const updatedProperties = [...currentSchema.properties];
    updatedProperties.splice(index, 1);

    handleSchemaChange({
      ...currentSchema,
      properties: updatedProperties,
    });
  };

  // Move a property up in the list
  const movePropertyUp = (index) => {
    if (index === 0) return;

    const updatedProperties = [...currentSchema.properties];
    const temp = updatedProperties[index];
    updatedProperties[index] = updatedProperties[index - 1];
    updatedProperties[index - 1] = temp;

    handleSchemaChange({
      ...currentSchema,
      properties: updatedProperties,
    });
  };

  // Move a property down in the list
  const movePropertyDown = (index) => {
    if (index === currentSchema.properties.length - 1) return;

    const updatedProperties = [...currentSchema.properties];
    const temp = updatedProperties[index];
    updatedProperties[index] = updatedProperties[index + 1];
    updatedProperties[index + 1] = temp;

    handleSchemaChange({
      ...currentSchema,
      properties: updatedProperties,
    });
  };

  // Toggle structured output on/off
  const toggleStructuredOutput = (enabled) => {
    handleSchemaChange({
      ...currentSchema,
      enabled,
    });
  };

  // Update schema description
  const updateDescription = (description) => {
    handleSchemaChange({
      ...currentSchema,
      description,
    });
  };

  // Generate JSON schema preview
  const generateJsonSchema = () => {
    const jsonSchema = {
      type: 'object',
      properties: {},
      required: [],
    };

    if (currentSchema.description) {
      jsonSchema.description = currentSchema.description;
    }

    currentSchema.properties.forEach((prop) => {
      jsonSchema.properties[prop.name] = {
        type: prop.type,
      };

      if (prop.description) {
        jsonSchema.properties[prop.name].description = prop.description;
      }

      if (prop.required) {
        jsonSchema.required.push(prop.name);
      }
    });

    return JSON.stringify(jsonSchema, null, 2);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <Text strong>Structured Output</Text>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            Define a schema for structured LLM responses
          </div>
        </div>
        <Switch
          checked={currentSchema.enabled}
          onChange={toggleStructuredOutput}
        />
      </div>

      {currentSchema.enabled && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Schema Description
            </Text>
            <Input.TextArea
              value={currentSchema.description}
              onChange={(e) => updateDescription(e.target.value)}
              placeholder="Describe what this schema represents"
              rows={2}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <Text strong>Properties</Text>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={addProperty}
              >
                Add Property
              </Button>
            </div>

            {currentSchema.properties.length === 0 ? (
              <Empty
                description="No properties defined"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '20px 0' }}
              />
            ) : (
              <Collapse defaultActiveKey={['0']}>
                {currentSchema.properties.map((property, index) => (
                  <Panel
                    key={index}
                    header={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Text strong>{property.name}</Text>
                        <Text type="secondary" style={{ marginLeft: '8px' }}>
                          ({property.type})
                        </Text>
                        {property.required && (
                          <Text type="danger" style={{ marginLeft: '8px' }}>
                            *required
                          </Text>
                        )}
                      </div>
                    }
                    extra={
                      <Space>
                        <Button
                          icon={<ArrowUpOutlined />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            movePropertyUp(index);
                          }}
                          disabled={index === 0}
                        />
                        <Button
                          icon={<ArrowDownOutlined />}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            movePropertyDown(index);
                          }}
                          disabled={
                            index === currentSchema.properties.length - 1
                          }
                        />
                        <Button
                          icon={<DeleteOutlined />}
                          danger
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeProperty(index);
                          }}
                        />
                      </Space>
                    }
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>Name</Text>
                        <Input
                          value={property.name}
                          onChange={(e) =>
                            updateProperty(index, 'name', e.target.value)
                          }
                          placeholder="Property name"
                        />
                      </div>

                      <div>
                        <Text strong>Type</Text>
                        <Select
                          value={property.type}
                          onChange={(value) =>
                            updateProperty(index, 'type', value)
                          }
                          style={{ width: '100%' }}
                        >
                          <Option value="string">String</Option>
                          <Option value="number">Number</Option>
                          <Option value="boolean">Boolean</Option>
                          <Option value="array">Array</Option>
                          <Option value="object">Object</Option>
                        </Select>
                      </div>

                      <div>
                        <Text strong>Description</Text>
                        <Input
                          value={property.description}
                          onChange={(e) =>
                            updateProperty(index, 'description', e.target.value)
                          }
                          placeholder="Property description"
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Switch
                          checked={property.required}
                          onChange={(checked) =>
                            updateProperty(index, 'required', checked)
                          }
                        />
                        <Text style={{ marginLeft: '8px' }}>Required</Text>
                      </div>
                    </Space>
                  </Panel>
                ))}
              </Collapse>
            )}
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <Text strong>JSON Schema Preview</Text>
              <Tooltip title="This is the JSON schema that will be sent to the LLM">
                <InfoCircleOutlined />
              </Tooltip>
            </div>
            <Card
              size="small"
              style={{
                background: '#f5f5f5',
                marginBottom: '16px',
                maxHeight: '200px',
                overflow: 'auto',
              }}
            >
              <pre style={{ margin: 0 }}>{generateJsonSchema()}</pre>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default StructuredOutputEditor;
