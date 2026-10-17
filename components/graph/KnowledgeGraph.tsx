"use client";

import dagre from "@dagrejs/dagre";
import { Background, Controls, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo, useState } from "react";

export type GraphSkill = {
  node_id: string;
  name: string;
  category: string;
  mastery: number | null; // null: no data yet
  confidence: number | null;
  evidence: string[];
  est_hours: number;
};
export type GraphLink = { from_node: string; to_node: string };

const NODE_W = 180;
const NODE_H = 44;

export function masteryColor(mastery: number | null) {
  if (mastery === null) return { bg: "#e4e4e7", border: "#a1a1aa", text: "#3f3f46" };
  if (mastery < 0.4) return { bg: "#fee2e2", border: "#ef4444", text: "#7f1d1d" };
  if (mastery < 0.7) return { bg: "#fef3c7", border: "#f59e0b", text: "#78350f" };
  return { bg: "#dcfce7", border: "#22c55e", text: "#14532d" };
}

function layout(nodes: GraphSkill[], edges: GraphLink[]) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: 60 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.node_id, { width: NODE_W, height: NODE_H });
  for (const e of edges) g.setEdge(e.from_node, e.to_node);
  dagre.layout(g);
  // dagre gives centers; React Flow wants top-left corners.
  return new Map(nodes.map((n) => {
    const p = g.node(n.node_id);
    return [n.node_id, { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 }];
  }));
}

export function KnowledgeGraph({ nodes, edges }: { nodes: GraphSkill[]; edges: GraphLink[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { flowNodes, flowEdges } = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.node_id));
    const links = edges.filter((e) => ids.has(e.from_node) && ids.has(e.to_node));
    const pos = layout(nodes, links);
    const flowNodes: Node[] = nodes.map((n) => {
      const c = masteryColor(n.mastery);
      return {
        id: n.node_id,
        position: pos.get(n.node_id)!,
        data: { label: n.mastery === null ? n.name : `${n.name} · ${Math.round(n.mastery * 100)}%` },
        style: {
          background: c.bg,
          border: `2px solid ${c.border}`,
          color: c.text,
          borderRadius: 8,
          fontSize: 12,
          width: NODE_W,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
    const flowEdges: Edge[] = links.map((e) => ({
      id: `${e.from_node}->${e.to_node}`,
      source: e.from_node,
      target: e.to_node,
    }));
    return { flowNodes, flowEdges };
  }, [nodes, edges]);

  if (nodes.length === 0) {
    return <p className="text-sm text-zinc-500">No skill catalog yet. Import seed/skills.csv in Admin.</p>;
  }

  const selected = nodes.find((n) => n.node_id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <div className="h-[460px] flex-1 rounded-md border border-zinc-200 bg-white dark:border-zinc-800">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          nodesConnectable={false}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ style: { stroke: "#a1a1aa" } }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <aside className="w-full space-y-2 rounded-md border border-zinc-200 p-3 text-sm md:w-64 dark:border-zinc-800">
        {selected ? (
          <>
            <h3 className="font-semibold">{selected.name}</h3>
            <p className="text-zinc-500">{selected.category}</p>
            <p>
              Mastery:{" "}
              <strong>{selected.mastery === null ? "no data yet" : selected.mastery.toFixed(2)}</strong>
              {selected.confidence !== null && (
                <span className="text-zinc-500"> (confidence {selected.confidence.toFixed(2)})</span>
              )}
            </p>
            <p>
              Estimate: <strong>{selected.est_hours}h</strong>
            </p>
            <div>
              <p className="font-medium">Evidence</p>
              {selected.evidence.length ? (
                <ul className="list-disc space-y-1 pl-4 text-zinc-600 dark:text-zinc-400">
                  {selected.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-500">None yet. Check in on this skill to add some.</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-zinc-500">Click a skill to see its mastery and evidence.</p>
        )}
      </aside>
    </div>
  );
}
