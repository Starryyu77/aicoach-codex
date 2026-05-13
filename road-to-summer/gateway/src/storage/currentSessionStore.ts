import type { CurrentSession, PlanCard } from "../hermes/types.ts";
import { ensureStateDirs, getStorePaths, readJson, writeJson } from "./fileStore.ts";

export async function getCurrentSession(stateRoot?: string): Promise<CurrentSession> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  return readJson<CurrentSession>(paths.sessionFile, {
    id: "local-session",
    phase: "preworkout",
    theme: "",
    goal: "",
    location: "公寓健身房",
    current_set: 1,
    events: []
  });
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

export async function startSession(partial: Partial<CurrentSession> = {}, stateRoot?: string): Promise<CurrentSession> {
  const session: CurrentSession = {
    id: partial.id || `session-${Date.now()}`,
    phase: "preworkout",
    theme: partial.theme || "",
    goal: partial.goal || "",
    location: partial.location || "公寓健身房",
    current_set: 1,
    events: []
  };
  return saveCurrentSession(session, stateRoot);
}

