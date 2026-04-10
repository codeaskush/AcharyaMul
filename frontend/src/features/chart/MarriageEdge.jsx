import { memo } from 'react';
import { BaseEdge, getStraightPath } from '@xyflow/react';

function MarriageEdge({ id, sourceX, sourceY, targetX, targetY, data, style }) {
  const isDivorced = data?.marriage_status === 'divorced';
  const isPending = data?.isPending;
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  // Allow style override (used by sibling bar edges which pass grey color)
  const strokeColor = style?.stroke || '#f87171';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth: style?.strokeWidth || 2,
        strokeDasharray: isDivorced || isPending ? '6 4' : 'none',
        opacity: isPending ? 0.5 : 1,
      }}
    />
  );
}

export default memo(MarriageEdge);
