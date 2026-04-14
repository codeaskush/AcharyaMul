import { useRef, useState, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { graphApi, relationshipApi } from '@/api/client';
import { buildHorizontalLayout } from './layoutHorizontal';
import PersonDetailWide from '@/features/person/PersonDetailWide';
import AddRelationshipDialog from './AddRelationshipDialog';
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [rawData, setRawData] = useState(null);
  const [expandedFamilies, setExpandedFamilies] = useState(new Set());
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [relDialog, setRelDialog] = useState({ open: false, person: null, type: null });
  const [popover, setPopover] = useState(null);
  const [zoomTransform, setZoomTransform] = useState({ x: 0, y: 0, k: 1 });

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const result = await graphApi.getFullGraph();
      setRawData(result.data);
    } catch (err) { console.error('Failed to load graph:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  const toggleFamily = useCallback((familyKey) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(familyKey)) next.delete(familyKey); else next.add(familyKey);
      return next;
    });
  }, []);

  const layoutData = rawData
    ? buildHorizontalLayout(rawData.persons, rawData.relationships, expandedFamilies)
    : null;

  // D3 render
  useEffect(() => {
    if (!layoutData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    g.selectAll('*').remove();

    const { nodes, connectors, expandButtons, NODE_W, NODE_H } = layoutData;

    const connLayer = g.append('g').attr('class', 'connectors');
    const parentLink = d3.linkHorizontal().x(d => d.x).y(d => d.y);

    // Marriage lines (vertical)
    connectors.filter(c => c.type === 'marriage').forEach(c => {
      const isDivorced = c.marriage_status === 'divorced';
      connLayer.append('line')
        .attr('x1', c.x1).attr('y1', c.y1).attr('x2', c.x2).attr('y2', c.y2)
        .attr('stroke', 'transparent').attr('stroke-width', 14)
        .style('cursor', 'pointer')
        .on('click', () => handleMarriageClick(c));
      connLayer.append('line')
        .attr('x1', c.x1).attr('y1', c.y1).attr('x2', c.x2).attr('y2', c.y2)
        .attr('stroke', isDivorced ? '#f87171' : '#fca5a5')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', isDivorced ? '6 4' : 'none')
        .style('pointer-events', 'none');
    });

    // Parent-child (horizontal bezier)
    connectors.filter(c => c.type === 'parent-child').forEach(c => {
      connLayer.append('path')
        .attr('d', parentLink({ source: { x: c.sourceX, y: c.sourceY }, target: { x: c.targetX, y: c.targetY } }))
        .attr('fill', 'none').attr('stroke', '#9ca3af').attr('stroke-width', 1.5);
    });

    // Person nodes
    const nodeLayer = g.append('g').attr('class', 'nodes');
    nodes.forEach(node => {
      const { person, x, y, isPending } = node;
      const colors = GENDER_COLORS[person.gender] || GENDER_COLORS.other;
      const initials = ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase();
      const romanName = [person.first_name, person.last_name].filter(Boolean).join(' ');
      const devName = [person.first_name_devanagari, person.last_name_devanagari].filter(Boolean).join(' ');

      const nodeG = nodeLayer.append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .style('cursor', 'pointer').style('opacity', isPending ? 0.5 : 1)
        .on('click', (event) => { event.stopPropagation(); handleNodeClick(person); });

      nodeG.append('rect').attr('width', NODE_W).attr('height', NODE_H).attr('rx', 8).attr('ry', 8)
        .attr('fill', colors.bg).attr('stroke', colors.border).attr('stroke-width', 2)
        .attr('stroke-dasharray', isPending ? '6 4' : 'none');

      nodeG.append('circle').attr('cx', 24).attr('cy', NODE_H / 2).attr('r', 14)
        .attr('fill', 'white').attr('stroke', colors.border).attr('stroke-width', 1);

      nodeG.append('text').attr('x', 24).attr('y', NODE_H / 2 + 4)
        .attr('text-anchor', 'middle').attr('font-size', '9px').attr('font-weight', '700').attr('fill', colors.text)
        .text(initials);

      nodeG.append('text').attr('x', 46).attr('y', devName ? NODE_H / 2 - 3 : NODE_H / 2 + 4)
        .attr('font-size', '11px').attr('font-weight', '600').attr('fill', '#1f2937')
        .text(romanName.length > 15 ? romanName.slice(0, 14) + '…' : romanName);

      if (devName) {
        nodeG.append('text').attr('x', 46).attr('y', NODE_H / 2 + 10)
          .attr('font-size', '8px').attr('fill', '#6b7280')
          .text(devName.length > 18 ? devName.slice(0, 17) + '…' : devName);
      }

      nodeG.on('mouseenter', function () { d3.select(this).select('rect').attr('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'); })
        .on('mouseleave', function () { d3.select(this).select('rect').attr('filter', 'none'); });
    });

    // Expand/Collapse buttons
    const btnLayer = g.append('g').attr('class', 'expand-buttons');
    expandButtons.forEach(btn => {
      const btnG = btnLayer.append('g')
        .attr('transform', `translate(${btn.x}, ${btn.y - 15})`)
        .style('cursor', 'pointer')
        .on('click', (event) => { event.stopPropagation(); toggleFamily(btn.familyKey); });

      btnG.append('rect').attr('width', 48).attr('height', 30).attr('rx', 15).attr('ry', 15)
        .attr('fill', btn.expanded ? '#f3f4f6' : '#3b82f6')
        .attr('stroke', btn.expanded ? '#d1d5db' : '#2563eb').attr('stroke-width', 1);

      btnG.append('text').attr('x', 15).attr('y', 20).attr('text-anchor', 'middle')
        .attr('font-size', '16px').attr('font-weight', '700')
        .attr('fill', btn.expanded ? '#6b7280' : 'white')
        .text(btn.expanded ? '−' : '+')
        .style('pointer-events', 'none');

      btnG.append('text').attr('x', 36).attr('y', 19).attr('text-anchor', 'middle')
        .attr('font-size', '11px').attr('font-weight', '600')
        .attr('fill', btn.expanded ? '#6b7280' : 'white')
        .text(btn.childCount)
        .style('pointer-events', 'none');

      btnG.on('mouseenter', function () { d3.select(this).select('rect').attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'); })
        .on('mouseleave', function () { d3.select(this).select('rect').attr('filter', 'none'); });
    });

    // Zoom — only initialize once, preserve existing transform on re-renders
    if (!zoomRef.current) {
      const zoom = d3.zoom().scaleExtent([0.1, 3])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
          setZoomTransform({ x: event.transform.x, y: event.transform.y, k: event.transform.k });
        });
      zoomRef.current = zoom;
      svg.call(zoom);
      fitToView();
    } else {
      // Re-apply existing zoom to new g content
      svg.call(zoomRef.current);
      const currentTransform = d3.zoomTransform(svgRef.current);
      g.attr('transform', currentTransform);
    }

  }, [layoutData, toggleFamily]);

  const fitToView = () => {
    if (!svgRef.current || !layoutData || !zoomRef.current || !containerRef.current) return;
    const { nodes, NODE_W: nw, NODE_H: nh } = layoutData;
    if (nodes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + nw); maxY = Math.max(maxY, n.y + nh); });
    const cw = containerRef.current.clientWidth, ch = containerRef.current.clientHeight;
    const scale = Math.min(cw / (maxX - minX + 120), ch / (maxY - minY + 120), 1.5) * 0.85;
    const transform = d3.zoomIdentity.translate(cw / 2, ch / 2).scale(scale).translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
    d3.select(svgRef.current).call(zoomRef.current.transform, transform);
  };

  const zoomIn = () => d3.select(svgRef.current).call(zoomRef.current.scaleBy, 1.3);
  const zoomOut = () => d3.select(svgRef.current).call(zoomRef.current.scaleBy, 0.7);
  const handleNodeClick = (person) => setPopover(popover?.id === person.id ? null : person);

  const handleMarriageClick = async (c) => {
    const action = c.marriage_status === 'divorced' ? 'restore' : 'divorce';
    if (!confirm(`Mark as ${action === 'divorce' ? 'divorced' : 'active'}?`)) return;
    try {
      await relationshipApi.update(c.marriage_id, { marriage_status: action === 'divorce' ? 'divorced' : 'active', comment: action === 'divorce' ? 'Marked as divorced' : 'Restored marriage' });
      loadGraph();
    } catch (err) { alert(err.detail || 'Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;
  if (!layoutData || layoutData.nodes.length === 0) return <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground"><p>No family members yet. Go to Members tab to add.</p></div>;

  const { NODE_W: nw, NODE_H: nh } = layoutData;

  return (
    <div ref={containerRef} className="h-[calc(100vh-3.5rem)] w-full relative overflow-hidden bg-[#fafafa]">
      <svg ref={svgRef} className="w-full h-full"><g ref={gRef} /></svg>

      {popover && (() => {
        const node = layoutData.nodes.find(n => n.person.id === popover.id);
        if (!node) return null;
        const sx = zoomTransform.x + (node.x + nw) * zoomTransform.k;
        const sy = zoomTransform.y + (node.y + nh / 2) * zoomTransform.k;
        return (
          <div className="absolute z-50 bg-white border rounded-lg shadow-lg p-1 flex flex-col gap-0.5" style={{ left: sx + 8, top: sy, transform: 'translateY(-50%)' }}>
            <Button variant="ghost" size="sm" className="h-7 justify-start text-xs" onClick={() => { setSelectedPerson(popover); setPopover(null); }}>Details</Button>
            <Button variant="ghost" size="sm" className="h-7 justify-start text-xs" onClick={() => { setRelDialog({ open: true, person: popover, type: 'marriage' }); setPopover(null); }}>+ Spouse</Button>
            <Button variant="ghost" size="sm" className="h-7 justify-start text-xs" onClick={() => { setRelDialog({ open: true, person: popover, type: 'parent_child' }); setPopover(null); }}>+ Child</Button>
          </div>
        );
      })()}
      {popover && <div className="absolute inset-0 z-40" onClick={() => setPopover(null)} />}

      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 bg-white/90 backdrop-blur border rounded-lg p-1.5 shadow-lg">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn}><ZoomIn className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut}><ZoomOut className="h-4 w-4" /></Button>
        <div className="border-t my-0.5" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitToView}><Maximize2 className="h-4 w-4" /></Button>
      </div>

      {selectedPerson && <PersonDetailWide person={selectedPerson} onClose={() => setSelectedPerson(null)} />}
      <AddRelationshipDialog open={relDialog.open} onClose={() => setRelDialog({ open: false, person: null, type: null })} person={relDialog.person} type={relDialog.type} onSuccess={loadGraph} />
    </div>
  );
}
