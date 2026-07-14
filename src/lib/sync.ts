import { useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { useStore, type WorkSession } from "../store";

let syncEnabled = false;

function enableSync() { syncEnabled = true; }

export function useSupabaseSync() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    loadFromSupabase();

    const channel = supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "work_sessions" }, (payload) => {
        if (!syncEnabled) return;
        handleSessionChange(payload);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, (payload) => {
        if (!syncEnabled) return;
        handleStateChange(payload);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const unsub = useStore.subscribe((state, prev) => {
      if (!syncEnabled) return;
      if (state.sessions !== prev.sessions) upsertSessions(state.sessions);
      if (state.taskStates !== prev.taskStates) upsertAppState("taskStates", state.taskStates);
      if (state.timerSeconds !== prev.timerSeconds || state.timerRunning !== prev.timerRunning) {
        upsertAppState("timer", { timerSeconds: state.timerSeconds, timerRunning: state.timerRunning, lastTick: state.lastTick });
      }
      if (state.totalHours !== prev.totalHours) upsertAppState("totalHours", state.totalHours);
      if (state.collapsedNodes !== prev.collapsedNodes) upsertAppState("collapsedNodes", state.collapsedNodes);
    });
    return unsub;
  }, []);
}

async function loadFromSupabase() {
  try {
    const [sessionsRes, stateRes] = await Promise.all([
      supabase.from("work_sessions").select("*").order("created_at", { ascending: true }),
      supabase.from("app_state").select("key, value"),
    ]);

    const store = useStore.getState();

    if (sessionsRes.data && sessionsRes.data.length > 0) {
      const sessions: WorkSession[] = sessionsRes.data.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        date: r.date as string,
        startTime: r.start_time as number,
        endTime: r.end_time as number,
        duration: r.duration as number,
        nodeId: r.node_id as string,
        techs: r.techs as string[],
      }));
      const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0) / 3600;
      useStore.setState({ sessions, totalHours });
    }

    if (stateRes.data) {
      const map = new Map(stateRes.data.map((r: Record<string, unknown>) => [r.key as string, r.value]));
      const patch: Record<string, unknown> = {};
      if (map.has("taskStates")) patch.taskStates = map.get("taskStates");
      if (map.has("collapsedNodes")) patch.collapsedNodes = map.get("collapsedNodes");
      if (map.has("totalHours")) patch.totalHours = map.get("totalHours");
      if (map.has("timer")) {
        const t = map.get("timer") as { timerSeconds: number; timerRunning: boolean; lastTick: number };
        patch.timerSeconds = t.timerSeconds;
        patch.timerRunning = false;
        patch.lastTick = t.lastTick;
      }
      useStore.setState(patch);
    }

    enableSync();
  } catch (e) {
    console.warn("Failed to load from Supabase:", e);
    enableSync();
  }
}

async function upsertSessions(sessions: WorkSession[]) {
  try {
    const rows = sessions.map((s) => ({
      id: s.id,
      user_id: null,
      date: s.date,
      start_time: s.startTime,
      end_time: s.endTime,
      duration: s.duration,
      node_id: s.nodeId,
      techs: s.techs,
    }));
    await supabase.from("work_sessions").upsert(rows, { onConflict: "id" });
  } catch (e) {
    console.warn("Failed to upsert sessions:", e);
  }
}

async function upsertAppState(key: string, value: unknown) {
  try {
    await supabase.from("app_state").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  } catch (e) {
    console.warn("Failed to upsert app state:", e);
  }
}

function handleSessionChange(payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) {
  if (payload.eventType === "INSERT" && payload.new) {
    const r = payload.new;
    const session: WorkSession = {
      id: r.id as string,
      date: r.date as string,
      startTime: r.start_time as number,
      endTime: r.end_time as number,
      duration: r.duration as number,
      nodeId: r.node_id as string,
      techs: r.techs as string[],
    };
    const store = useStore.getState();
    if (!store.sessions.find((s) => s.id === session.id)) {
      useStore.setState({ sessions: [...store.sessions, session], totalHours: store.totalHours + session.duration / 3600 });
    }
  } else if (payload.eventType === "DELETE" && payload.old) {
    const store = useStore.getState();
    useStore.setState({ sessions: store.sessions.filter((s) => s.id !== payload.old!.id) });
  }
}

function handleStateChange(payload: { new?: Record<string, unknown> }) {
  if (!payload.new) return;
  const key = payload.new.key as string;
  const value = payload.new.value;
  const patch: Record<string, unknown> = {};
  if (key === "taskStates") patch.taskStates = value;
  if (key === "collapsedNodes") patch.collapsedNodes = value;
  if (key === "totalHours") patch.totalHours = value;
  if (key === "timer") {
    const t = value as { timerSeconds: number; timerRunning: boolean; lastTick: number };
    patch.timerSeconds = t.timerSeconds;
    patch.timerRunning = false;
    patch.lastTick = t.lastTick;
  }
  if (Object.keys(patch).length > 0) useStore.setState(patch);
}
