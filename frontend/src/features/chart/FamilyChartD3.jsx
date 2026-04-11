import { useRef, useState, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { graphApi } from '@/api/client';
import { buildLayout } from './layoutEngine';
import PersonDetail from '@/features/person/PersonDetail';
import AddRelationshipDialog from './AddRelationshipDialog';
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NODE_W = 180;
const NODE_H = 70;

const GENDER_COLORS = {
  male: { bg: '#eff6ff', border: '#4a90d9', text: '#4a90d9' },
  female: { bg: '#fdf2f8', border: '#e91e8c', text: '#e91e8c' },
  other: { bg: '#faf5ff', border: '#9b59b6', text: '#9b59b6' },
};

export default function FamilyChartD3() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [layoutData, setLayoutData] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [relDialog, setRelDialog] = useState({ open: false, person: null, type: null });

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const result = await graphApi.getFullGraph();
      const { persons, relationships } = result.data;
      const layout = buildLayout(persons, relationships);
      setLayoutData(layout);
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // D3 render
  useEffect(() => {
    if (!layoutData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    // Clear previous render
    g.selectAll('*').remove();

    const { nodes, connectors, generationRows } = layoutData;

    // === Generation dividers ===
    const dividerLayer = g.append('g').attr('class', 'dividers');
    for (let i = 0; i < generationRows.length - 1; i++) {
      const thisBottom = generationRows[i].y + NODE_H;
      const nextTop = generationRows[i + 1].y;
      const divY = thisBottom + (nextTop - thisBottom) / 2;

      dividerLayer.append('line')
        .attr('x1', generationRows[i].minX)
        .attr('y1', divY)
        .attr('x2', generationRows[i].maxX)
        .attr('y2', divY)
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '8 6');
    }

    // === Connectors layer ===
    const connLayer = g.append('g').attr('class', 'connectors');

    // Marriage lines
    connectors.filter(c => c.type === 'marriage').forEach(c => {
      const isDivorced = c.marriage_status === 'divorced';

      // Clickable hitbox
      connLayer.append('line')
        .attr('x1', c.x1).attr('y1', c.y1).attr('x2', c.x2).attr('y2', c.y2)
        .attr('stroke', 'transparent').attr('stroke-width', 14)
        .style('cursor', 'pointer')
        .on('click', () => handleMarriageClick(c));

      // Visible line
      connLayer.append('line')
        .attr('x1', c.x1).attr('y1', c.y1).attr('x2', c.x2).attr('y2', c.y2)
        .attr('stroke', isDivorced ? '#f87171' : '#fca5a5')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', isDivorced ? '6 4' : 'none')
        .style('pointer-events', 'none');
    });

    // Parent-child T-connectors (grouped by drop point)
    const pcConnectors = connectors.filter(c => c.type === 'parent-child');
    const groups = {};
    pcConnectors.forEach(c => {
      const key = `${c.parentX},${c.parentY}`;
      if (!groups[key]) groups[key] = { parentX: c.parentX, parentY: c.parentY, children: [] };
      groups[key].children.push({ x: c.childX, y: c.childY });
    });

    Object.values(groups).forEach(group => {
      const { parentX, parentY, children } = group;
      if (children.length === 0) return;
      const childY = children[0].y;
      const barY = parentY + (childY - parentY) / 2;
      const childXs = children.map(c => c.x);
      const minChildX = Math.min(...childXs);
      const maxChildX = Math.max(...childXs);

      // Vertical drop
      connLayer.append('line')
        .attr('x1', parentX).attr('y1', parentY).attr('x2', parentX).attr('y2', barY)
        .attr('stroke', '#9ca3af').attr('stroke-width', 1.5);

      // Horizontal bar
      if (children.length > 1) {
        connLayer.append('line')
          .attr('x1', minChildX).attr('y1', barY).attr('x2', maxChildX).attr('y2', barY)
          .attr('stroke', '#9ca3af').attr('stroke-width', 1.5);
      }

      // Vertical drops to children
      children.forEach(child => {
        connLayer.append('line')
          .attr('x1', child.x).attr('y1', barY).attr('x2', child.x).attr('y2', child.y)
          .attr('stroke', '#9ca3af').attr('stroke-width', 1.5);
      });

      // Connect offset parent to bar
      if (parentX < minChildX || parentX > maxChildX) {
        connLayer.append('line')
          .attr('x1', parentX).attr('y1', barY)
          .attr('x2', parentX < minChildX ? minChildX : maxChildX).attr('y2', barY)
          .attr('stroke', '#9ca3af').attr('stroke-width', 1.5);
      }
    });

    // === Person nodes ===
    const nodeLayer = g.append('g').attr('class', 'nodes');

    nodes.forEach(node => {
      const person = node.data.person;
      const isPending = node.data.isPending;
      const colors = GENDER_COLORS[person.gender] || GENDER_COLORS.other;
      const x = node.position.x;
      const y = node.position.y;
      const initials = ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase();
      const romanName = [person.first_name, person.last_name].filter(Boolean).join(' ');
      const devName = [person.first_name_devanagari, person.last_name_devanagari].filter(Boolean).join(' ');

      const nodeG = nodeLayer.append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .style('cursor', 'pointer')
        .style('opacity', isPending ? 0.5 : 1)
        .on('click', (event) => {
          event.stopPropagation();
          handleNodeClick(person);
        });

      // Card background
      nodeG.append('rect')
        .attr('width', NODE_W).attr('height', NODE_H)
        .attr('rx', 8).attr('ry', 8)
        .attr('fill', colors.bg)
        .attr('stroke', colors.border)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', isPending ? '6 4' : 'none');

      // Avatar circle
      nodeG.append('circle')
        .attr('cx', 28).attr('cy', NODE_H / 2)
        .attr('r', 16)
        .attr('fill', 'white')
        .attr('stroke', colors.border)
        .attr('stroke-width', 1);

      // Initials
      nodeG.append('text')
        .attr('x', 28).attr('y', NODE_H / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('fill', colors.text)
        .text(initials);

      // Name (Roman)
      nodeG.append('text')
        .attr('x', 52).attr('y', devName ? NODE_H / 2 - 4 : NODE_H / 2 + 4)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#1f2937')
        .text(romanName.length > 16 ? romanName.slice(0, 15) + '…' : romanName);

      // Name (Devanagari)
      if (devName) {
        nodeG.append('text')
          .attr('x', 52).attr('y', NODE_H / 2 + 10)
          .attr('font-size', '9px')
          .attr('fill', '#6b7280')
          .text(devName.length > 18 ? devName.slice(0, 17) + '…' : devName);
      }

      // Death years
      if (!person.is_alive) {
        const years = `${person.dob?.ad?.slice(0, 4) || '?'} – ${person.dod?.ad?.slice(0, 4) || '?'}`;
        nodeG.append('text')
          .attr('x', 52).attr('y', NODE_H / 2 + (devName ? 22 : 16))
          .attr('font-size', '8px')
          .attr('fill', '#9ca3af')
          .text(years);
      }

      // Hover effect
      nodeG.on('mouseenter', function () {
        d3.select(this).select('rect').attr('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))');
      }).on('mouseleave', function () {
        d3.select(this).select('rect').attr('filter', 'none');
      });
    });

    // === Zoom setup ===
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Fit to view
    fitToView();

  }, [layoutData]);

  const fitToView = () => {
    if (!svgRef.current || !layoutData || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    if (!container) return;

    const { nodes } = layoutData;
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + NODE_W);
      maxY = Math.max(maxY, n.position.y + NODE_H);
    });

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const scale = Math.min(containerW / (contentW + 100), containerH / (contentH + 100), 1.5) * 0.85;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const transform = d3.zoomIdentity
      .translate(containerW / 2, containerH / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    svg.transition().duration(300).call(zoomRef.current.transform, transform);
  };

  const zoomIn = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, 1.3);
  };

  const zoomOut = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, 0.7);
  };

  // Popover state for clicked node
  const [popover, setPopover] = useState(null);

  const handleNodeClick = (person) => {
    setPopover(popover?.id === person.id ? null : person);
  };

  const handleMarriageClick = async (c) => {
    const { relationshipApi } = await import('@/api/client');
    const action = c.marriage_status === 'divorced' ? 'restore' : 'divorce';
    const confirmed = confirm(`Mark this marriage as ${action === 'divorce' ? 'divorced' : 'active'}?`);
    if (!confirmed) return;
    try {
      await relationshipApi.update(c.marriage_id, {
        marriage_status: action === 'divorce' ? 'divorced' : 'active',
        comment: action === 'divorce' ? 'Marked as divorced' : 'Restored marriage',
      });
      loadGraph();
    } catch (err) {
      alert(err.detail || 'Failed to update');
    }
  };

  // Generation labels (fixed to left)
  const generationLabels = layoutData?.generationRows || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!layoutData || layoutData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No family members yet</p>
          <p className="text-sm">Go to Members tab to add the first person.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-[calc(100vh-3.5rem)] w-full relative overflow-hidden bg-[#fafafa]">
      <svg ref={svgRef} className="w-full h-full">
        <g ref={gRef} />
      </svg>

      {/* Generation labels — fixed left */}
      {generationLabels.map(({ generation, y }) => {
        // We need the current transform to position labels
        // For simplicity, render as absolute positioned divs that we'll update
        return null; // handled below
      })}

      {/* Popover action bar */}
      {popover && (() => {
        // Find the node position and apply current SVG transform
        const node = layoutData.nodes.find(n => n.data.person.id === popover.id);
        if (!node) return null;

        // Get current transform from the g element
        const gEl = gRef.current;
        const transform = gEl ? d3.zoomTransform(svgRef.current) : d3.zoomIdentity;
        const screenX = transform.applyX(node.position.x + NODE_W / 2);
        const screenY = transform.applyY(node.position.y + NODE_H);

        return (
          <div
            className="absolute z-50 bg-white border rounded-lg shadow-lg p-1 flex items-center gap-1"
            style={{ left: screenX, top: screenY + 8, transform: 'translateX(-50%)' }}
          >
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setSelectedPerson(popover); setPopover(null); }}>
              Details
            </Button>
            <div className="w-px h-5 bg-border" />
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setRelDialog({ open: true, person: popover, type: 'marriage' }); setPopover(null); }}>
              Spouse
            </Button>
            <div className="w-px h-5 bg-border" />
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setRelDialog({ open: true, person: popover, type: 'parent_child' }); setPopover(null); }}>
              Child
            </Button>
          </div>
        );
      })()}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 bg-white/90 backdrop-blur border rounded-lg p-1.5 shadow-lg">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn}><ZoomIn className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut}><ZoomOut className="h-4 w-4" /></Button>
        <div className="border-t my-0.5" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitToView}><Maximize2 className="h-4 w-4" /></Button>
      </div>

      {/* Close popover when clicking background */}
      {popover && (
        <div className="absolute inset-0 z-40" onClick={() => setPopover(null)} />
      )}

      {/* Detail sheet */}
      {selectedPerson && (
        <PersonDetail person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}

      {/* Add relationship dialog */}
      <AddRelationshipDialog
        open={relDialog.open}
        onClose={() => setRelDialog({ open: false, person: null, type: null })}
        person={relDialog.person}
        type={relDialog.type}
        onSuccess={loadGraph}
      />
    </div>
  );
}
