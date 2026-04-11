import { useStore } from '@xyflow/react';

/**
 * SVG overlay for connectors (marriage + parent-child lines).
 * Rendered inside React Flow viewport — pans/zooms with nodes.
 *
 * Generation labels are rendered separately as a fixed HTML overlay.
 */
export function ConnectorsSvg({ connectors, onMarriageClick }) {
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
        overflow: 'visible',
        zIndex: 5,
        pointerEvents: 'none',
      }}
    >
      <g transform={`translate(${tx}, ${ty}) scale(${scale})`} style={{ pointerEvents: 'none' }}>
        {/* Marriage lines — clickable for divorce toggle */}
        {connectors.filter(c => c.type === 'marriage').map((c, i) => {
          const isDivorced = c.marriage_status === 'divorced';
          return (
            <g key={`m-${i}`} style={{ cursor: onMarriageClick ? 'pointer' : 'default', pointerEvents: 'auto' }}
               onClick={() => onMarriageClick?.(c)}>
              {/* Invisible thick hitbox for easier clicking */}
              <line
                x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
                stroke="transparent" strokeWidth={12}
              />
              {/* Visible marriage line — dotted if divorced */}
              <line
                x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
                stroke={isDivorced ? '#f87171' : '#fca5a5'}
                strokeWidth={2}
                strokeDasharray={isDivorced ? '6 4' : 'none'}
              />
            </g>
          );
        })}

        {/* Parent-child T-connectors — grouped by drop point so each marriage has its own bar */}
        {(() => {
          const pcConnectors = connectors.filter(c => c.type === 'parent-child');

          // Group by parentX,parentY (each marriage midpoint is a unique drop point)
          const groups = {};
          pcConnectors.forEach(c => {
            const key = `${c.parentX},${c.parentY}`;
            if (!groups[key]) groups[key] = { parentX: c.parentX, parentY: c.parentY, children: [] };
            groups[key].children.push({ x: c.childX, y: c.childY });
          });

          return Object.entries(groups).map(([key, group]) => {
            const { parentX, parentY, children } = group;
            if (children.length === 0) return null;

            const childY = children[0].y; // all children in same generation row
            const barY = parentY + (childY - parentY) / 2;

            // Find leftmost and rightmost child X
            const childXs = children.map(c => c.x);
            const minChildX = Math.min(...childXs);
            const maxChildX = Math.max(...childXs);

            return (
              <g key={`pcg-${key}`}>
                {/* Vertical drop: parent midpoint → bar level */}
                <line
                  x1={parentX} y1={parentY} x2={parentX} y2={barY}
                  stroke="#9ca3af" strokeWidth={1.5}
                />

                {/* Horizontal bar spanning all children */}
                {children.length > 1 && (
                  <line
                    x1={minChildX} y1={barY} x2={maxChildX} y2={barY}
                    stroke="#9ca3af" strokeWidth={1.5}
                  />
                )}

                {/* Vertical drop from bar to each child */}
                {children.map((child, ci) => (
                  <line
                    key={ci}
                    x1={child.x} y1={barY} x2={child.x} y2={child.y}
                    stroke="#9ca3af" strokeWidth={1.5}
                  />
                ))}

                {/* If drop point is not aligned with bar (offset parent), connect drop to bar */}
                {(parentX < minChildX || parentX > maxChildX) && (
                  <line
                    x1={parentX} y1={barY}
                    x2={parentX < minChildX ? minChildX : maxChildX} y2={barY}
                    stroke="#9ca3af" strokeWidth={1.5}
                  />
                )}
              </g>
            );
          });
        })()}
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
