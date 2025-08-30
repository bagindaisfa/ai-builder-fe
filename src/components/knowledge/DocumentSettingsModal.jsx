import React from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  message,
  Card,
} from "antd";
import { SettingOutlined } from "@ant-design/icons";

const { Option } = Select;

const DocumentSettingsModal = ({ visible, onCancel, onSave, documentData }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onSave({
        name: documentData.name,
        description: documentData.description,
        ...values,
      });
      message.success("Document settings saved successfully");
      onCancel();
    } catch (error) {
      console.error("Error saving document settings:", error);
      message.error("Failed to save document settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <>
          <SettingOutlined style={{ marginRight: 8 }} />
          Document Chunk Settings
        </>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          loading={loading}
        >
          Save Settings
        </Button>,
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: documentData.name,
          description: documentData.description,
          max_chunk_len:
            documentData.processing_config?.chunk_setting?.max_chunk_len,
          chunk_overlap:
            documentData.processing_config?.chunk_setting?.chunk_overlap,
          delimiter: documentData.processing_config?.chunk_setting?.delimiter,
          replaceWhitespace:
            documentData.processing_config?.chunk_setting?.text_pre_pocessing_rule.includes(
              "replace consecutive spaces new lines and tabs"
            ),
          removeUrlsAndEmails:
            documentData.processing_config?.chunk_setting?.text_pre_pocessing_rule.includes(
              "delete all urls and email address"
            ),
        }}
      >
        <Form.Item
          name="max_chunk_len"
          label="Maximum Chunk Length (characters)"
          tooltip="The maximum size of each text chunk in characters"
          rules={[
            { required: true, message: "Please enter maximum chunk length" },
          ]}
        >
          <Input type="number" min={100} max={10000} />
        </Form.Item>

        <Form.Item
          name="chunk_overlap"
          label="Chunk Overlap (characters)"
          tooltip="Number of characters that adjacent chunks will overlap"
          rules={[{ required: true, message: "Please enter chunk overlap" }]}
        >
          <Input type="number" min={0} max={5000} />
        </Form.Item>

        <Form.Item
          name="delimiter"
          label="Delimiter"
          tooltip="Character or string used to split the document into chunks"
        >
          <Select>
            <Select.Option value="\n">New Line (\n)</Select.Option>
            <Select.Option value="\n\n">Double New Line (\n\n)</Select.Option>
            <Select.Option value=" ">Space</Select.Option>
            <Select.Option value="\t">Tab (\t)</Select.Option>
            <Select.Option value=". ">Period (.)</Select.Option>
            <Select.Option value="\n- ">List item (\n- )</Select.Option>
            <Select.Option value="">Custom...</Select.Option>
          </Select>
        </Form.Item>

        <Card
          title="Text Pre-processing Rules"
          size="small"
          style={{ marginBottom: 16, marginTop: 16 }}
          bodyStyle={{ padding: "12px 16px" }}
        >
          <Form.Item name="replaceWhitespace" valuePropName="checked">
            <Checkbox>
              Replace consecutive spaces, newlines and tabs with a single space
            </Checkbox>
          </Form.Item>

          <Form.Item name="removeUrlsAndEmails" valuePropName="checked">
            <Checkbox>Delete all URLs and email addresses</Checkbox>
          </Form.Item>
        </Card>
      </Form>
    </Modal>
  );
};

export default DocumentSettingsModal;
