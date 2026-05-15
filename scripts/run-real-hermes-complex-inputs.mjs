import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ProviderConfigStore } from "../road-to-summer/gateway/src/providers/ProviderConfigStore.ts";
import { ProviderRegistry } from "../road-to-summer/gateway/src/providers/ProviderRegistry.ts";
import { handleChat } from "../road-to-summer/gateway/src/routes/chat.ts";
import { handleGetCurrentSession, handleStartSession } from "../road-to-summer/gateway/src/routes/session.ts";

const REVIEW_CASES = [
  {
    id: "risk_vs_progression",
    setupPlan: "帮我安排今天胸部训练，疲劳4分，无疼痛。",
    input: "这个重量太轻了，但肩前侧有点顶，能不能加一点？",
    expected: "风险信号优先，不能直接加重量。"
  },
  {
    id: "equipment_and_target_muscle_feedback",
    setupPlan: "今天想练背，疲劳4分，无疼痛。",
    input: "高位下拉和绳索划船都有人了，我现在只有哑铃，而且刚才感觉不到背。",
    expected: "保留背部训练目标，替换成哑铃划船类动作，并给出背部发力 cue。"
  },
  {
    id: "backfill_plus_future_planning",
    input: "前天练了腿还没记录，明天想别再练腿，先帮我把前天保存。",
    expected: "先输出前天的 training_card，不直接生成明天训练计划。"
  },
  {
    id: "preference_contradiction",
    input: "我之前说不喜欢波比跳和高强度 HIIT，但其实现在挺喜欢的，之后可以安排。",
    expected: "输出 replace 型 memory_updates，而不是追加矛盾偏好。"
  },
  {
    id: "completed_sets_with_instability",
    setupPlan: "帮我安排今天胸部训练，疲劳4分，无疼痛。",
    input: "前三组做完了，肩膀还好，但最后两次有点晃，下一步做什么？",
    expected: "可以推进当前组数或状态，但不能贸然加重；应给动作质量下一步。"
  }
];

function compactOutput(output) {
  const patch = output?.patch;
  const card = output?.training_card;
  const plan = output?.plan_card;
  return {
    type: output?.type,
    chat_message: output?.chat_message,
    patch: patch
      ? {
          operation: patch.operation,
          target_exercise: patch.target_exercise,
          target_item_id: patch.target_item_id,
          from: patch.from,
          to: patch.to,
          reason: patch.reason,
          next_instruction: patch.next_instruction
        }
      : undefined,
    training_card: card
      ? {
          date: card.date,
          date_label: card.date_label,
          theme: card.theme,
          next_session_suggestions: card.next_session_suggestions
        }
      : undefined,
    plan_card: plan
      ? {
          plan_id: plan.plan_id,
          plan_revision: plan.plan_revision,
          title: plan.title,
          goal: plan.goal
        }
      : undefined,
    memory_updates: Array.isArray(output?.memory_updates)
      ? output.memory_updates.map((update) => ({
          category: update.category,
          operation: update.operation,
          key: update.key,
          value: update.value,
          remove_values: update.remove_values,
          requires_confirmation: update.requires_confirmation,
          content: update.content
        }))
      : undefined,
    state_after: output?.state_after
  };
}

async function runCase(baseContext, reviewCase) {
  const stateRoot = await mkdtemp(path.join(tmpdir(), `rts-real-hermes-${reviewCase.id}-`));
  const context = {
    providerRegistry: baseContext.providerRegistry,
    stateRoot
  };
  const started = await handleStartSession(context, {
    location: "公寓健身房",
    timezone: "Asia/Singapore"
  });
  const setup = reviewCase.setupPlan
    ? await handleChat(context, {
        text: reviewCase.setupPlan,
        timezone: "Asia/Singapore",
        event_id: `evt-real-${reviewCase.id}-setup`
      })
    : undefined;
  const result = await handleChat(context, {
    text: reviewCase.input,
    timezone: "Asia/Singapore",
    event_id: `evt-real-${reviewCase.id}-main`
  });
  const session = await handleGetCurrentSession(context);
  return {
    id: reviewCase.id,
    input: reviewCase.input,
    expected: reviewCase.expected,
    stateRoot,
    started: {
      id: started.id,
      target_date: started.target_date,
      phase: started.phase
    },
    setup: setup ? compactOutput(setup.hermes_output) : undefined,
    output: compactOutput(result.hermes_output),
    ui: {
      chat_message: result.ui.chat_message,
      current_exercise: result.ui.current_session?.current_exercise,
      current_item_id: result.ui.current_session?.current_item_id,
      current_set: result.ui.current_session?.current_set,
      phase: result.ui.current_session?.phase,
      plan_revision: result.ui.current_plan?.plan_revision,
      training_card_date: result.ui.training_card?.date,
      memory_update_count: result.ui.memory_updates?.length || 0
    },
    session: {
      current_exercise: session.current_exercise,
      current_item_id: session.current_item_id,
      current_set: session.current_set,
      phase: session.phase,
      target_date: session.target_date
    }
  };
}

const providerRegistry = new ProviderRegistry(new ProviderConfigStore(".runtime"));
const provider = await providerRegistry.getHermesProvider();
const results = [];
for (const reviewCase of REVIEW_CASES) {
  const startedAt = Date.now();
  try {
    const result = await runCase({ providerRegistry }, reviewCase);
    results.push({
      ok: true,
      durationMs: Date.now() - startedAt,
      ...result
    });
  } catch (error) {
    results.push({
      ok: false,
      durationMs: Date.now() - startedAt,
      id: reviewCase.id,
      input: reviewCase.input,
      expected: reviewCase.expected,
      error: error instanceof Error ? error.message : String(error),
      error_name: error instanceof Error ? error.name : undefined,
      error_stack: error instanceof Error ? error.stack : undefined,
      error_cause: error instanceof Error && error.cause ? String(error.cause) : undefined
    });
  }
}

const artifactDir = path.resolve(".runtime/real-hermes-complex-review");
await mkdir(artifactDir, { recursive: true });
const artifactPath = path.join(artifactDir, `review-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
const report = {
  ran_at: new Date().toISOString(),
  provider: {
    id: provider.instance.id,
    type: provider.instance.type,
    label: provider.instance.label,
    model: provider.instance.model,
    baseUrl: provider.instance.baseUrl
  },
  results
};
await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  artifactPath,
  provider: report.provider,
  summary: results.map((result) => ({
    id: result.id,
    ok: result.ok,
    durationMs: result.durationMs,
    type: result.output?.type,
    operation: result.output?.patch?.operation,
    training_card_date: result.output?.training_card?.date,
    memory_updates: result.output?.memory_updates?.length,
    error: result.error
  }))
}, null, 2));
