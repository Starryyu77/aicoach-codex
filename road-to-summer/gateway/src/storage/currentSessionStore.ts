import type { CurrentSession, PlanCard } from "../hermes/types.ts";
import { ensureStateDirs, getStorePaths, readJson, writeJson } from "./fileStore.ts";
import { buildTimeContext } from "../time/timeContext.ts";

export async function getCurrentSession(stateRoot?: string): Promise<CurrentSession> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const timeContext = buildTimeContext();
  const session = await readJson<CurrentSession>(paths.sessionFile, {
    id: "local-session",
    created_at: timeContext.now_iso,
    started_at: timeContext.now_iso,
    timezone: timeContext.timezone,
    session_date: timeContext.today,
    target_date: timeContext.target_date,
    target_date_label: timeContext.target_date_label,
    phase: "preworkout",
    theme: "",
    goal: "",
    location: "公寓健身房",
    current_set: 1,
    events: [],
    recent_event_ids: []
  });
  return {
    timezone: timeContext.timezone,
    session_date: timeContext.today,
    target_date: timeContext.target_date,
    target_date_label: timeContext.target_date_label,
    ...session
  };
}

export async function saveCurrentSession(session: CurrentSession, stateRoot?: string): Promise<CurrentSession> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  await writeJson(paths.sessionFile, session);
  return session;
}

export async function saveCurrentPlan(plan: PlanCard, stateRoot?: string): Promise<PlanCard> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  await writeJson(paths.currentPlanFile, plan);
  return plan;
}

export async function getCurrentPlan(stateRoot?: string): Promise<PlanCard | null> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  return readJson<PlanCard | null>(paths.currentPlanFile, null);
}

export async function startSession(partial: Partial<CurrentSession> = {}, stateRoot?: string): Promise<CurrentSession> {
  const timeContext = buildTimeContext({
    timezone: partial.timezone,
    targetDate: partial.target_date || partial.session_date
  });
  const session: CurrentSession = {
    id: partial.id || `session-${Date.now()}`,
    created_at: timeContext.now_iso,
    started_at: timeContext.now_iso,
    updated_at: timeContext.now_iso,
    timezone: timeContext.timezone,
    session_date: timeContext.target_date,
    target_date: timeContext.target_date,
    target_date_label: timeContext.target_date_label,
    phase: "preworkout",
    theme: partial.theme || "",
    goal: partial.goal || "",
    location: partial.location || "公寓健身房",
    current_set: 1,
    events: [],
    recent_event_ids: []
  };
  return saveCurrentSession(session, stateRoot);
}
