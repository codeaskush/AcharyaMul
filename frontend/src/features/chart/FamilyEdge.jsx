import { memo } from 'react';

/**
 * Custom edge that draws a right-angle path:
 * source bottom-center → vertical down to midY → horizontal to target X → vertical down to target top-center
 *
 * This creates the classic family tree T-connector when multiple children share the same midY.
 */
function FamilyEdge({ id, sourceX, sourceY, targetX, targetY, data, style }) {
  const midY = sourceY + (targetY - sourceY) / 2;
  const strokeColor = style?.stroke || '#9ca3af';
  const strokeWidth = style?.strokeWidth || 2;
  const isDashed = data?.dashed;

  // Path: down from source, horizontal to target X, down to target
  const path = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;

  return (
    <g>
      <path
        id={id}
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isDashed ? '6 4' : 'none'}
      />
    </g>
  );
}

export default memo(FamilyEdge);
