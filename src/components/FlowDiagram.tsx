import { useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface FlowDiagramProps {
  nodes: Node[];
  edges: Edge[];
  title?: string;
  description?: string;
}

export const FlowDiagram = ({ nodes, edges, title, description }: FlowDiagramProps) => {
  const [nodesState, , onNodesChange] = useNodesState(nodes);
  const [edgesState, , onEdgesChange] = useEdgesState(edges);

  return (
    <div className="p-6 my-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg shadow-lg">
      {title && (
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>
      )}
      
      <div style={{ width: '100%', height: '500px' }} className="rounded-lg overflow-hidden border border-border bg-white dark:bg-gray-900">
        <ReactFlow
          nodes={nodesState}
          edges={edgesState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-left"
          className="react-flow-custom"
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'input': return '#10b981';
                case 'output': return '#ef4444';
                default: return '#8b5cf6';
              }
            }}
            className="!bg-gray-100 dark:!bg-gray-800"
          />
        </ReactFlow>
      </div>
      
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="px-2 py-1 bg-white/50 dark:bg-black/20 rounded">Interactive Diagram</span>
        <span>Drag to pan • Scroll to zoom</span>
      </div>
    </div>
  );
};
