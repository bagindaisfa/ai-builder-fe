import React, { memo, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { useTheme } from '../contexts/ThemeContext';

const CustomNode = memo(({ data, id, isConnectable }) => {
  const { isDarkMode } = useTheme();

  // Memoize the source and target positions based on layout direction
  const { sourcePosition, targetPosition } = useMemo(() => {
    const isVertical = data.layoutDirection === 'TB';
    return {
      sourcePosition: isVertical ? Position.Bottom : Position.Right,
      targetPosition: isVertical ? Position.Top : Position.Left,
    };
  }, [data.layoutDirection]);

  // Memoize the node styles
  const nodeStyles = useMemo(
    () => ({
      background: isDarkMode
        ? `${data.color || '#6366f1'}20`
        : `${data.color || '#6366f1'}10`,
      border: `2px solid ${data.color || (isDarkMode ? '#4a5568' : '#6366f1')}`,
      borderRadius: '8px',
      padding: '16px',
      minWidth: '200px',
      boxShadow: isDarkMode
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        : '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        borderColor: data.color || (isDarkMode ? '#63b3ed' : '#4f46e5'),
        boxShadow: isDarkMode
          ? '0 0 0 2px rgba(99, 179, 237, 0.2)'
          : '0 0 0 2px rgba(99, 102, 241, 0.2)',
      },
    }),
    [isDarkMode, data.color]
  );

  // Memoize the handle styles
  const handleStyles = useMemo(
    () => ({
      width: '10px',
      height: '10px',
      background: data.color || '#555',
      border: `2px solid ${data.color || '#555'}`,
      borderRadius: '50%',
    }),
    [data.color]
  );

  return (
    <div style={nodeStyles}>
      {id !== 'start-1' && (
        <Handle
          type="target"
          position={targetPosition}
          style={handleStyles}
          isConnectable={isConnectable}
        />
      )}
      <div
        style={{
          textAlign: 'left',
          fontWeight: '600',
          marginBottom: '8px',
          color: isDarkMode ? '#e2e8f0' : data.color || '#333',
          fontSize: '14px',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        {data.label}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: isDarkMode ? '#a0aec0' : '#4a5568',
          marginBottom: '8px',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        {data.description}
      </div>
      {id !== 'start-1' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: isDarkMode ? '#2d3748' : '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                background: data.color || '#999',
                borderRadius: '2px',
              }}
            />
          </div>
        </div>
      )}
      <Handle
        type="source"
        position={sourcePosition}
        style={handleStyles}
        isConnectable={isConnectable}
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;
