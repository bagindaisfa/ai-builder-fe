import { VariableSizeList as VirtualList, areEqual } from 'react-window';
import React, {
  memo,
  useRef,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { Typography } from 'antd';
import ChatMessage from './ChatMessage';

const { Text } = Typography;

// Memoized row component to prevent unnecessary re-renders
const Row = memo(({ data, index, style }) => {
  const { messages, onToggleProcess, setRowHeight } = data;
  const message = messages[index];
  const rowRef = useRef(null);

  useEffect(() => {
    if (rowRef.current) {
      setRowHeight(index, rowRef.current.clientHeight);
    }
  }, [index, setRowHeight]);

  return (
    <div style={{ ...style, width: '100%' }}>
      <div ref={rowRef} style={{ width: '100%' }}>
        <ChatMessage
          key={message.id}
          message={message}
          onToggleProcess={onToggleProcess}
        />
      </div>
    </div>
  );
}, areEqual);

const VirtualMessagesList = memo(
  ({ testMessages, setTestMessages, isFullWidth }) => {
    const listRef = useRef(null);
    const rowHeights = useRef({});
    const containerRef = useRef(null);
    const [height, setHeight] = useState(0);
    const estimatedItemSize = 120;

    // Auto-scroll to bottom when messages change
    useEffect(() => {
      if (listRef.current && testMessages.length > 0) {
        listRef.current.scrollToItem(testMessages.length - 1, 'end');
      }
    }, [testMessages]);

    const getRowHeight = useCallback((index) => {
      return rowHeights.current[index] || estimatedItemSize;
    }, []);

    const setRowHeight = useCallback((index, height) => {
      if (rowHeights.current[index] !== height) {
        rowHeights.current = { ...rowHeights.current, [index]: height };
        if (listRef.current) {
          listRef.current.resetAfterIndex(0);
        }
      }
    }, []);

    useEffect(() => {
      rowHeights.current = {};
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    }, [testMessages]);

    useEffect(() => {
      rowHeights.current = {};
      if (listRef.current) {
        listRef.current.resetAfterIndex(0, true);
      }
    }, [isFullWidth]);

    useEffect(() => {
      if (!containerRef.current) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setHeight(entry.contentRect.height);
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }, []);

    const itemData = useMemo(
      () => ({
        messages: testMessages,
        onToggleProcess: (messageId) => {
          setTestMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, showProcess: !msg.showProcess }
                : msg
            )
          );
        },
        setRowHeight,
      }),
      [testMessages, setTestMessages]
    );

    const renderRow = useMemo(
      () =>
        ({ index, style }) =>
          <Row data={itemData} index={index} style={style} />,
      [itemData]
    );

    return (
      <div
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: '100%',
        }}
      >
        <div
          style={{
            flex: '1 1 auto',
            overflow: 'auto',
            position: 'relative',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <VirtualList
            ref={listRef}
            height={height}
            itemCount={testMessages.length}
            itemSize={getRowHeight}
            width="100%"
            itemKey={(index) => testMessages[index]?.id || index}
            overscanCount={5}
            estimatedItemSize={estimatedItemSize}
            style={{
              width: '100%',
              overflowX: 'hidden',
              '& > div': {
                width: '100% !important',
                maxWidth: '100%',
                boxSizing: 'border-box',
              },
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#555',
              },
            }}
          >
            {renderRow}
          </VirtualList>
        </div>
      </div>
    );
  }
);

VirtualMessagesList.displayName = 'VirtualMessagesList';

export default VirtualMessagesList;
