import { useStore } from '@xyflow/react';

/**
 * SVG overlay for connectors (marriage + parent-child lines).
 * Rendered inside React Flow viewport — pans/zooms with nodes.
 *
 * Generation labels are rendered separately as a fixed HTML overlay.
 */
export function ConnectorsSvg({ connectors }) {
  const transform = useStore((s) => s.transform);
  const [tx, ty, scale] = transform;

  if (!connectors || connectors.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 0,
      }}
    >
      <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
        {connectors.map((c, i) => {
          if (c.type === 'marriage') {
            return (
              <line
                key={`m-${i}`}
                x1={c.x1}
                y1={c.y1}
                x2={c.x2}
                y2={c.y2}
                stroke={c.marriage_status === 'divorced' ? '#f87171' : '#fca5a5'}
                strokeWidth={2}
                strokeDasharray={c.marriage_status === 'divorced' ? '6 4' : 'none'}
              />
            );
          }

          if (c.type === 'parent-child') {
            const midY = c.parentY + (c.childY - c.parentY) / 2;
            return (
              <path
                key={`pc-${i}`}
                d={`M ${c.parentX} ${c.parentY} L ${c.parentX} ${midY} L ${c.childX} ${midY} L ${c.childX} ${c.childY}`}
                fill="none"
                stroke="#9ca3af"
                strokeWidth={1.5}
              />
            );
          }
          return null;
        })}
      </g>
    </svg>
  );
}

/**
 * Fixed generation labels — pinned to left edge, vertically centered.
 * Plain text, rotated 90 degrees anticlockwise.
 */
export function GenerationLabels({ generationRows }) {
  const transform = useStore((s) => s.transform);
  const [tx, ty, scale] = transform;

  if (!generationRows || generationRows.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {generationRows.map(({ generation, y, nextY }) => {
        const NODE_H = 70;
        const midY = y + NODE_H / 2;
        const screenY = ty + midY * scale;

        return (
          <div
            key={`gen-${generation}`}
            style={{
              position: 'absolute',
              left: 10,
              top: screenY,
              transform: 'translateY(-50%)',
              writingMode: 'vertical-rl',
              transform: 'translateY(-50%) rotate(180deg)',
            }}
          >
            <span className="text-[10px] font-medium text-gray-300 tracking-[0.2em] uppercase whitespace-nowrap select-none">
              Generation {generation}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Dotted separator lines between generations.
 * Rendered in SVG overlay — pans/zooms with nodes.
 */
const NODE_H = 70;

export function GenerationDividers({ generationRows }) {
  const transform = useStore((s) => s.transform);
  const [tx, ty, scale] = transform;

  if (!generationRows || generationRows.length < 2) return null;

  // Calculate divider positions: midpoint between bottom of gen N and top of gen N+1
  const dividers = [];
  for (let i = 0; i < generationRows.length - 1; i++) {
    const thisBottom = generationRows[i].y + NODE_H;
    const nextTop = generationRows[i + 1].y;
    const divY = thisBottom + (nextTop - thisBottom) / 2;
    dividers.push({
      y: divY,
      minX: Math.min(generationRows[i].minX, generationRows[i + 1].minX) - 60,
      maxX: Math.max(generationRows[i].maxX, generationRows[i + 1].maxX) + 60,
    });
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 0,
      }}
    >
      <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
        {dividers.map((d, i) => (
          <line
            key={`div-${i}`}
            x1={d.minX}
            y1={d.y}
            x2={d.maxX}
            y2={d.y}
            stroke="#e5e7eb"
            strokeWidth={1}
            strokeDasharray="8 6"
          />
        ))}
      </g>
    </svg>
  );
}
