import { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PersonNode from './PersonNode';
import { ConnectorsSvg, GenerationLabels, GenerationDividers } from './TreeConnectors';
import AddRelationshipDialog from './AddRelationshipDialog';
import { buildLayout } from './layoutEngine';
import { graphApi } from '@/api/client';
import mockData from './mockData.json';
import PersonDetail from '@/features/person/PersonDetail';
import { Loader2 } from 'lucide-react';

const USE_MOCK = false;

const nodeTypes = { personNode: PersonNode };

function FamilyChartInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [connectors, setConnectors] = useState([]);
  const [generationRows, setGenerationRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [relDialog, setRelDialog] = useState({ open: false, person: null, type: null });

  // Callbacks passed into node data so PersonNode context menu can trigger them
  const nodeCallbacks = useCallback(() => ({
    onViewDetails: (person) => setSelectedPerson(person),
    onAddSpouse: (person) => setRelDialog({ open: true, person, type: 'marriage' }),
    onAddChild: (person) => setRelDialog({ open: true, person, type: 'parent_child' }),
  }), []);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      let persons, relationships;
      if (USE_MOCK) {
        persons = mockData.persons;
        relationships = mockData.relationships;
      } else {
        const result = await graphApi.getFullGraph();
        persons = result.data.persons;
        relationships = result.data.relationships;
      }
      const callbacks = nodeCallbacks();
      const layout = buildLayout(persons, relationships, callbacks);
      setNodes(layout.nodes);
      setEdges(layout.edges);
      setConnectors(layout.connectors);
      setGenerationRows(layout.generationRows);
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges, nodeCallbacks]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const onNodeClick = useCallback((_event, node) => {
    if (node.data?.person) {
      setSelectedPerson(node.data.person);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (nodes.length === 0) {
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
    <div className="h-[calc(100vh-3.5rem)] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnScroll
        zoomOnPinch
        preventScrolling
      >
        <GenerationDividers generationRows={generationRows} />
        <ConnectorsSvg connectors={connectors} />
        <GenerationLabels generationRows={generationRows} />
        <Background color="#e5e7eb" gap={20} size={1} />
        <Controls showInteractive={false} className="!bg-white !border !border-border !rounded-lg !shadow-sm" />
        <MiniMap
          nodeColor={(node) => {
            const gender = node.data?.person?.gender;
            if (gender === 'male') return 'var(--color-male)';
            if (gender === 'female') return 'var(--color-female)';
            return 'var(--color-other)';
          }}
          className="!bg-white !border !border-border !rounded-lg !shadow-sm"
          maskColor="rgba(0,0,0,0.08)"
        />
      </ReactFlow>

      {selectedPerson && (
        <PersonDetail person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}

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

export default function FamilyChart() {
  return (
    <ReactFlowProvider>
      <FamilyChartInner />
    </ReactFlowProvider>
  );
}
