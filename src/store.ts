import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Types ──

export interface WorkSession {
  id: string;
  date: string;
  startTime: number;
  endTime: number;
  duration: number;
  nodeId: string;
  techs: string[];
}

export interface Notification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  message: string;
  timestamp: number;
  read: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// ── Defaults ──

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 0.7 };

// ── Store ──

interface MOSOState {
  // Timer
  timerSeconds: number;
  timerRunning: boolean;
  lastTick: number;
  totalHours: number;

  // Sessions
  sessions: WorkSession[];

  // Graph
  viewport: Viewport;
  selectedNodeId: string | null;
  selectedTechId: string | null;
  collapsedNodes: string[];
  taskStates: Record<string, boolean>;

  // Notifications
  notifications: Notification[];

  // UI
  currentPage: string;
  breadcrumb: string[];
  sidePanelOpen: boolean;

  // Actions — timer
  tick: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  stopTimer: (nodeId?: string, techs?: string[]) => void;
  loadTimerDrift: () => void;

  // Actions — viewport
  setViewport: (v: Viewport) => void;
  resetViewport: () => void;

  // Actions — selection
  selectNode: (id: string | null) => void;
  selectTech: (id: string | null) => void;
  closePanels: () => void;

  // Actions — graph
  toggleCollapse: (id: string) => void;
  toggleTask: (nodeId: string, idx: number) => void;

  // Actions — notifications
  addNotification: (message: string, type?: Notification["type"]) => void;
  markAllRead: () => void;

  // Actions — navigation
  setPage: (page: string) => void;
  setBreadcrumb: (crumbs: string[]) => void;
}

export const useStore = create<MOSOState>()(
  persist(
    (set, get) => ({
      // ── Initial ──
      timerSeconds: 0,
      timerRunning: false,
      lastTick: 0,
      totalHours: 0,
      sessions: [],
      viewport: DEFAULT_VIEWPORT,
      selectedNodeId: null,
      selectedTechId: null,
      collapsedNodes: [],
      taskStates: {},
      notifications: [],
      currentPage: "dashboard",
      breadcrumb: ["MOSO Core"],
      sidePanelOpen: false,

      // ── Timer ──
      loadTimerDrift: () => {
        const s = get();
        if (s.timerRunning && s.lastTick > 0) {
          const elapsed = Math.floor((Date.now() - s.lastTick) / 1000);
          if (elapsed > 0) {
            set({ timerSeconds: s.timerSeconds + elapsed, lastTick: Date.now() });
          }
        }
      },

      tick: () => set((s) => ({ timerSeconds: s.timerSeconds + 1, lastTick: Date.now() })),

      startTimer: () => set({ timerRunning: true, timerSeconds: 0, lastTick: Date.now() }),

      pauseTimer: () => set({ timerRunning: false }),

      stopTimer: (nodeId, techs) => {
        const s = get();
        const dur = s.timerSeconds;
        if (dur <= 0) { set({ timerRunning: false }); return; }

        const session: WorkSession = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: new Date().toISOString().slice(0, 10),
          startTime: Date.now() - dur * 1000,
          endTime: Date.now(),
          duration: dur,
          nodeId: nodeId || s.selectedNodeId || "moso-core",
          techs: techs || [],
        };

        set((s) => ({
          timerRunning: false,
          timerSeconds: 0,
          lastTick: 0,
          sessions: [...s.sessions, session],
          totalHours: s.totalHours + dur / 3600,
        }));

        get().addNotification(`+${(dur / 3600).toFixed(1)}h session recorded`, "success");
      },

      // ── Viewport ──
      setViewport: (v) => set({ viewport: v }),
      resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

      // ── Selection ──
      selectNode: (id) => set({ selectedNodeId: id, selectedTechId: null, sidePanelOpen: id !== null }),
      selectTech: (id) => set({ selectedTechId: id, selectedNodeId: null, sidePanelOpen: id !== null }),
      closePanels: () => set({ selectedNodeId: null, selectedTechId: null, sidePanelOpen: false }),

      // ── Graph ──
      toggleCollapse: (id) => set((s) => ({
        collapsedNodes: s.collapsedNodes.includes(id)
          ? s.collapsedNodes.filter((n) => n !== id)
          : [...s.collapsedNodes, id],
      })),

      toggleTask: (nodeId, idx) => set((s) => {
        const key = `${nodeId}-${idx}`;
        const next = { ...s.taskStates, [key]: !s.taskStates[key] };
        if (next[key]) get().addNotification("Task completed", "success");
        return { taskStates: next };
      }),

      // ── Notifications ──
      addNotification: (message, type = "info") => {
        const n: Notification = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type, message, timestamp: Date.now(), read: false,
        };
        set((s) => ({ notifications: [n, ...s.notifications].slice(0, 200) }));
      },

      markAllRead: () => set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      })),

      // ── Navigation ──
      setPage: (page) => set({ currentPage: page }),
      setBreadcrumb: (crumbs) => set({ breadcrumb: crumbs }),
    }),
    {
      name: "moso-vos-state",
      partialize: (s) => ({
        timerSeconds: s.timerSeconds,
        timerRunning: s.timerRunning,
        lastTick: s.lastTick,
        totalHours: s.totalHours,
        sessions: s.sessions,
        viewport: s.viewport,
        collapsedNodes: s.collapsedNodes,
        taskStates: s.taskStates,
        notifications: s.notifications,
        currentPage: s.currentPage,
      }),
    }
  )
);

// ── Computed helpers (pure functions) ──

export function todayHours(sessions: WorkSession[], timerSec: number, timerRunning: boolean): number {
  const today = new Date().toISOString().slice(0, 10);
  const sessionHrs = sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.duration, 0) / 3600;
  return sessionHrs + (timerRunning ? timerSec / 3600 : 0);
}

export function weeklyHours(sessions: WorkSession[]): number {
  const cutoff = Date.now() - 7 * 86400000;
  return sessions.filter((s) => s.startTime >= cutoff).reduce((sum, s) => sum + s.duration, 0) / 3600;
}

export function monthlyHours(sessions: WorkSession[]): number {
  const cutoff = Date.now() - 30 * 86400000;
  return sessions.filter((s) => s.startTime >= cutoff).reduce((sum, s) => sum + s.duration, 0) / 3600;
}

export function calendarData(sessions: WorkSession[]): { date: string; hours: number }[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    map.set(s.date, (map.get(s.date) ?? 0) + s.duration / 3600);
  }
  const days: { date: string; hours: number }[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, hours: Math.round((map.get(dateStr) ?? 0) * 10) / 10 });
  }
  return days;
}

export function calendarColor(hours: number): string {
  if (hours <= 0) return "rgba(0,255,136,0.04)";
  if (hours < 1) return "rgba(0,255,136,0.15)";
  if (hours < 3) return "rgba(0,255,136,0.35)";
  if (hours < 5) return "rgba(0,255,136,0.6)";
  return "#00FF88";
}

export function recentCompleted(sessions: WorkSession[]): { text: string; time: string }[] {
  const items: { text: string; time: string }[] = [];
  for (let i = sessions.length - 1; i >= 0 && items.length < 8; i--) {
    const s = sessions[i];
    const mins = Math.floor((Date.now() - s.endTime) / 60000);
    const timeLabel = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
    items.push({ text: `${s.nodeId} session (${(s.duration / 3600).toFixed(1)}h)`, time: timeLabel });
  }
  return items;
}
