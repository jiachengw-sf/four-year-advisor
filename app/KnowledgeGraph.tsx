"use client";

import { Background, Controls, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import type { SkillEdge, SkillNode, StudentSkill } from "@/lib/dashboard";

export function masteryColor(mastery: number | undefined) {
  if (mastery === undefined) return { bg: "#e4e4e7", border: "#a1a1aa", text: "#3f3f46" };
  if (mastery < 0.4) return { bg: "#fee2e2", border: "#ef4444", text: "#7f1d1d" };
  if (mastery < 0.7) return { bg: "#fef3c7", border: "#f59e0b", text: "#78350f" };
  return { bg: "#dcfce7", border: "#22c55e", text: "#14532d" };
}

// Layered layout: each node's column is its longest prerequisite chain.
function layout(nodes: SkillNode[], edges: SkillEdge[]) {
  const ids = new Set(nodes.map((n) => n.node_id));
  const parents = new Map<string, string[]>();
  for (const e of edges) {
    if (!ids.has(e.from_node) || !ids.has(e.to_node)) continue;
    parents.set(e.to_node, [...(parents.get(e.to_node) ?? []), e.from_node]);
  }
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0; // cycle guard
    visiting.add(id);
    const d = Math.max(-1, ...(parents.get(id) ?? []).map(depthOf)) + 1;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };
  const columns = new Map<number, SkillNode[]>();
  for (const n of [...nodes].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))) {
    const d = depthOf(n.node_id);
    columns.set(d, [...(columns.get(d) ?? []), n]);
  }
  const pos = new Map<string, { x: number; y: number }>();
  for (const [d, col] of columns) col.forEach((n, i) => pos.set(n.node_id, { x: d * 220, y: i * 70 }));
  return pos;
}

export function KnowledgeGraph({
  nodes,
  edges,
  skills,
}: {
  nodes: SkillNode[];
  edges: SkillEdge[];
  skills: StudentSkill[];
}) {
  const { flowNodes, flowEdges } = useMemo(() => {
    const mastery = new Map(skills.map((s) => [s.node_id, s.mastery]));
    const pos = layout(nodes, edges);
    const ids = new Set(nodes.map((n) => n.node_id));
    const flowNodes: Node[] = nodes.map((n) => {
      const m = mastery.get(n.node_id);
      const c = masteryColor(m);
      return {
        id: n.node_id,
        position: pos.get(n.node_id) ?? { x: 0, y: 0 },
        data: { label: m === undefined ? n.name : `${n.name} · ${Math.round(m * 100)}%` },
        style: {
          background: c.bg,
          border: `2px solid ${c.border}`,
          color: c.text,
          borderRadius: 8,
          fontSize: 12,
          width: 180,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        draggable: true,
      };
    });
    const flowEdges: Edge[] = edges
      .filter((e) => ids.has(e.from_node) && ids.has(e.to_node))
      .map((e) => ({ id: `${e.from_node}->${e.to_node}`, source: e.from_node, target: e.to_node }));
    return { flowNodes, flowEdges };
  }, [nodes, edges, skills]);

  if (nodes.length === 0) {
    return <p className="text-sm text-zinc-500">No skill catalog yet. Import seed/skills.csv in Admin.</p>;
  }

  return (
    <div className="h-[420px] rounded-md border border-zinc-200 bg-white dark:border-zinc-800">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ style: { stroke: "#a1a1aa" } }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
