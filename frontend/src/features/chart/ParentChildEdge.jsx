import { memo } from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';

function ParentChildEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const isPending = data?.isPending;
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    borderRadius: 8,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: 'var(--color-parent-child-line)',
        strokeWidth: 2,
        strokeDasharray: isPending ? '6 4' : 'none',
        opacity: isPending ? 0.5 : 1,
      }}
    />
  );
}

export default memo(ParentChildEdge);
