import { rm } from "node:fs/promises";
import type { CurrentSession, PlanCard } from "../hermes/types.ts";
import { ensureStateDirs, getStorePaths, readJson, writeJson } from "./fileStore.ts";
import { buildTimeContext } from "../time/timeContext.ts";
import { replaceRelativeDateLabels } from "../time/absoluteDateText.ts";

function normalizePlanDateFields(plan?: PlanCard): PlanCard | undefined {
  if (!plan) return undefined;
  const targetDate = plan.target_date;
  const normalizeText = (value: string) => replaceRelativeDateLabels(value, targetDate);
  return {
    ...plan,
    date_label: undefined,
    risk_notes: Array.isArray(plan.risk_notes) ? plan.risk_notes.map(normalizeText) : plan.risk_notes,
    quality_warnings: Array.isArray(plan.quality_warnings) ? plan.quality_warnings.map(normalizeText) : plan.quality_warnings,
    decision_basis: Array.isArray(plan.decision_basis) ? plan.decision_basis.map(normalizeText) : plan.decision_basis,
    recent_training_summary: Array.isArray(plan.recent_training_summary) ? plan.recent_training_summary.map(normalizeText) : plan.recent_training_summary
  };
}

function normalizeSessionDateFields(session: CurrentSession, fallbackTargetDate: string): CurrentSession {
  const targetDate = session.target_date || session.session_date || fallbackTargetDate;
  return {
    ...session,
    target_date: targetDate,
    target_date_label: targetDate,
    plan_card: normalizePlanDateFields(session.plan_card)
  };
}

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
    chat_messages: [],
    events: []
  });
  return normalizeSessionDateFields({
    timezone: timeContext.timezone,
    session_date: timeContext.today,
    target_date: timeContext.target_date,
    target_date_label: timeContext.target_date_label,
    ...session,
    chat_messages: Array.isArray(session.chat_messages) ? session.chat_messages : []
  }, timeContext.target_date);
}

export async function saveCurrentSession(session: CurrentSession, stateRoot?: string): Promise<CurrentSession> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const normalized = normalizeSessionDateFields(session, session.target_date || session.session_date || buildTimeContext().target_date);
  await writeJson(paths.sessionFile, normalized);
  return normalized;
}

export async function saveCurrentPlan(plan: PlanCard, stateRoot?: string): Promise<PlanCard> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const normalized = normalizePlanDateFields(plan) || plan;
  await writeJson(paths.currentPlanFile, normalized);
  return normalized;
}

export async function clearCurrentPlan(stateRoot?: string): Promise<void> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  await rm(paths.currentPlanFile, { force: true });
}

export async function getCurrentPlan(stateRoot?: string): Promise<PlanCard | null> {
  const paths = getStorePaths(stateRoot);
  await ensureStateDirs(paths);
  const plan = await readJson<PlanCard | null>(paths.currentPlanFile, null);
  return normalizePlanDateFields(plan || undefined) || null;
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
    chat_messages: [],
    events: []
  };
  await clearCurrentPlan(stateRoot);
  return saveCurrentSession(session, stateRoot);
}

export async function resetSession(partial: Partial<CurrentSession> = {}, stateRoot?: string): Promise<CurrentSession> {
  return startSession(partial, stateRoot);
}
