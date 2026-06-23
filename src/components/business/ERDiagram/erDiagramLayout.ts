import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";

const NODE_WIDTH = 220;
const NODE_HEADER_HEIGHT = 40;
const NODE_ROW_HEIGHT = 28;
const NODESEP = 80;
const RANKSEP = 100;

export function computeLayout(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: NODESEP, ranksep: RANKSEP });

  nodes.forEach((node) => {
    const columns = node.data?.columns;
    const columnCount = Array.isArray(columns) ? columns.length : 0;
    const height = NODE_HEADER_HEIGHT + columnCount * NODE_ROW_HEIGHT;
    g.setNode(node.id, { width: NODE_WIDTH, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - (pos.height || 100) / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}
