import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./index.css";
import {
  TREE, TECHS, ALL_NODES, findNode, computeLayout,
  type TreeNode, type NodeKind, type NodeStatus,
} from "./graphData";
import {
  useStore, todayHours, weeklyHours, monthlyHours,
  calendarData, calendarColor, recentCompleted,
} from "./store";
import { useAuth } from "./lib/auth";
import { useSupabaseSync } from "./lib/sync";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type Page = "dashboard" | "network" | "technologies" | "github" | "settings" | "now";

interface GitHubOrg { login: string; name: string; avatar_url: string; description: string; public_repos: number; followers: number; created_at: string; html_url: string; }
interface GitHubRepo { full_name: string; description: string; stargazers_count: number; forks_count: number; open_issues_count: number; pushed_at: string; language: string; html_url: string; default_branch: string; }
interface GitHubUser { login: string; name: string; avatar_url: string; bio: string; public_repos: number; followers: number; following: number; created_at: string; html_url: string; }

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function fmtDur(s: number) {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

function fmtHrsMin(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

const STATUS_COLOR: Record<NodeStatus, string> = { completed: "#39FF14", "in-progress": "#00FF88", planned: "#FFC107", ready: "#00BFFF", blocked: "#FF4D4D" };
const STATUS_BG: Record<NodeStatus, string> = { completed: "rgba(57,255,20,0.12)", "in-progress": "rgba(0,255,136,0.12)", planned: "rgba(255,193,7,0.1)", ready: "rgba(0,191,255,0.1)", blocked: "rgba(255,77,77,0.1)" };
const STATUS_LABEL: Record<NodeStatus, string> = { completed: "Completed", "in-progress": "In Progress", planned: "Planned", ready: "Ready", blocked: "Blocked" };
const sc = (s: string) => STATUS_COLOR[s as NodeStatus] ?? "#FFC107";

function nodeRadius(kind: NodeKind): number {
  if (kind === "root") return 34;
  if (kind === "system") return 26;
  if (kind === "subsystem") return 20;
  if (kind === "database") return 17;
  if (kind === "decision") return 17;
  return 14;
}

function getBreadcrumb(nodeId: string): string[] {
  const crumbs = ["MOSO Core"];
  const node = findNode(nodeId);
  if (!node || node.id === "moso-core") return crumbs;
  let current: TreeNode | undefined = node;
  const chain: string[] = [];
  while (current && current.id !== "moso-core") {
    chain.unshift(current.label);
    current = current.parentId ? findNode(current.parentId) : undefined;
  }
  return [...crumbs, ...chain];
}

// ──────────────────────────────────────────────────────────────
// Icons
// ──────────────────────────────────────────────────────────────

const I = {
  Dash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Net: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>,
  Tech: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Git: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>,
  Set: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Play: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Pause: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  Stop: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Home: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Chevron: () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>,
  Book: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
};

// ──────────────────────────────────────────────────────────────
// Graph Canvas
// ──────────────────────────────────────────────────────────────

function GraphCanvas({ searchQuery, filterStatus, filterTech }: {
  searchQuery: string; filterStatus: string; filterTech: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const store = useStore();
  const { viewport, selectedNodeId, selectedTechId, collapsedNodes } = store;
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const layout = useMemo(() => computeLayout(TREE), []);

  const visibleNodes = useMemo(() => {
    const hidden = new Set<string>();
    for (const id of collapsedNodes) {
      const node = findNode(id);
      if (node) {
        const stack = [...node.children];
        while (stack.length) {
          const ch = stack.pop()!;
          hidden.add(ch.id);
          stack.push(...ch.children);
        }
      }
    }
    return hidden;
  }, [collapsedNodes]);

  const highlightedIds = useMemo(() => {
    const set = new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    for (const node of ALL_NODES) {
      if (visibleNodes.has(node.id)) continue;
      let match = true;
      if (q && !node.label.toLowerCase().includes(q) && !node.id.includes(q) && !node.desc.toLowerCase().includes(q)) match = false;
      if (filterStatus && node.status !== filterStatus) match = false;
      if (filterTech && !node.techs.includes(filterTech)) match = false;
      if (match) set.add(node.id);
    }
    return set;
  }, [searchQuery, filterStatus, filterTech, visibleNodes]);

  const techHighlight = useMemo(() => {
    if (!selectedTechId) return new Set<string>();
    const tech = TECHS.find((t) => t.id === selectedTechId);
    return tech ? new Set(tech.connectsTo) : new Set<string>();
  }, [selectedTechId]);

  const hoverConnections = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const set = new Set<string>([hoveredId]);
    const node = findNode(hoveredId);
    if (node) {
      if (node.parentId) set.add(node.parentId);
      for (const ch of node.children) set.add(ch.id);
    }
    for (const tech of TECHS) {
      if (tech.connectsTo.includes(hoveredId)) set.add(tech.id);
    }
    return set;
  }, [hoveredId]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const nextZoom = Math.max(0.08, Math.min(4, viewport.zoom * factor));
    const s = nextZoom / viewport.zoom;
    store.setViewport({
      x: mx - (mx - viewport.x) * s,
      y: my - (my - viewport.y) * s,
      zoom: nextZoom,
    });
  }, [viewport, store]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest(".graph-node-group")) return;
    setDragging(true);
    didDrag.current = false;
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ x: viewport.x, y: viewport.y });
  }, [viewport.x, viewport.y]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - dragStart.x) + Math.abs(e.clientY - dragStart.y) > 3) didDrag.current = true;
    store.setViewport({ ...viewport, x: panStart.x + (e.clientX - dragStart.x), y: panStart.y + (e.clientY - dragStart.y) });
  }, [dragging, dragStart, panStart, viewport, store]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as Element).closest(".graph-node-group")) return;
    const t = e.touches[0];
    setDragging(true);
    didDrag.current = false;
    setDragStart({ x: t.clientX, y: t.clientY });
    setPanStart({ x: viewport.x, y: viewport.y });
  }, [viewport.x, viewport.y]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - dragStart.x) + Math.abs(t.clientY - dragStart.y) > 3) didDrag.current = true;
    store.setViewport({ ...viewport, x: panStart.x + (t.clientX - dragStart.x), y: panStart.y + (t.clientY - dragStart.y) });
  }, [dragging, dragStart, panStart, viewport, store]);

  const fitView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const { bounds } = layout;
    const scaleX = (rect.width - 40) / bounds.width;
    const scaleY = (rect.height - 40) / bounds.height;
    const s = Math.min(scaleX, scaleY, 1.2);
    useStore.getState().setViewport({ x: (rect.width - bounds.width * s) / 2, y: 20, zoom: s });
  }, [layout]);

  const fitViewCalled = useRef(false);
  useEffect(() => {
    if (!fitViewCalled.current) {
      fitViewCalled.current = true;
      fitView();
    }
  }, [fitView]);

  const handleNodeClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (didDrag.current) return;
    const s = useStore.getState();
    const tech = TECHS.find((t) => t.id === id);
    if (tech) { s.selectTech(id); return; }
    s.selectNode(id);
    s.setBreadcrumb(getBreadcrumb(id));
  }, []);

  const r = (node: TreeNode, pos: { x: number; y: number }) => {
    const rad = nodeRadius(node.kind);
    const isActive = selectedNodeId === node.id || selectedTechId === node.id;
    const isHovered = hoveredId === node.id;
    const isTechHigh = techHighlight.has(node.id);
    const isSearchMatch = highlightedIds.size === 0 || highlightedIds.has(node.id);
    const dimmed = !isSearchMatch && highlightedIds.size > 0 && !isActive;
    const color = STATUS_COLOR[node.status];
    const glowFilter = (isActive || isHovered) ? "url(#glow)" : isTechHigh ? "url(#glow-bright)" : undefined;
    const hasKids = node.children.length > 0;
    const isCollapsed = collapsedNodes.includes(node.id);
    const opacity = dimmed ? 0.2 : 1;

    if (node.kind === "tech") {
      const tw = 80, th = 30;
      return (
        <g key={node.id} className="graph-node-group" opacity={opacity}
          onClick={(e) => handleNodeClick(node.id, e)}
          onMouseEnter={() => setHoveredId(node.id)} onMouseLeave={() => setHoveredId(null)}>
          <rect x={pos.x - tw / 2} y={pos.y - th / 2} width={tw} height={th} rx={7}
            fill={isActive ? "rgba(0,255,136,0.12)" : "rgba(8,16,10,0.92)"}
            stroke={isActive ? "#00FF88" : "rgba(0,255,136,0.2)"}
            strokeWidth={isActive ? 2 : 1} style={{ filter: glowFilter }} />
          <text x={pos.x} y={pos.y + 1} className="node-label" fontSize="9">{node.label}</text>
        </g>
      );
    }

    const c = 2 * Math.PI * rad;
    return (
      <g key={node.id} className="graph-node-group" opacity={opacity}
        onClick={(e) => handleNodeClick(node.id, e)}
        onMouseEnter={() => setHoveredId(node.id)} onMouseLeave={() => setHoveredId(null)}>
        <circle cx={pos.x} cy={pos.y} r={rad} fill="none" stroke="rgba(0,255,136,0.06)" strokeWidth={rad > 22 ? 3 : 2} />
        <circle cx={pos.x} cy={pos.y} r={rad} fill="none" stroke={color} strokeWidth={rad > 22 ? 3 : 2}
          strokeLinecap="round" strokeDasharray={`${c * node.completion / 100} ${c}`}
          transform={`rotate(-90 ${pos.x} ${pos.y})`} className="node-ring"
          style={{ filter: glowFilter }} />
        <circle cx={pos.x} cy={pos.y} r={rad - 4}
          fill={isActive ? STATUS_BG[node.status] : "rgba(8,16,10,0.92)"}
          stroke={isActive ? color : "transparent"} strokeWidth="1.5" />
        <text x={pos.x} y={pos.y + 1} className="node-label" dominantBaseline="middle"
          fontSize={rad > 28 ? 11 : rad > 22 ? 10 : 8}>{node.label}</text>
        <text x={pos.x} y={pos.y + rad + 13} className="node-sublabel">{node.completion}%</text>
        {hasKids && (
          <g onClick={(e) => { e.stopPropagation(); store.toggleCollapse(node.id); }} style={{ cursor: "pointer" }}>
            <circle cx={pos.x} cy={pos.y + rad + 24} r={7} fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1" />
            <text x={pos.x} y={pos.y + rad + 24} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fill="var(--text-dim)" style={{ pointerEvents: "none" }}>{isCollapsed ? "+" : "−"}</text>
          </g>
        )}
      </g>
    );
  };

  const techPositions = useMemo(() => {
    const startX = layout.bounds.width + 100;
    return TECHS.map((tech, i) => ({ tech, x: startX, y: 80 + i * 60 }));
  }, [layout]);

  return (
    <div className="graph-container">
      <svg ref={svgRef} viewBox="0 0 2000 1200"
        onWheel={handleWheel} onMouseDown={onMouseDown}
        onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-bright" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,255,136,0.03)" strokeWidth="0.5" />
          </pattern>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0,255,136,0.2)" />
          </marker>
        </defs>
        <rect width="2000" height="1200" fill="url(#grid)" />
        <g transform={`translate(${viewport.x},${viewport.y}) scale(${viewport.zoom})`}>
          {/* Edges */}
          {ALL_NODES.filter((n) => !visibleNodes.has(n.id)).map((node) => {
            const pos = layout.positions.get(node.id);
            if (!pos) return null;
            return node.children.map((child) => {
              const cp = layout.positions.get(child.id);
              if (!cp || visibleNodes.has(child.id)) return null;
              const hi = hoveredId === node.id || hoveredId === child.id || selectedNodeId === node.id || selectedNodeId === child.id;
              const dx = cp.x - pos.x, dy = cp.y - pos.y;
              return <path key={`${node.id}-${child.id}`}
                d={`M ${pos.x} ${pos.y} C ${pos.x} ${pos.y + dy * 0.4}, ${cp.x} ${cp.y - dy * 0.4}, ${cp.x} ${cp.y}`}
                fill="none" stroke={hi ? "rgba(0,255,136,0.4)" : "rgba(0,255,136,0.12)"}
                strokeWidth={hi ? 2 : 1.2} markerEnd={hi ? "url(#arrow)" : undefined}
                className={hi ? "edge-animated" : ""} />;
            });
          })}
          {/* Tech edges */}
          {techPositions.map(({ tech, x: tx, y: ty }) =>
            tech.connectsTo.map((nid) => {
              const pos = layout.positions.get(nid);
              if (!pos || visibleNodes.has(nid)) return null;
              const hi = selectedTechId === tech.id || hoveredId === tech.id;
              return <line key={`${tech.id}-${nid}`} x1={tx - 40} y1={ty} x2={pos.x} y2={pos.y}
                stroke={hi ? "rgba(0,255,136,0.35)" : "rgba(0,255,136,0.06)"}
                strokeWidth={hi ? 1.5 : 0.8} strokeDasharray={hi ? "4 3" : "2 4"}
                className={hi ? "edge-animated" : ""} />;
            })
          )}
          {/* Tech header */}
          {techPositions.length > 0 && <text x={techPositions[0].x} y={30} fontSize="11" fill="var(--text-dim)" fontFamily="inherit" textAnchor="middle" letterSpacing="0.15em">TECHNOLOGIES</text>}
          {/* Tree nodes */}
          {ALL_NODES.filter((n) => !visibleNodes.has(n.id) && n.kind !== "tech").map((n) => {
            const pos = layout.positions.get(n.id);
            return pos ? r(n, pos) : null;
          })}
          {/* Tech nodes */}
          {techPositions.map(({ tech, x, y }) =>
            r({ id: tech.id, label: tech.name, kind: "tech", status: "completed", completion: tech.completion, estHours: 0, workedHours: 0, priority: "medium", techs: [], desc: tech.purpose, deps: [], sourceFiles: [], githubFolder: "", tasks: [], docs: [], children: [] }, { x, y })
          )}
        </g>
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Activity Calendar Component
// ──────────────────────────────────────────────────────────────

function ActivityCalendar({ sessions }: { sessions: import("./store").WorkSession[] }) {
  const [selectedDay, setSelectedDay] = useState<{ date: string; hours: number } | null>(null);
  const data = useMemo(() => calendarData(sessions), [sessions]);
  const weeks: typeof data[] = useMemo(() => {
    const w: typeof data[] = [];
    let i = 0;
    while (i < data.length) {
      w.push(data.slice(i, i + 7));
      i += 7;
    }
    return w;
  }, [data]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="calendar-wrapper">
      <div className="calendar-months">
        {weeks.map((_, wi) => {
          const firstDay = data[wi * 7];
          if (!firstDay) return null;
          const d = new Date(firstDay.date);
          if (d.getDate() <= 7) return <span key={wi} className="cal-month">{months[d.getMonth()]}</span>;
          return <span key={wi} className="cal-month" />;
        })}
      </div>
      <div className="calendar-grid">
        <div className="cal-days">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => <span key={i} className="cal-day-label">{d}</span>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="cal-week">
            {week.map((day) => (
              <div key={day.date} className="cal-cell" style={{ background: calendarColor(day.hours) }}
                title={`${day.date}: ${day.hours}h`}
                onClick={() => setSelectedDay(selectedDay?.date === day.date ? null : day)} />
            ))}
          </div>
        ))}
      </div>
      {selectedDay && (
        <div className="calendar-detail">
          <div className="cal-detail-date">{new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
          <div className="cal-detail-hours">{selectedDay.hours}h worked</div>
          {sessions.filter((s) => s.date === selectedDay.date).map((s) => (
            <div key={s.id} className="cal-detail-session">
              <span>{findNode(s.nodeId)?.label ?? s.nodeId}</span>
              <span>{fmtHrsMin(s.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Notification Toast
// ──────────────────────────────────────────────────────────────

function Toasts() {
  const store = useStore();
  const unread = useMemo(() => store.notifications.filter((n) => !n.read).slice(0, 5), [store.notifications]);

  useEffect(() => {
    if (unread.length === 0) return;
    const t = setTimeout(() => store.markAllRead(), 4000);
    return () => clearTimeout(t);
  }, [unread.length, store]);

  if (unread.length === 0) return null;
  return (
    <div className="toast-container">
      {unread.map((n) => (
        <div key={n.id} className={`toast toast-${n.type}`}>
          <span className="toast-icon">{n.type === "success" ? "✔" : n.type === "warning" ? "⚠" : n.type === "error" ? "✖" : "ℹ"}</span>
          {n.message}
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Notification History Panel
// ──────────────────────────────────────────────────────────────

function NotificationHistory({ onClose }: { onClose: () => void }) {
  const notifications = useStore((s) => s.notifications);

  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof notifications }[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let currentLabel = "";
    for (const n of notifications) {
      const d = new Date(n.timestamp).toISOString().slice(0, 10);
      const label = d === today ? "Today" : d === yesterday ? "Yesterday" : fmtDate(d);
      if (label !== currentLabel) {
        groups.push({ label, items: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].items.push(n);
    }
    return groups;
  }, [notifications]);

  return (
    <div className="notification-history">
      <div className="panel-header"><h3>Notification History</h3><button className="btn btn-icon btn-ghost" onClick={onClose}><I.X /></button></div>
      <div className="notif-list">
        {grouped.map((g) => (
          <div key={g.label}>
            <div className="notif-date">{g.label}</div>
            {g.items.map((n) => (
              <div key={n.id} className="notif-item">
                <span className={`notif-dot notif-dot-${n.type}`} />
                <span className="notif-time">{new Date(n.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="notif-msg">{n.message}</span>
              </div>
            ))}
          </div>
        ))}
        {notifications.length === 0 && <div className="notif-empty">No notifications yet</div>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Login Prompt (modal — not a gate)
// ──────────────────────────────────────────────────────────────

function LoginPrompt({ onClose, signInWithGitHub, loading, user, isOwner, authError }: {
  onClose: () => void; signInWithGitHub: () => Promise<void>; loading: boolean; user: boolean; isOwner: boolean; authError: string | null;
}) {
  const loggedOut = !user;
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1001, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, maxWidth: 420, width: "90%", textAlign: "center" }}>
        {loggedOut ? (
          <>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 8, color: "var(--warning)" }}>Login Required</h2>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.6 }}>
              Sign in with your GitHub account to access the roadmap.
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 24, padding: "10px 14px", background: "rgba(255,193,7,0.08)", borderRadius: 8, border: "1px solid rgba(255,193,7,0.15)" }}>
              <strong style={{ color: "var(--green-primary)" }}>Project-MOSO-AI</strong> org owners can modify the roadmap. Everyone else can view.
            </div>
            <button className="btn btn-primary" onClick={signInWithGitHub} disabled={loading} style={{ width: "100%", padding: "12px 24px", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              {loading ? "Loading..." : "Sign in with GitHub"}
            </button>
            {authError && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,77,77,0.1)", borderRadius: 8, border: "1px solid rgba(255,77,77,0.2)", fontSize: "0.72rem", color: "#FF6B6B" }}>
                {authError}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 8, color: "var(--error)" }}>Owner Access Required</h2>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.6 }}>
              You're signed in but not a <strong style={{ color: "var(--green-primary)" }}>Project-MOSO-AI</strong> org member.
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 24, padding: "10px 14px", background: "rgba(255,77,77,0.08)", borderRadius: 8, border: "1px solid rgba(255,77,77,0.15)" }}>
              Only org owners can start timers, check tasks, and modify the roadmap.
            </div>
            <a className="btn btn-primary" href={`https://github.com/orgs/Project-MOSO-AI/invitations`} target="_blank" rel="noreferrer" style={{ width: "100%", padding: "12px 24px", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, textDecoration: "none" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              Join MOSO AI Org
            </a>
          </>
        )}
        <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 12, fontSize: "0.75rem" }}>Cancel</button>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Documentation / Now Page
// ──────────────────────────────────────────────────────────────

const DOCS_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "quick-start", label: "Quick Start" },
  { id: "features", label: "Features" },
  { id: "architecture", label: "Architecture" },
  { id: "trust", label: "Trust & Safety" },
  { id: "api", label: "API Reference" },
  { id: "extend", label: "Extending MOSO" },
  { id: "faq", label: "FAQ" },
] as const;

const FEATURE_CARDS = [
  { icon: "💬", title: "Conversational Chat + Memory", desc: "Talk to MOSO by typing or speaking. It remembers facts, preferences, and workflows across sessions — all stored locally.", color: "var(--green-primary)" },
  { icon: "🖥️", title: "Computer Use & Automation", desc: "Move the mouse, type, click, scroll, take screenshots, manage windows. Every command is decomposed into verified steps.", color: "#00BFFF" },
  { icon: "👁️", title: "Screen Vision (OCR)", desc: "MOSO reads your screen with OCR, classifies text into buttons/fields/links, and detects the active window.", color: "#FFC107" },
  { icon: "🤖", title: "Autonomous Agents", desc: "Multi-step goals broken into ordered task plans with dependencies, retries, and per-step verification.", color: "#FF6B6B" },
  { icon: "🎓", title: "Teach Mode", desc: "Perform a workflow once, and MOSO generalizes it into a reusable recipe with variables and trigger phrases.", color: "#C792EA" },
  { icon: "🎤", title: "Voice Interaction", desc: "Local transcription, pronoun resolution using desktop context, dual text+voice output.", color: "#82AAFF" },
  { icon: "📊", title: "System Intelligence", desc: "Ask about hardware, software, network, storage, or security in plain language.", color: "var(--green-accent)" },
  { icon: "🔒", title: "Risk & Privacy Engine", desc: "Every action is risk-scored before execution. High/Critical actions are blocked automatically.", color: "var(--error)" },
];

function NowPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = contentRef.current?.querySelector(`[data-docs-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="page-stack">
      {/* Hero */}
      <div className="now-hero">
        <div className="now-hero-glow" />
        <div className="now-hero-content">
          <div className="now-hero-badge">Documentation</div>
          <h1 className="now-hero-title">
            <span className="now-hero-line">MOSO AI</span>
            <span className="now-hero-line now-hero-accent">Documentation</span>
          </h1>
          <p className="now-hero-sub">
            Privacy-first, local-first AI assistant that runs entirely on your device.
            It sees your screen, remembers your context, and carries out multi-step tasks —
            without your data ever leaving the machine.
          </p>
          <div className="now-hero-actions">
            <button className="btn btn-primary now-hero-btn" onClick={() => scrollTo("quick-start")}>
              Get Started
            </button>
            <button className="btn btn-ghost now-hero-btn" onClick={() => scrollTo("features")}>
              Explore Features
            </button>
          </div>
        </div>
        <div className="now-hero-orb">
          <div className="now-orb-ring now-orb-ring-1" />
          <div className="now-orb-ring now-orb-ring-2" />
          <div className="now-orb-ring now-orb-ring-3" />
          <div className="now-orb-core" />
        </div>
      </div>

      <div className="now-layout">
        {/* Docs sidebar nav */}
        <nav className="now-sidebar">
          {DOCS_SECTIONS.map((s) => (
            <button key={s.id} className={`now-sidebar-btn${activeSection === s.id ? " active" : ""}`}
              onClick={() => scrollTo(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Docs content */}
        <div className="now-content" ref={contentRef}>

          {/* ── Overview ── */}
          <div className="now-section" data-docs-id="overview">
            <div className="now-section-eyebrow">Overview</div>
            <h2 className="now-section-title">What is MOSO?</h2>
            <div className="now-card">
              <p className="now-text">
                <strong style={{ color: "var(--green-primary)" }}>MOSO</strong> is a privacy-first, local-first AI assistant
                that runs entirely on your device. It reads your screen with OCR, understands what app you're in,
                remembers facts and preferences across sessions, and can plan and execute multi-step desktop tasks —
                all through natural conversation, by voice or text.
              </p>
              <div className="now-highlight-box">
                <div className="now-highlight-label">Key Differentiator</div>
                <p className="now-text">
                  Every action is risk-scored and permission-gated before it happens, and every action is logged.
                  Your data never leaves your machine.
                </p>
              </div>
            </div>
            <div className="now-quick-facts">
              {[
                ["Runtime", "100% local via llama.cpp (CPU) or ONNX Runtime (GPU/CPU)"],
                ["UI Framework", "PySide6 — the floating \"Aura\" orb + chat bubble"],
                ["Primary Language", "Python 3.12+"],
                ["Optional Backend", "FastAPI, Dockerized"],
                ["Test Suite", "249+ automated tests (python run.py test)"],
                ["Status", "Pre-1.0, active development (v0.3.0)"],
              ].map(([label, value]) => (
                <div key={label} className="now-fact">
                  <span className="now-fact-label">{label}</span>
                  <span className="now-fact-value">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Quick Start ── */}
          <div className="now-section" data-docs-id="quick-start">
            <div className="now-section-eyebrow">Getting Started</div>
            <h2 className="now-section-title">Quick Start</h2>
            <div className="now-steps">
              {[
                { step: 1, title: "Prerequisites", content: "Python 3.12+ must be installed on your system." },
                { step: 2, title: "Clone & Install", content: "Clone the repo, create a virtual environment, and install dependencies.", code: "git clone https://github.com/Project-MOSO-AI/MOSO.git\ncd MOSO\npython -m venv venv\nvenv\\Scripts\\activate        # Windows\npip install -r moso_core/requirements.txt" },
                { step: 3, title: "Get a Model", content: "Download a local GGUF model. Use a small ~2GB model for speed, or a larger ~7.5GB model for stronger reasoning." },
                { step: 4, title: "Run MOSO", content: "Launch the Aura desktop orb, run module demos, or execute the test suite.", code: "python run.py            # Launch Aura orb\npython run.py demo       # Run module demos\npython run.py test       # Run test suite (249+ tests)" },
                { step: 5, title: "First Launch", content: "The orb appears on your desktop. MOSO reports which modules are active: Memory, Tools, Agents, Vision, System Intelligence, Risk Engine, Realtime, Identity, LLM." },
              ].map(({ step, title, content, code }) => (
                <div key={step} className="now-step">
                  <div className="now-step-num">{step}</div>
                  <div className="now-step-body">
                    <div className="now-step-title">{title}</div>
                    <p className="now-text">{content}</p>
                    {code && <pre className="now-code"><code>{code}</code></pre>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Features ── */}
          <div className="now-section" data-docs-id="features">
            <div className="now-section-eyebrow">Capabilities</div>
            <h2 className="now-section-title">Features</h2>
            <div className="now-feature-grid">
              {FEATURE_CARDS.map((f, i) => (
                <div key={i} className={`now-feature-card${expandedFeature === i ? " expanded" : ""}`}
                  onClick={() => setExpandedFeature(expandedFeature === i ? null : i)}
                  style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="now-feature-icon" style={{ color: f.color }}>{f.icon}</div>
                  <div className="now-feature-title" style={{ color: f.color }}>{f.title}</div>
                  <p className="now-text">{f.desc}</p>
                  {expandedFeature === i && (
                    <div className="now-feature-detail">
                      <FeatureDetail index={i} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Architecture ── */}
          <div className="now-section" data-docs-id="architecture">
            <div className="now-section-eyebrow">Under the Hood</div>
            <h2 className="now-section-title">Architecture</h2>
            <div className="now-card">
              <h3 className="now-subtitle">The Core Loop</h3>
              <p className="now-text">Every task MOSO performs follows a seven-step loop:</p>
              <div className="now-loop">
                {["Observe", "Reason", "Act", "Verify", "Reflect", "Learn", "Improve"].map((step, i) => (
                  <div key={step} className="now-loop-step" style={{ animationDelay: `${i * 0.08}s` }}>
                    <span className="now-loop-num">{i + 1}</span>
                    <span className="now-loop-label">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="now-card" style={{ marginTop: 16 }}>
              <h3 className="now-subtitle">The Seven Organs</h3>
              <div className="now-organs-grid">
                {[
                  ["Brain", "Plans, reasons, reflects, decides", "Never touches hardware directly"],
                  ["Eyes", "Observes — screen OCR, UI/window detection, system state", "Never performs actions"],
                  ["Muscles", "Executes — mouse, keyboard, browser, shell, filesystem", "Never makes decisions"],
                  ["Memory", "Three stores — Experience, Skills, Knowledge — plus a vector index", "Never mixes the three stores"],
                  ["Learning", "Seven sub-engines: Experience, Reflection, Skill Builder, Generalization, Optimizer, Curriculum, Evaluation", "Never skips reflection before storing a skill"],
                  ["Safety", "Permissions, risk scoring, privacy checks, identity, confirmation", "Never lets an unscored action run"],
                  ["UI", "Aura orb, chat, voice, status — talks to the user", "Never talks directly to hardware"],
                ].map(([organ, does, never]) => (
                  <div key={organ} className="now-organ">
                    <div className="now-organ-name">{organ}</div>
                    <div className="now-organ-does">{does}</div>
                    <div className="now-organ-never">{never}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Trust & Safety ── */}
          <div className="now-section" data-docs-id="trust">
            <div className="now-section-eyebrow">Security</div>
            <h2 className="now-section-title">Trust & Safety</h2>
            <div className="now-trust-grid">
              {[
                { title: "Local by Default", desc: "Inference, memory, OCR, and audit logs all live on-device. No cloud round-trip required for MOSO to function.", icon: "🏠" },
                { title: "Risk-Scored Actions", desc: "Low (allowed), Medium (flagged), High (blocked), Critical (blocked). Scoring considers destination reputation, credential exposure, and system load.", icon: "⚖️" },
                { title: "Permission Tiers", desc: "Tools require guest, trusted, or owner identity level depending on sensitivity. Listing files is guest; deleting is owner.", icon: "🔑" },
                { title: "Full Audit Trail", desc: "Every tool call is written to a local JSON-lines audit log with timestamp, actor, action, target, and result.", icon: "📋" },
              ].map((item, i) => (
                <div key={i} className="now-trust-card" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="now-trust-icon">{item.icon}</div>
                  <div className="now-trust-title">{item.title}</div>
                  <p className="now-text">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="now-card" style={{ marginTop: 16 }}>
              <h3 className="now-subtitle">Owner Verification</h3>
              <p className="now-text">
                MOSO distinguishes "you" from a guest using five weighted signals:
              </p>
              <div className="now-verify-grid">
                {[
                  ["Voice Biometrics", "35%"],
                  ["Liveness / Anti-Spoofing", "20%"],
                  ["Behavioral Biometrics", "20%"],
                  ["Device Presence", "15%"],
                  ["Historical Patterns", "10%"],
                ].map(([signal, weight]) => (
                  <div key={signal} className="now-verify-item">
                    <div className="now-verify-weight">{weight}</div>
                    <div className="now-verify-label">{signal}</div>
                  </div>
                ))}
              </div>
              <div className="now-verify-levels">
                <span className="now-level owner">Owner ≥ 95</span>
                <span className="now-level likely">Likely Owner 80–94</span>
                <span className="now-level guest">Guest 60–79</span>
                <span className="now-level unknown">Unknown &lt; 60</span>
              </div>
            </div>
            <div className="now-card" style={{ marginTop: 16 }}>
              <h3 className="now-subtitle">Data Storage</h3>
              <div className="now-data-map">
                {[
                  ["memory.db", "Episodic / semantic / procedural / preference memory"],
                  ["plans.db", "Agent goals and tasks"],
                  ["vector_store.db", "Embeddings for hybrid search"],
                  ["realtime_cache.db", "Cached web research"],
                  ["knowledge_graph.db", "Entities / relationships / events"],
                  ["inventory.db", "System snapshots"],
                  ["tools-audit.log", "Full audit trail"],
                  ["aura_settings.json", "User preferences / config"],
                ].map(([file, desc]) => (
                  <div key={file} className="now-data-item">
                    <span className="now-data-file">{file}</span>
                    <span className="now-data-desc">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── API Reference ── */}
          <div className="now-section" data-docs-id="api">
            <div className="now-section-eyebrow">Advanced</div>
            <h2 className="now-section-title">API Reference</h2>
            <div className="now-card">
              <h3 className="now-subtitle">REST Endpoints</h3>
              <p className="now-text" style={{ marginBottom: 16 }}>
                MOSO can run headless behind a FastAPI REST API for self-hosting or programmatic access.
              </p>
              <div className="now-api-table">
                <div className="now-api-header">
                  <span>Endpoint</span><span>Method</span><span>Purpose</span>
                </div>
                {[
                  ["/health", "GET", "Health check + active modules"],
                  ["/chat", "POST", "Send a message, get a reply"],
                  ["/execute", "POST", "Run a specific tool action"],
                  ["/plan", "POST", "Create and execute a multi-step plan"],
                  ["/memory/store", "POST", "Store an episodic/semantic/procedural memory"],
                  ["/memory/search", "POST", "Search memory"],
                  ["/memory/recent", "GET", "Recent memory events"],
                  ["/memory/preferences", "GET", "Stored preferences"],
                  ["/skills", "GET", "Learned procedural skills"],
                  ["/system", "GET", "Live resource status"],
                  ["/identity", "GET", "Current identity/confidence/owner status"],
                ].map(([ep, method, purpose]) => (
                  <div key={ep} className="now-api-row">
                    <span className="now-api-ep">{ep}</span>
                    <span className={`now-api-method ${method.toLowerCase()}`}>{method}</span>
                    <span className="now-api-purpose">{purpose}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="now-card" style={{ marginTop: 16 }}>
              <h3 className="now-subtitle">Docker Deployment</h3>
              <pre className="now-code"><code>{`# Dev mode (hot-reload, verbose logs)
docker compose -f docker-compose.dev.yml up

# Production (built image, resource-limited, persistent volumes)
docker compose -f docker-compose.prod.yml up -d`}</code></pre>
            </div>
          </div>

          {/* ── Extending MOSO ── */}
          <div className="now-section" data-docs-id="extend">
            <div className="now-section-eyebrow">Developer</div>
            <h2 className="now-section-title">Extending MOSO</h2>
            <div className="now-card">
              <h3 className="now-subtitle">The Orchestrator Pattern</h3>
              <p className="now-text">
                One central object; every capability is opt-in via <code className="now-inline-code">enable_*()</code> calls.
              </p>
              <pre className="now-code"><code>{`from moso.orchestration.orchestrator import Orchestrator

orch = Orchestrator(model="local")
orch.enable_memory()
orch.enable_tools()
orch.enable_agents()
orch.enable_computer_use()
orch.enable_vision()
orch.enable_system_intelligence()
orch.enable_risk_engine()

response = orch.process("Open Spotify and play my liked songs")
print(response)`}</code></pre>
            </div>
            <div className="now-cards-row">
              <div className="now-card">
                <h3 className="now-subtitle">Adding a Tool</h3>
                <p className="now-text">
                  Subclass <code className="now-inline-code">Tool</code>, declare a permission level per action,
                  implement <code className="now-inline-code">execute()</code>, and register with the <code className="now-inline-code">ToolRegistry</code>.
                </p>
              </div>
              <div className="now-card">
                <h3 className="now-subtitle">Adding a Smart Controller</h3>
                <p className="now-text">
                  Per-app intelligence (like the built-in Spotify/Chrome/Explorer controllers) —
                  perception-aware handlers keyed by app name.
                </p>
              </div>
            </div>
            <div className="now-card" style={{ marginTop: 16 }}>
              <h3 className="now-subtitle">Memory API</h3>
              <pre className="now-code"><code>{`orch.memory.store_event("User opened Chrome")
orch.memory.store_fact("User prefers dark mode")
orch.memory.store_procedure("morning_routine", steps=[...])
orch.memory.store_preference("theme", "dark")

memories = orch.memory.retrieve_memories("browser settings")
context  = orch.memory.build_context("What theme do I use?")`}</code></pre>
            </div>
            <div className="now-card" style={{ marginTop: 16 }}>
              <h3 className="now-subtitle">Swapping the LLM Provider</h3>
              <p className="now-text">
                The <code className="now-inline-code">LLMProvider</code> abstraction supports local (llama.cpp),
                OpenAI, Anthropic, Ollama, or a custom backend behind one interface.
              </p>
            </div>
          </div>

          {/* ── FAQ ── */}
          <div className="now-section" data-docs-id="faq">
            <div className="now-section-eyebrow">Help</div>
            <h2 className="now-section-title">FAQ</h2>
            <div className="now-faq-list">
              {[
                { q: "Does my data leave my device?", a: "No. Inference, memory, OCR, and audit logs all live on-device. The only feature that reaches the internet is real-time web research, which is clearly marked when used." },
                { q: "Why isn't my microphone detected?", a: "MOSO requires a connected microphone for voice mode. If none is found, it automatically falls back to text input. Check your OS sound settings and ensure the mic is enabled." },
                { q: "Why did MOSO block an action?", a: "Actions scoring HIGH or CRITICAL on the risk engine are blocked automatically. This protects against credential exposure, sensitive file paths, or untrusted destinations. Check the audit log for details." },
                { q: "How do I add a model?", a: "Download a GGUF model file and point MOSO at it via settings, or use the built-in model manager: list, download, and remove models from the command line." },
                { q: "Can MOSO control any app, or only ones it knows about?", a: "MOSO has built-in smart controllers for common apps (Spotify, Chrome, Explorer). For other apps, it uses generic mouse/keyboard/screen capture to interact with any visible UI element." },
              ].map(({ q, a }, i) => (
                <div key={i} className="now-faq-item">
                  <div className="now-faq-q">{q}</div>
                  <p className="now-text">{a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function FeatureDetail({ index }: { index: number }) {
  const details: Record<number, React.ReactNode> = {
    0: (
      <>
        <div className="now-detail-title">Memory Types</div>
        <div className="now-detail-list">
          <span className="now-tag">Episodic</span>
          <span className="now-tag">Semantic</span>
          <span className="now-tag">Procedural</span>
          <span className="now-tag">Preferences</span>
        </div>
        <p className="now-text">Hybrid SQLite full-text + vector-embedding search retrieves the most relevant memories for every reply.</p>
        <pre className="now-code"><code>{`"What theme do I use?" → finds "user prefers dark mode"\n"MOSO remembers user prefers dark mode"`}</code></pre>
      </>
    ),
    1: (
      <>
        <div className="now-detail-title">Example Commands</div>
        <div className="now-detail-list">
          <span className="now-tag">"Open Spotify and play my liked songs"</span>
          <span className="now-tag">"Take a screenshot"</span>
          <span className="now-tag">"Open Notepad and type 1 to 10"</span>
        </div>
        <p className="now-text">Every command becomes a full chain: open → wait → find element → click → verify. Each step is screenshotted and OCR-verified before MOSO moves on.</p>
      </>
    ),
    2: (
      <>
        <div className="now-detail-title">OCR Pipeline</div>
        <p className="now-text">Tesseract OCR classifies visible text into buttons / text fields / links / labels. Detects active window, open windows, and dialogs.</p>
        <div className="now-detail-list">
          <span className="now-tag">"What's on my screen?"</span>
          <span className="now-tag">"What app am I using?"</span>
        </div>
      </>
    ),
    3: (
      <>
        <div className="now-detail-title">Agent Capabilities</div>
        <p className="now-text">Decomposes goals into ordered task plans with dependencies and automatic retries. Each step verified before the next runs.</p>
        <div className="now-detail-list">
          <span className="now-tag">Dry Run Preview</span>
          <span className="now-tag">7 Built-in Templates</span>
          <span className="now-tag">Per-step Verification</span>
        </div>
      </>
    ),
    4: (
      <>
        <div className="now-detail-title">Teach Flow</div>
        <div className="now-detail-steps">
          <span className="now-tag">1. Type /teach &lt;name&gt;</span>
          <span className="now-tag">2. Perform the task once</span>
          <span className="now-tag">3. Type /done</span>
          <span className="now-tag">4. MOSO generalizes into a recipe</span>
        </div>
        <p className="now-text">MOSO identifies fixed steps vs. variables (like contact names), writes verification conditions, and suggests natural-language trigger phrases.</p>
      </>
    ),
    5: (
      <>
        <div className="now-detail-title">Voice Pipeline</div>
        <p className="now-text">Local transcription via faster-whisper, pronoun resolution using desktop context ("pause it" → currently-playing media), ~500ms target latency. Every voice exchange is mirrored to the chat bubble.</p>
        <div className="now-detail-list">
          <span className="now-tag">Space = Push-to-Talk</span>
          <span className="now-tag">Local STT</span>
          <span className="now-tag">edge-tts</span>
        </div>
      </>
    ),
    6: (
      <>
        <div className="now-detail-title">System Introspection</div>
        <p className="now-text">Ask in plain language: "what's my RAM", "am I safe", "what's using my disk". Full diagnostics pass with severity-ranked suggestions. Timestamped inventory snapshots you can diff later.</p>
      </>
    ),
    7: (
      <>
        <div className="now-detail-title">Risk Levels</div>
        <div className="now-detail-steps">
          <span className="now-tag" style={{ color: "var(--green-primary)" }}>LOW — Allowed silently</span>
          <span className="now-tag" style={{ color: "var(--warning)" }}>MEDIUM — Allowed with warning</span>
          <span className="now-tag" style={{ color: "var(--error)" }}>HIGH — Blocked</span>
          <span className="now-tag" style={{ color: "var(--error)" }}>CRITICAL — Blocked</span>
        </div>
        <p className="now-text">Scoring considers destination reputation, file-path sensitivity, credential exposure, required permission level, and current system load.</p>
      </>
    ),
  };
  return <>{details[index] ?? <p className="now-text">Details coming soon.</p>}</>;
}

// ──────────────────────────────────────────────────────────────
// App
// ──────────────────────────────────────────────────────────────

export default function App() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--bg-main)", color: "var(--green-primary)" }}>Loading...</div>;
  }

  return <AppInner />;
}

function AppInner() {
  const { user, isOwner, signInWithGitHub, signOut, authError } = useAuth();
  const meta = user?.user_metadata;
  const userName: string = meta?.full_name ?? meta?.name ?? meta?.login ?? "User";
  const userAvatar: string | null = meta?.avatar_url ?? null;
  const userLogin: string | null = meta?.login ?? meta?.user_name ?? null;
  useSupabaseSync();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showNotifHistory, setShowNotifHistory] = useState(false);
  const requestLogin = useCallback(() => { if (!user || !isOwner) setShowLoginPrompt(true); }, [user, isOwner]);

  const store = useStore();
  const { currentPage, timerSeconds, timerRunning, sessions, taskStates, selectedNodeId, selectedTechId, notifications, breadcrumb, sidePanelOpen } = store;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTech, setFilterTech] = useState("");
  const [ghOrg, setGhOrg] = useState<GitHubOrg | null>(null);
  const [ghRepo, setGhRepo] = useState<GitHubRepo | null>(null);
  const [ghU1, setGhU1] = useState<GitHubUser | null>(null);
  const [ghU2, setGhU2] = useState<GitHubUser | null>(null);
  const [ghStatus, setGhStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // ── Timer ──
  useEffect(() => { store.loadTimerDrift(); }, []);
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => store.tick(), 1000);
    return () => clearInterval(id);
  }, [timerRunning, store]);

  // ── GitHub ──
  useEffect(() => {
    let alive = true;
    setGhStatus("loading");
    Promise.allSettled([
      fetch("https://api.github.com/orgs/Project-MOSO-AI").then((r) => r.ok ? r.json() : null),
      fetch("https://api.github.com/repos/Project-MOSO-AI/MOSO").then((r) => r.ok ? r.json() : null),
      fetch("https://api.github.com/users/Harsha240105").then((r) => r.ok ? r.json() : null),
      fetch("https://api.github.com/users/MdShaharali").then((r) => r.ok ? r.json() : null),
    ]).then(([o, r, u1, u2]) => {
      if (!alive) return;
      if (o.status === "fulfilled" && o.value) setGhOrg(o.value);
      if (r.status === "fulfilled" && r.value) setGhRepo(r.value);
      if (u1.status === "fulfilled" && u1.value) setGhU1(u1.value);
      if (u2.status === "fulfilled" && u2.value) setGhU2(u2.value);
      setGhStatus("ready");
    }).catch(() => { if (alive) setGhStatus("error"); });
    return () => { alive = false; };
  }, []);

  // ── Derived ──
  const selectedNode = useMemo(() => selectedNodeId ? findNode(selectedNodeId) ?? null : null, [selectedNodeId]);
  const selectedTech = useMemo(() => selectedTechId ? TECHS.find((t) => t.id === selectedTechId) ?? null : null, [selectedTechId]);
  const tHrs = todayHours(sessions, timerSeconds, timerRunning);
  const wHrs = weeklyHours(sessions);
  const mHrs = monthlyHours(sessions);
  const overallCompletion = useMemo(() => {
    const nodes = ALL_NODES.filter((n) => n.kind !== "tech");
    return Math.round(nodes.reduce((s, n) => s + n.completion, 0) / nodes.length);
  }, []);
  const recentDone = useMemo(() => recentCompleted(sessions), [sessions]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const toggleTask = useCallback((nodeId: string, idx: number) => { if (!user || !isOwner) { requestLogin(); return; } useStore.getState().toggleTask(nodeId, idx); }, [user, isOwner, requestLogin]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>MOSO</h1>
          <div className="subtitle">Visual Operating System</div>
        </div>
        <div className="sidebar-section-label">Navigation</div>
        <nav className="nav-list">
          {([["dashboard", "Dashboard", I.Dash], ["network", "Neural Network", I.Net], ["now", "Documentation", I.Book], ["technologies", "Technologies", I.Tech], ["github", "GitHub", I.Git], ["settings", "Settings", I.Set]] as const).map(([id, label, Icon]) => (
            <button key={id} className={`nav-button${currentPage === id ? " active" : ""}`} onClick={() => store.setPage(id)}>
              <Icon />{label}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <button className="nav-button" onClick={() => setShowNotifHistory(!showNotifHistory)} style={{ position: "relative" }}>
          <I.Bell />Notifications {unreadCount > 0 && <span className="node-count" style={{ marginLeft: "auto" }}>{unreadCount}</span>}
        </button>
        <div className="sidebar-section-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`timer-status-dot${timerRunning ? " running" : " stopped"}`} />
          {timerRunning ? "Session active" : "Session paused"}
        </div>
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              {userAvatar && <img src={userAvatar} alt={userName} style={{ width: 28, height: 28, borderRadius: "50%" }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
                <div style={{ fontSize: "0.6rem", color: isOwner ? "var(--green-primary)" : "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{isOwner ? "owner" : "viewer"}</div>
              </div>
              <button className="btn btn-ghost" onClick={signOut} title="Sign out" style={{ padding: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowLoginPrompt(true)} style={{ width: "100%", fontSize: "0.75rem", padding: "8px 12px" }}>Sign in with GitHub</button>
          )}
        </div>
      </aside>

      <main className="content">
        <Toasts />

        {authError && (
          <div style={{ background: "rgba(255,77,77,0.15)", border: "1px solid rgba(255,77,77,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: "0.78rem", color: "#FF6B6B", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.1rem" }}>&#9888;</span>
            <span><strong>Auth Error:</strong> {authError}</span>
            <button className="btn btn-ghost" onClick={() => window.location.reload()} style={{ marginLeft: "auto", fontSize: "0.7rem", padding: "4px 10px" }}>Retry</button>
          </div>
        )}

        {/* Profile Bar */}
        <div className="profile-bar">
          {user ? (
            <div className="profile-bar-inner">
              {userAvatar && <img src={userAvatar} alt={userName} className="profile-bar-avatar" />}
              <span className="profile-bar-name">{userName}</span>
              <span className={`profile-bar-role ${isOwner ? "owner" : "viewer"}`}>{isOwner ? "owner" : "viewer"}</span>
              <button className="btn btn-ghost" onClick={signOut} style={{ marginLeft: 8, fontSize: "0.65rem", padding: "4px 10px" }}>Sign out</button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowLoginPrompt(true)} style={{ fontSize: "0.72rem", padding: "6px 16px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              Sign in with GitHub
            </button>
          )}
        </div>

        {/* ═══ Dashboard ═══ */}
        {currentPage === "dashboard" && (
          <section className="page-stack">
            <div className="page-header"><div className="eyebrow">Mission Control</div><h2>Dashboard</h2></div>

            {/* Timer */}
            <div className="panel">
              <div className="timer-panel">
                <div className="timer-left">
                  <div>
                    <div className="timer-label">Session Timer</div>
                    <div className={`timer-display${timerRunning ? "" : (timerSeconds > 0 ? " paused" : "")}`}>{fmtDur(timerSeconds)}</div>
                  </div>
                </div>
                <div className="timer-actions">
                  {!timerRunning ? (
                    <button className="btn btn-primary" onClick={() => { if (!user || !isOwner) { if (!user) { requestLogin(); } else { store.addNotification("Timer is owner-only", "warning"); } return; } store.startTimer(); }} title={!user ? "Login to use" : !isOwner ? "Owners only" : ""}><I.Play /> {timerSeconds > 0 ? "Resume" : "Start"}</button>
                  ) : (
                    <button className="btn btn-warning" onClick={() => { if (!user || !isOwner) { if (!user) { requestLogin(); } else { store.addNotification("Timer is owner-only", "warning"); } return; } store.pauseTimer(); }} title={!user ? "Login to use" : !isOwner ? "Owners only" : ""}><I.Pause /> Pause</button>
                  )}
                  <button className="btn btn-danger" onClick={() => { if (!user || !isOwner) { if (!user) { requestLogin(); } else { store.addNotification("Timer is owner-only", "warning"); } return; } store.stopTimer(); }} title={!user ? "Login to use" : !isOwner ? "Owners only" : ""}><I.Stop /> Stop</button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              {([
                ["Today's Hours", fmtHrsMin(tHrs * 3600), true],
                ["Total Hours", `${(store.totalHours + tHrs).toFixed(1)}h`, false],
                ["Weekly Hours", `${wHrs.toFixed(1)}h`, false],
                ["Monthly Hours", `${mHrs.toFixed(1)}h`, false],
                ["Current Node", selectedNode?.label ?? "MOSO Core", false],
                ["Current Tech", selectedNode?.techs?.[0] ?? "Python", false],
                ["Active Session", timerRunning ? "Running" : (timerSeconds > 0 ? "Paused" : "None"), timerRunning],
                ["Sprint", "Sprint 3", false],
              ] as [string, string, boolean][]).map(([label, value, hl]) => (
                <div key={label} className="stat-card"><span className="stat-label">{label}</span><span className={`stat-value${hl ? " highlight" : ""}`}>{value}</span></div>
              ))}
            </div>

            {/* Activity Calendar */}
            <div className="panel">
              <div className="panel-header"><h3>Activity Calendar</h3></div>
              <ActivityCalendar sessions={sessions} />
            </div>

            <div className="two-col">
              {/* Completion */}
              <div className="panel">
                <div className="panel-header"><h3>Overall Completion</h3><span className="stat-value highlight">{overallCompletion}%</span></div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${overallCompletion}%` }} /></div>
                <div style={{ marginTop: 16 }}>
                  <div className="panel-header"><h3>Recently Completed</h3></div>
                  {recentDone.length > 0 ? (
                    <div className="dep-list">
                      {recentDone.map((item, i) => (
                        <div key={i} className="dep-item"><span style={{ color: "var(--green-primary)" }}>✔</span> {item.text} <span style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: "0.65rem" }}>{item.time}</span></div>
                      ))}
                    </div>
                  ) : <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>No sessions yet. Start the timer to begin tracking.</div>}
                </div>
              </div>

              {/* Notifications */}
              <div className="panel">
                <div className="panel-header"><h3>Recent Notifications</h3><button className="btn btn-ghost" onClick={() => setShowNotifHistory(true)} style={{ fontSize: "0.65rem" }}>View All</button></div>
                <div className="notif-list">
                  {notifications.slice(0, 8).map((n) => (
                    <div key={n.id} className="notif-item">
                      <span className={`notif-dot notif-dot-${n.type}`} />
                      <span className="notif-time">{new Date(n.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="notif-msg">{n.message}</span>
                    </div>
                  ))}
                  {notifications.length === 0 && <div className="notif-empty">No notifications yet</div>}
                </div>
              </div>
            </div>

            {/* Subsystem Overview */}
            <div className="panel">
              <div className="panel-header"><h3>Subsystem Overview</h3></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                {ALL_NODES.filter((n) => n.kind === "system").map((n) => (
                  <div key={n.id} className="stat-card" style={{ cursor: "pointer" }}
                    onClick={() => { store.selectNode(n.id); store.setPage("network"); store.setBreadcrumb(getBreadcrumb(n.id)); }}>
                    <span className="stat-label">{n.label}</span>
                    <div className="progress-track" style={{ height: 4 }}><div className="progress-fill" style={{ width: `${n.completion}%` }} /></div>
                    <span style={{ fontSize: "0.65rem", color: sc(n.status), fontWeight: 600 }}>{n.completion}%</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ Neural Network ═══ */}
        {currentPage === "network" && (
          <section className="page-stack">
            <div className="page-header"><div className="eyebrow">MOSO</div><h2>Neural Network</h2></div>

            {/* Breadcrumb */}
            <div className="breadcrumb">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="breadcrumb-item">
                  {i > 0 && <span className="breadcrumb-sep"><I.Chevron /></span>}
                  <span className="breadcrumb-text">{crumb}</span>
                </span>
              ))}
            </div>

            {/* Toolbar */}
            <div className="graph-toolbar">
              <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }}><I.Search /></span>
                <input className="graph-search" style={{ paddingLeft: 32 }} placeholder="Search nodes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <select className="graph-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In Progress</option>
                <option value="planned">Planned</option>
              </select>
              <select className="graph-filter" value={filterTech} onChange={(e) => setFilterTech(e.target.value)}>
                <option value="">All Tech</option>
                {TECHS.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <button className="btn btn-ghost" onClick={() => store.resetViewport()} title="Reset view"><I.Home /></button>
            </div>

            <GraphCanvas searchQuery={searchQuery} filterStatus={filterStatus} filterTech={filterTech} />
          </section>
        )}

        {/* ═══ Technologies ═══ */}
        {currentPage === "technologies" && (
          <section className="page-stack">
            <div className="page-header"><div className="eyebrow">Stack</div><h2>Technologies</h2></div>
            <div className="tech-grid">
              {TECHS.map((t) => (
                <div key={t.id} className="card tech-card" onClick={() => { store.selectTech(t.id); store.setBreadcrumb(["MOSO Core", t.name]); }}>
                  <div className="tech-name">{t.name}</div>
                  <div className="tech-purpose">{t.purpose}</div>
                  <div className="tech-nodes">
                    {t.whereUsed.slice(0, 4).map((nid) => <span key={nid} className="tech-node-tag">{findNode(nid)?.label ?? nid}</span>)}
                  </div>
                  <div className="progress-container" style={{ marginTop: 10 }}><div className="progress-track" style={{ height: 3 }}><div className="progress-fill" style={{ width: `${t.completion}%` }} /></div></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══ GitHub ═══ */}
        {currentPage === "github" && (
          <section className="page-stack">
            <div className="page-header"><div className="eyebrow">Live</div><h2>GitHub</h2></div>
            {ghStatus === "loading" && <div className="gh-loading">Fetching GitHub data...</div>}
            {ghStatus === "error" && <div className="gh-error">Failed to fetch GitHub data.</div>}

            {/* Org Card — full width */}
            <a className="card github-card gh-clickable gh-card-org" href={ghOrg?.html_url ?? "https://github.com/Project-MOSO-AI"} target="_blank" rel="noreferrer">
              <div className="gh-header">
                {ghOrg?.avatar_url && <img className="gh-avatar gh-avatar-lg" src={ghOrg.avatar_url} alt={ghOrg?.name ?? "Organization"} />}
                <div className="gh-info">
                  <div className="gh-name">{ghOrg?.name ?? "Project-MOSO-AI"}</div>
                  <div className="gh-type">Organization</div>
                </div>
              </div>
              {ghOrg?.description && <div className="gh-desc">{ghOrg.description}</div>}
              <div className="github-metrics github-metrics-4">
                <div className="gh-metric"><span className="gh-metric-label">Repos</span><span className="gh-metric-value">{ghOrg?.public_repos ?? "—"}</span></div>
                <div className="gh-metric"><span className="gh-metric-label">Followers</span><span className="gh-metric-value">{ghOrg?.followers ?? "—"}</span></div>
                <div className="gh-metric"><span className="gh-metric-label">Created</span><span className="gh-metric-value">{ghOrg ? fmtDate(ghOrg.created_at) : "—"}</span></div>
                <div className="gh-metric"><span className="gh-metric-label">Profile</span><span className="gh-metric-value" style={{ color: "var(--green-primary)" }}>Open ↗</span></div>
              </div>
            </a>

            <div className="github-grid">
              {/* Repo */}
              <a className="card github-card gh-clickable" href={ghRepo?.html_url ?? "https://github.com/Project-MOSO-AI/MOSO"} target="_blank" rel="noreferrer">
                <div className="gh-header"><div className="gh-info"><div className="gh-name">{ghRepo?.full_name ?? "Project-MOSO-AI/MOSO"}</div><div className="gh-type">Repository</div></div></div>
                {ghRepo?.description && <div className="gh-desc">{ghRepo.description}</div>}
                <div className="github-metrics github-metrics-3">
                  <div className="gh-metric"><span className="gh-metric-label">★ Stars</span><span className="gh-metric-value" style={{ color: "var(--warning)" }}>{ghRepo?.stargazers_count ?? "—"}</span></div>
                  <div className="gh-metric"><span className="gh-metric-label">Forks</span><span className="gh-metric-value">{ghRepo?.forks_count ?? "—"}</span></div>
                  <div className="gh-metric"><span className="gh-metric-label">Issues</span><span className="gh-metric-value">{ghRepo?.open_issues_count ?? "—"}</span></div>
                </div>
                <div className="github-metrics github-metrics-3">
                  <div className="gh-metric"><span className="gh-metric-label">Language</span><span className="gh-metric-value" style={{ color: "var(--green-primary)" }}>{ghRepo?.language ?? "—"}</span></div>
                  <div className="gh-metric"><span className="gh-metric-label">Branch</span><span className="gh-metric-value">{ghRepo?.default_branch ?? "—"}</span></div>
                  <div className="gh-metric"><span className="gh-metric-label">Last Push</span><span className="gh-metric-value">{ghRepo ? fmtDate(ghRepo.pushed_at) : "—"}</span></div>
                </div>
              </a>

              {/* User 1 */}
              <div className="card github-card">
                <a className="gh-clickable" href={ghU1?.html_url ?? "https://github.com/Harsha240105"} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="gh-header">
                    {ghU1?.avatar_url && <img className="gh-avatar" src={ghU1.avatar_url} alt={ghU1?.name ?? ghU1?.login ?? "User"} />}
                    <div className="gh-info">
                      <div className="gh-name">{ghU1?.name ?? ghU1?.login ?? "Harsha240105"}</div>
                      <div className="gh-type">Owner · Founder</div>
                    </div>
                  </div>
                  {ghU1?.bio && <div className="gh-desc">{ghU1.bio}</div>}
                  <div className="github-metrics github-metrics-4">
                    <div className="gh-metric"><span className="gh-metric-label">Repos</span><span className="gh-metric-value">{ghU1?.public_repos ?? "—"}</span></div>
                    <div className="gh-metric"><span className="gh-metric-label">Followers</span><span className="gh-metric-value">{ghU1?.followers ?? "—"}</span></div>
                    <div className="gh-metric"><span className="gh-metric-label">Following</span><span className="gh-metric-value">{ghU1?.following ?? "—"}</span></div>
                    <div className="gh-metric"><span className="gh-metric-label">Joined</span><span className="gh-metric-value">{ghU1 ? fmtDate(ghU1.created_at) : "—"}</span></div>
                  </div>
                </a>
                <a className="btn btn-primary gh-follow-btn" href={`https://github.com/follow/Harsha240105`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  Follow
                </a>
              </div>

              {/* User 2 */}
              <div className="card github-card">
                <a className="gh-clickable" href={ghU2?.html_url ?? "https://github.com/MdShaharali"} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="gh-header">
                    {ghU2?.avatar_url && <img className="gh-avatar" src={ghU2.avatar_url} alt={ghU2?.name ?? ghU2?.login ?? "User"} />}
                    <div className="gh-info">
                      <div className="gh-name">{ghU2?.name ?? ghU2?.login ?? "MdShaharali"}</div>
                      <div className="gh-type">Owner · Contributor</div>
                    </div>
                  </div>
                  {ghU2?.bio && <div className="gh-desc">{ghU2.bio}</div>}
                  <div className="github-metrics github-metrics-4">
                    <div className="gh-metric"><span className="gh-metric-label">Repos</span><span className="gh-metric-value">{ghU2?.public_repos ?? "—"}</span></div>
                    <div className="gh-metric"><span className="gh-metric-label">Followers</span><span className="gh-metric-value">{ghU2?.followers ?? "—"}</span></div>
                    <div className="gh-metric"><span className="gh-metric-label">Following</span><span className="gh-metric-value">{ghU2?.following ?? "—"}</span></div>
                    <div className="gh-metric"><span className="gh-metric-label">Joined</span><span className="gh-metric-value">{ghU2 ? fmtDate(ghU2.created_at) : "—"}</span></div>
                  </div>
                </a>
                <a className="btn btn-primary gh-follow-btn" href={`https://github.com/follow/MdShaharali`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  Follow
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ═══ Documentation / Now ═══ */}
        {currentPage === "now" && (
          <NowPage />
        )}

        {/* ═══ Settings ═══ */}
        {currentPage === "settings" && (
          <section className="page-stack">
            <div className="page-header"><div className="eyebrow">System</div><h2>Settings</h2></div>
            <div className="panel">
              <div className="panel-header"><h3>Persisted State</h3></div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                Sessions: {sessions.length} · Notifications: {notifications.length} · Tasks: {Object.keys(taskStates).length}
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-danger" onClick={() => { if (!user || !isOwner) { requestLogin(); return; } if (!confirm("This will erase all local data and reload. Continue?")) return; localStorage.clear(); location.reload(); }} title={!user ? "Login to use" : !isOwner ? "Owners only" : ""}>Clear All Data & Reload</button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ═══ Node Detail Side Panel ═══ */}
      {selectedNode && sidePanelOpen && (
        <>
          <div className="overlay" onClick={() => store.closePanels()} />
          <div className="side-panel">
            <div className="side-panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h3>{selectedNode.label}</h3>
                <span className={`status-pill ${selectedNode.status}`}>{STATUS_LABEL[selectedNode.status]}</span>
                <span className={`priority-badge ${selectedNode.priority}`}>{selectedNode.priority}</span>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => store.closePanels()}><I.X /></button>
            </div>
            <div className="side-panel-body">
              <div className="side-section"><h4>Metrics</h4>
                <div className="side-metrics">
                  <div className="side-metric"><span className="sm-label">Completion</span><span className="sm-value" style={{ color: sc(selectedNode.status) }}>{selectedNode.completion}%</span></div>
                  <div className="side-metric"><span className="sm-label">Worked</span><span className="sm-value">{selectedNode.workedHours}h</span></div>
                  <div className="side-metric"><span className="sm-label">Remaining</span><span className="sm-value">{selectedNode.estHours - selectedNode.workedHours}h</span></div>
                </div>
                <div className="progress-container" style={{ marginTop: 12 }}><div className="progress-track"><div className="progress-fill" style={{ width: `${selectedNode.completion}%` }} /></div></div>
              </div>
              {selectedNode.desc && <div className="side-section"><h4>Description</h4><div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{selectedNode.desc}</div></div>}
              {selectedNode.deps.length > 0 && <div className="side-section"><h4>Dependencies</h4><div className="dep-list">{selectedNode.deps.map((d) => { const dn = findNode(d); return <div key={d} className="dep-item" style={{ cursor: "pointer" }} onClick={() => dn && (store.selectNode(d), store.setBreadcrumb(getBreadcrumb(d)))}>{dn?.completion ? dn.completion >= 90 ? "✓" : "⏳" : "→"} {dn?.label ?? d}</div>; })}</div></div>}
              {selectedNode.techs.length > 0 && <div className="side-section"><h4>Technologies</h4><div className="tag-list">{selectedNode.techs.map((t) => <span key={t} className="tag" style={{ cursor: "pointer" }} onClick={() => { const td = TECHS.find((x) => x.name === t); if (td) { store.selectTech(td.id); store.setBreadcrumb(["MOSO Core", t]); } }}>{t}</span>)}</div></div>}
              {selectedNode.sourceFiles.length > 0 && <div className="side-section"><h4>Source Files</h4><div className="file-list">{selectedNode.sourceFiles.map((f) => <div key={f} className="file-item">{f}</div>)}</div></div>}
              {selectedNode.githubFolder && <div className="side-section"><h4>GitHub Folder</h4><div style={{ fontSize: "0.8rem", color: "var(--green-primary)", fontFamily: "monospace" }}>{selectedNode.githubFolder}</div></div>}
              {selectedNode.tasks.length > 0 && <div className="side-section"><h4>Tasks</h4><div className="task-list">{selectedNode.tasks.map((task, i) => { const done = taskStates[`${selectedNode.id}-${i}`] ?? task.done; return <div key={i} className={`task-item${done ? " done" : ""}${!isOwner ? " viewer" : ""}`} onClick={() => toggleTask(selectedNode.id, i)} style={!user ? { cursor: "pointer" } : {}}><div className="task-checkbox">{done ? "✓" : ""}</div><span className="task-label">{task.label}</span></div>; })}</div></div>}
              {selectedNode.children.length > 0 && <div className="side-section"><h4>Sub-Nodes ({selectedNode.children.length})</h4><div className="dep-list">{selectedNode.children.map((ch) => <div key={ch.id} className="dep-item" style={{ cursor: "pointer" }} onClick={() => { store.selectNode(ch.id); store.setBreadcrumb(getBreadcrumb(ch.id)); }}><span style={{ color: sc(ch.status) }}>{ch.completion}%</span> {ch.label}<span className={`status-pill ${ch.status}`} style={{ marginLeft: "auto", fontSize: "0.55rem", padding: "2px 8px" }}>{STATUS_LABEL[ch.status]}</span></div>)}</div></div>}
            </div>
          </div>
        </>
      )}

      {/* ═══ Tech Detail Side Panel ═══ */}
      {selectedTech && typeof selectedTech !== "string" && sidePanelOpen && (
        <>
          <div className="overlay" onClick={() => store.closePanels()} />
          <div className="side-panel">
            <div className="side-panel-header"><h3>{selectedTech.name}</h3><button className="btn btn-icon btn-ghost" onClick={() => store.closePanels()}><I.X /></button></div>
            <div className="side-panel-body">
              <div className="side-section"><h4>Purpose in MOSO</h4><div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{selectedTech.purpose}</div></div>
              <div className="side-section"><h4>Where It's Used</h4><div className="tag-list">{selectedTech.whereUsed.map((nid) => { const nd = findNode(nid); return <span key={nid} className="tag" style={{ cursor: "pointer" }} onClick={() => { store.selectNode(nid); store.setBreadcrumb(getBreadcrumb(nid)); }}>{nd?.label ?? nid}</span>; })}</div></div>
              <div className="side-section"><h4>Connected Nodes</h4><div className="dep-list">{selectedTech.connectsTo.map((nid) => { const nd = findNode(nid); return nd ? <div key={nid} className="dep-item" style={{ cursor: "pointer" }} onClick={() => { store.selectNode(nid); store.setBreadcrumb(getBreadcrumb(nid)); }}><span style={{ color: sc(nd.status) }}>{nd.completion}%</span> {nd.label}</div> : null; })}</div></div>
              <div className="side-section"><h4>Documentation</h4><div style={{ fontSize: "0.8rem" }}><a href={selectedTech.docsUrl} target="_blank" rel="noreferrer" style={{ color: "var(--green-primary)", textDecoration: "none" }}>{selectedTech.docsUrl}</a></div></div>
              <div className="side-section"><h4>GitHub</h4><div style={{ fontSize: "0.8rem" }}><a href={selectedTech.githubUrl} target="_blank" rel="noreferrer" style={{ color: "var(--green-primary)", textDecoration: "none" }}>{selectedTech.githubUrl}</a></div></div>
              <div className="side-section"><h4>Installation</h4><div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "monospace", padding: "10px 14px", background: "var(--bg-card)", borderRadius: 8 }}>{selectedTech.install}</div></div>
              <div className="side-section"><h4>Completion</h4><div className="progress-container"><div className="progress-header"><span className="progress-label">{selectedTech.completion}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${selectedTech.completion}%` }} /></div></div></div>
            </div>
          </div>
        </>
      )}

      {/* ═══ Notification History ═══ */}
      {showNotifHistory && (
        <>
          <div className="overlay" onClick={() => setShowNotifHistory(false)} />
          <div className="side-panel" style={{ width: 380 }}>
            <NotificationHistory onClose={() => setShowNotifHistory(false)} />
          </div>
        </>
      )}

      {showLoginPrompt && (
        <LoginPrompt onClose={() => setShowLoginPrompt(false)} signInWithGitHub={signInWithGitHub} loading={false} user={!!user} isOwner={isOwner} authError={authError} />
      )}
    </div>
  );
}
