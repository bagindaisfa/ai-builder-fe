import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { DownOutlined, CodeOutlined } from '@ant-design/icons';
import { Input, Spin, Tooltip } from 'antd';
import { getWorkflowVariables } from '../../api/api';

const VariablePick = ({
  value = '',
  onChange = () => {},
  placeholder = 'Enter value...',
  className = '',
  dropdownItems: initialDropdownItems = [],
  onSelectVariable = () => {},
  workflowUuid = '',
  currentNodeId = '',
  autoFetchVariables = true,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [variables, setVariables] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Fetch variables when workflowUuid or currentNodeId changes
  useEffect(() => {
    const fetchVariables = async () => {
      if (!autoFetchVariables || !workflowUuid) return;
      
      setIsLoading(true);
      try {
        const response = await getWorkflowVariables(workflowUuid, currentNodeId);
        setVariables(response.variables || []);
      } catch (error) {
        console.error('Error fetching workflow variables:', error);
        setVariables([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVariables();
  }, [workflowUuid, currentNodeId, autoFetchVariables]);

  // Combine initial dropdown items with fetched variables
  const dropdownItems = [
    ...initialDropdownItems,
    ...variables.map(variable => ({
      label: variable.name,
      value: `{{${variable.name}}}`,
      type: variable.type,
    })),
  ];

  // Filter variables based on search query
  const filteredItems = searchQuery
    ? dropdownItems.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.value && item.value.toString().toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : dropdownItems;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleVariableSelect = (variable) => {
    // If variable has a value, use that, otherwise use the label
    const valueToInsert = variable.value || `{{${variable.label || variable}}}`;
    onChange(valueToInsert);
    onSelectVariable(variable);
    setIsDropdownOpen(false);
  };

  const handleSearch = (searchValue) => {
    setSearchQuery(searchValue);
  };

  const handleInputClick = (e) => {
    e.stopPropagation();
    setIsDropdownOpen(true);
  };

  const handleDropdownVisibleChange = (open) => {
    setIsDropdownOpen(open);
  };

  // Create a portal for the dropdown to ensure proper z-index and positioning
  const dropdownContent = isDropdownOpen && (
    <div 
      className="variable-dropdown-container"
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        zIndex: 1050,
        marginTop: '4px',
        width: '300px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div className="p-2">
        <Input
          placeholder="Search variables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{ marginBottom: '8px' }}
          autoFocus
        />
      </div>
      <div className="variable-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Spin size="small" />
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item, index) => (
            <div
              key={index}
              className="variable-item"
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                ':hover': { backgroundColor: '#f5f5f5' },
                ...(item.type === 'system' && { color: '#1677ff', fontWeight: 500 })
              }}
              onClick={() => handleVariableSelect(item)}
            >
              <CodeOutlined style={{ marginRight: '8px', color: '#8c8c8c' }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label || item}
              </span>
              {item.type && (
                <span style={{
                  marginLeft: '8px',
                  padding: '0 6px',
                  background: '#f0f0f0',
                  borderRadius: '2px',
                  fontSize: '12px',
                  color: '#8c8c8c'
                }}>
                  {item.type}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-400">
            {searchQuery ? 'No matching variables found' : 'No variables available'}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`variable-pick ${className}`} ref={dropdownRef} style={{ position: 'relative' }}>
      <div className="ant-input-group" style={{ display: 'flex', position: 'relative' }}>
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearchQuery(e.target.value);
          }}
          onClick={handleInputClick}
          placeholder={placeholder}
          style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        />
        <button
          type="button"
          className="ant-input-group-addon"
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen(!isDropdownOpen);
          }}
          style={{
            background: '#f5f5f5',
            border: '1px solid #d9d9d9',
            borderLeft: 'none',
            borderTopRightRadius: '6px',
            borderBottomRightRadius: '6px',
            padding: '0 11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CodeOutlined className="text-gray-400" />
          <DownOutlined 
            className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
            style={{ marginLeft: 4, fontSize: '12px' }}
          />
        </button>
      </div>
      {ReactDOM.createPortal(
        dropdownContent,
        document.body
      )}
    </div>
  );
};

export default VariablePick;