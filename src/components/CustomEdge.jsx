import { getSmoothStepPath } from 'reactflow';
import { CloseOutlined } from '@ant-design/icons';
import { useCallback } from 'react';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) {
  // Hitung path dan posisi tengah edge
  const [edgePath, edgeCenterX, edgeCenterY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  // Handler delete
  const onDelete = useCallback(
    (event) => {
      event.stopPropagation();
      if (data?.onDelete) {
        data.onDelete(id);
      }
    },
    [data, id]
  );

  return (
    <g>
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: style.stroke || '#94a3b8',
          fill: 'none',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <foreignObject
        width={24}
        height={24}
        x={edgeCenterX - 12}
        y={edgeCenterY - 12}
        requiredExtensions="http://www.w3.org/1999/xhtml"
        pointerEvents="all" // <== wajib
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (data?.onDelete) {
              data.onDelete(id);
            }
          }}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#fff',
            border: '1px solid #ff4d4f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <CloseOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
        </div>
      </foreignObject>
    </g>
  );
}
