import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { handleChat } from "../road-to-summer/gateway/src/routes/chat.ts";
import { handleHistoryList } from "../road-to-summer/gateway/src/routes/history.ts";
import { handleGetCurrentSession, handleStartSession } from "../road-to-summer/gateway/src/routes/session.ts";
import { getCurrentPlan, saveCurrentPlan, saveCurrentSession } from "../road-to-summer/gateway/src/storage/currentSessionStore.ts";
import { saveTrainingCard } from "../road-to-summer/gateway/src/storage/trainingCardStore.ts";

async function context(sendMessage) {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "rts-phone-p0-"));
  return {
    stateRoot,
    providerRegistry: {
      getHermesProvider: async () => ({
        instance: {
          id: "p0-test-hermes",
          type: "hermes-api-server",
          label: "P0 Test Hermes"
        },
        sendMessage
      })
    }
  };
}

function minimalPlan(overrides = {}) {
  return {
    title: "今天胸部训练",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore",
    duration: "40 分钟",
    goal: "胸部增肌",
    sections: [
      {
        section_id: "main",
        name: "主训练",
        items: [
          {
            item_id: "press-a",
            exercise: "哑铃卧推",
            role: "main",
            movement_pattern: "水平推",
            primary_muscles: ["胸"],
            selection_reason: "匹配胸部训练目标。",
            source_note: "",
            common_mistakes: [],
            adjustment_rule: "按 RPE 调整。",
            sets: "3",
            reps: "8-10",
            intensity: "RPE 7",
            rest: "90 秒",
            cue: "肩胛稳定后再推。",
            substitutions: []
          }
        ]
      }
    ],
    risk_notes: ["明天（5月16日）肩前侧仍疼就停止上肢推。"],
    reasoning: "按当前目标安排。",
    ...overrides
  };
}

async function seedPlan(ctx, plan = minimalPlan()) {
  const session = await handleStartSession(ctx, {
    target_date: plan.target_date,
    timezone: plan.timezone,
    location: "公寓健身房"
  });
  const savedPlan = await saveCurrentPlan(plan, ctx.stateRoot);
  await saveCurrentSession({
    ...session,
    phase: "warmup",
    current_exercise: "哑铃卧推",
    current_item_id: "press-a",
    plan_card: savedPlan
  }, ctx.stateRoot);
  return savedPlan;
}

test("final handleChat training plan includes default professional source traces", async () => {
  const ctx = await context(async () => ({
    output: {
      type: "training_plan",
      chat_message: "已生成训练计划。",
      plan_card: minimalPlan({
        framework_trace: [],
        official_source_trace: []
      }),
      quick_actions: []
    },
    raw: {},
    provider: "hermes"
  }));

  const result = await handleChat(ctx, {
    text: "今天该练什么？",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });

  const plan = result.ui.current_plan;
  assert.ok(plan.framework_trace.some((item) => /ACE IFT/.test(item)));
  assert.ok(plan.framework_trace.some((item) => /NASM OPT/.test(item)));
  assert.ok(plan.framework_trace.some((item) => /NSCA/.test(item)));
  assert.ok(plan.framework_trace.some((item) => /ACSM 2026/.test(item)));
  assert.ok(plan.framework_trace.some((item) => /RPE\/RIR/.test(item)));
  assert.ok(plan.official_source_trace.some((item) => item.framework === "ACE IFT" && item.source_url.startsWith("https://")));
  assert.ok(plan.official_source_trace.some((item) => item.framework === "NASM OPT" && item.source_url.startsWith("https://")));
  assert.ok(plan.official_source_trace.some((item) => /NSCA/.test(item.framework) && item.source_url.startsWith("https://")));
  assert.ok(plan.official_source_trace.some((item) => item.framework === "ACSM 2026" && item.source_url.startsWith("https://")));
});

test("plan patch with target_item_id only changes the addressed duplicate item", async () => {
  const ctx = await context(async () => ({
    output: {
      type: "plan_patch",
      chat_message: "只调整第二个卧推动作。",
      patch: {
        operation: "update_cue",
        target_item_id: "press-b",
        target_exercise: "哑铃卧推",
        reason: "测试 item_id 优先级。",
        next_instruction: "第二个动作改为慢速离心。"
      },
      quick_actions: []
    },
    raw: {},
    provider: "hermes"
  }));
  await seedPlan(ctx, minimalPlan({
    sections: [
      {
        section_id: "main",
        name: "主训练",
        items: [
          {
            item_id: "press-a",
            exercise: "哑铃卧推",
            role: "main",
            movement_pattern: "水平推",
            primary_muscles: ["胸"],
            selection_reason: "第一个卧推。",
            source_note: "",
            common_mistakes: [],
            adjustment_rule: "",
            sets: "3",
            reps: "8-10",
            intensity: "RPE 7",
            rest: "90 秒",
            cue: "第一个动作保持原提示。",
            substitutions: []
          },
          {
            item_id: "press-b",
            exercise: "哑铃卧推",
            role: "secondary",
            movement_pattern: "水平推",
            primary_muscles: ["胸"],
            selection_reason: "第二个卧推。",
            source_note: "",
            common_mistakes: [],
            adjustment_rule: "",
            sets: "2",
            reps: "10",
            intensity: "RPE 6",
            rest: "75 秒",
            cue: "第二个动作原提示。",
            substitutions: []
          }
        ]
      }
    ]
  }));

  const result = await handleChat(ctx, {
    text: "只改第二个卧推",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  const items = result.ui.current_plan.sections[0].items;
  assert.equal(items[0].cue, "第一个动作保持原提示。");
  assert.equal(items[1].cue, "第二个动作改为慢速离心。");
});

test("unmatched plan patch does not pretend to change current exercise", async () => {
  const ctx = await context(async () => ({
    output: {
      type: "plan_patch",
      chat_message: "没有找到这个动作。",
      patch: {
        operation: "update_cue",
        target_exercise: "不存在的动作",
        reason: "测试未匹配。",
        next_instruction: "不应写入当前动作。"
      },
      quick_actions: []
    },
    raw: {},
    provider: "hermes"
  }));
  const plan = await seedPlan(ctx);

  const result = await handleChat(ctx, {
    text: "调整不存在的动作",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  const current = await handleGetCurrentSession(ctx);
  const lastEvent = current.events.at(-1);

  assert.equal(result.ui.current_plan.plan_revision, plan.plan_revision);
  assert.equal(current.current_exercise, "哑铃卧推");
  assert.equal(lastEvent.patch_applied, false);
  assert.equal(lastEvent.matched_items, 0);
});

test("section-level replace patch updates the live plan even when Hermes sends stale session_update", async () => {
  const stalePlan = minimalPlan({
    title: "恢复与功能维护",
    plan_revision: 2,
    sections: [
      {
        section_id: "mobility",
        name: "全身活动度循环",
        items: [
          {
            item_id: "mobility-a",
            exercise: "髋铰链 + 胸椎旋转",
            role: "warmup",
            movement_pattern: "活动度",
            primary_muscles: ["全身"],
            selection_reason: "训练前恢复活动范围。",
            source_note: "",
            common_mistakes: [],
            adjustment_rule: "",
            sets: "2",
            reps: "8 次/侧",
            intensity: "轻",
            rest: "30 秒",
            cue: "慢速找活动范围。",
            substitutions: []
          }
        ]
      }
    ]
  });
  const ctx = await context(async () => ({
    output: {
      type: "plan_patch",
      chat_message: "已把全身活动度循环替换为台阶上步。",
      patch: {
        operation: "replace_exercise",
        target_exercise: "全身活动度循环",
        from: "全身活动度循环",
        to: "台阶上步",
        reason: "用户要求把当前活动度循环换成台阶上步。",
        next_instruction: "台阶上步 2 组 x 10 次/侧，保持膝盖稳定。"
      },
      session_update: {
        current_exercise: "全身活动度循环",
        plan_card: stalePlan
      },
      quick_actions: []
    },
    raw: {},
    provider: "hermes"
  }));
  const session = await handleStartSession(ctx, {
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  await saveCurrentPlan(stalePlan, ctx.stateRoot);
  await saveCurrentSession({
    ...session,
    phase: "warmup",
    current_exercise: "全身活动度循环",
    plan_card: stalePlan
  }, ctx.stateRoot);

  const result = await handleChat(ctx, {
    text: "把当前全身活动度循环换成台阶上步",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  const current = await handleGetCurrentSession(ctx);
  const persistedPlan = await getCurrentPlan(ctx.stateRoot);
  const firstItem = result.ui.current_plan.sections[0].items[0];

  assert.equal(firstItem.exercise, "台阶上步");
  assert.equal(result.ui.current_session.current_exercise, "台阶上步");
  assert.equal(current.current_exercise, "台阶上步");
  assert.equal(persistedPlan.sections[0].items[0].exercise, "台阶上步");
  assert.equal(current.events.at(-1).patch_applied, true);
  assert.equal(current.events.at(-1).matched_items, 1);
});

test("explicit updated plan alias keeps current exercise in sync when patch is already applied", async () => {
  const originalPlan = minimalPlan({
    title: "替换动作同步测试",
    plan_revision: 3,
    sections: [
      {
        section_id: "main",
        name: "主训练",
        items: [
          {
            item_id: "move-a",
            exercise: "全身活动度循环",
            role: "main",
            movement_pattern: "活动度",
            primary_muscles: ["全身"],
            selection_reason: "原动作。",
            source_note: "",
            common_mistakes: [],
            adjustment_rule: "",
            sets: "3",
            reps: "8 次",
            intensity: "RPE 3",
            rest: "45 秒",
            cue: "原动作提示。",
            substitutions: []
          }
        ]
      }
    ]
  });
  const updatedPlan = minimalPlan({
    ...originalPlan,
    sections: [
      {
        ...originalPlan.sections[0],
        items: [
          {
            ...originalPlan.sections[0].items[0],
            exercise: "台阶上步",
            substitutions: ["全身活动度循环"]
          }
        ]
      }
    ]
  });
  const ctx = await context(async () => ({
    output: {
      type: "plan_patch",
      chat_message: "已经把当前动作换成台阶上步。",
      patch: {
        operation: "replace_exercise",
        target_exercise: "全身活动度循环",
        from: "全身活动度循环",
        to: "台阶上步",
        reason: "用户要求替换当前动作。",
        next_instruction: "下一组做台阶上步。"
      },
      updated_plan: updatedPlan,
      quick_actions: []
    },
    raw: {},
    provider: "hermes"
  }));
  const session = await handleStartSession(ctx, {
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  await saveCurrentPlan(originalPlan, ctx.stateRoot);
  await saveCurrentSession({
    ...session,
    phase: "warmup",
    current_exercise: "全身活动度循环",
    current_item_id: "move-a",
    plan_card: originalPlan
  }, ctx.stateRoot);

  const result = await handleChat(ctx, {
    text: "把当前动作换成台阶上步",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  const current = await handleGetCurrentSession(ctx);

  assert.equal(result.ui.current_plan.sections[0].items[0].exercise, "台阶上步");
  assert.equal(result.ui.current_session.current_exercise, "台阶上步");
  assert.equal(current.current_exercise, "台阶上步");
  assert.equal(current.events.at(-1).patch_applied, true);
  assert.equal(current.events.at(-1).matched_items, 1);
});

test("muscle selection wording is treated as a new training plan request", async () => {
  let capturedMessage;
  const ctx = await context(async (message) => {
    capturedMessage = message;
    return {
      output: {
        type: "training_plan",
        chat_message: "已为 2026-05-15 生成胸部训练计划。",
        plan_card: minimalPlan({
          title: "胸部专项训练计划",
          goal: "胸部训练",
          sections: [
            {
              section_id: "main",
              name: "主训练",
              items: [
                {
                  item_id: "press-main",
                  exercise: "哑铃卧推",
                  role: "main",
                  movement_pattern: "水平推",
                  primary_muscles: ["胸"],
                  selection_reason: "匹配胸部训练目标。",
                  source_note: "",
                  common_mistakes: [],
                  adjustment_rule: "",
                  sets: "3",
                  reps: "8-10",
                  intensity: "RPE 7",
                  rest: "90 秒",
                  cue: "肩胛稳定。",
                  substitutions: []
                }
              ]
            }
          ]
        })
      },
      raw: {},
      provider: "hermes"
    };
  });

  const result = await handleChat(ctx, {
    text: "我想在 2026-05-15 训练：胸部。请根据这些部位生成训练计划。",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });

  assert.match(capturedMessage.instruction, /Return strict training_plan JSON/);
  assert.equal(capturedMessage.current_session.plan_card, undefined);
  assert.equal(result.hermes_output.type, "training_plan");
  assert.equal(result.ui.current_plan.title, "胸部专项训练计划");
});

test("planning from ended session starts a clean session and does not resurrect the ended plan", async () => {
  const endedPlan = minimalPlan({ title: "2026-05-15 恢复与功能维护" });
  const chestPlan = minimalPlan({
    title: "胸部专项训练计划",
    goal: "胸部训练",
    sections: [
      {
        section_id: "main",
        name: "主训练",
        items: [
          {
            item_id: "press-main",
            exercise: "哑铃卧推",
            role: "main",
            movement_pattern: "水平推",
            primary_muscles: ["胸"],
            selection_reason: "匹配胸部训练目标。",
            source_note: "",
            common_mistakes: [],
            adjustment_rule: "",
            sets: "3",
            reps: "8-10",
            intensity: "RPE 7",
            rest: "90 秒",
            cue: "肩胛稳定。",
            substitutions: []
          }
        ]
      }
    ]
  });
  let capturedMessage;
  const ctx = await context(async (message) => {
    capturedMessage = message;
    return {
      output: {
        type: "training_plan",
        chat_message: "已为 2026-05-15 生成胸部训练计划。",
        plan_card: chestPlan,
        quick_actions: []
      },
      raw: {},
      provider: "hermes"
    };
  });
  const session = await handleStartSession(ctx, {
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  await saveCurrentPlan(endedPlan, ctx.stateRoot);
  await saveCurrentSession({
    ...session,
    phase: "ended",
    theme: endedPlan.title,
    current_exercise: "波比跳",
    plan_card: endedPlan,
    chat_messages: [
      {
        id: "old-user",
        role: "user",
        text: "结束训练",
        source: "quick_action",
        created_at: "2026-05-15T01:00:00.000Z"
      },
      {
        id: "old-agent",
        role: "agent",
        text: "训练已保存。",
        source: "system",
        created_at: "2026-05-15T01:00:01.000Z"
      }
    ]
  }, ctx.stateRoot);

  const result = await handleChat(ctx, {
    text: "我想在 2026-05-15 训练：胸部。请根据这些部位生成训练计划。",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  const current = await handleGetCurrentSession(ctx);
  const persistedPlan = await getCurrentPlan(ctx.stateRoot);

  assert.equal(capturedMessage.current_session.phase, "preworkout");
  assert.equal(capturedMessage.current_session.plan_card, undefined);
  assert.equal(result.ui.current_plan.title, "胸部专项训练计划");
  assert.equal(result.ui.current_session.plan_card.title, "胸部专项训练计划");
  assert.equal(current.current_plan.title, "胸部专项训练计划");
  assert.equal(persistedPlan.title, "胸部专项训练计划");
  assert.equal(current.chat_messages.length, 2);
  assert.equal(current.chat_messages[0].text, "我想在 2026-05-15 训练：胸部。请根据这些部位生成训练计划。");
});

test("training plan chat message aligns generated-plan date with selected target date", async () => {
  const ctx = await context(async () => ({
    output: {
      type: "training_plan",
      chat_message: "已为 2026-05-16 生成训练计划。",
      plan_card: minimalPlan({ target_date: "2026-05-16" }),
      quick_actions: []
    },
    raw: {},
    provider: "hermes"
  }));

  const result = await handleChat(ctx, {
    text: "请按 2026-05-15 生成训练计划。",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });

  assert.equal(result.ui.current_plan.target_date, "2026-05-15");
  assert.doesNotMatch(result.ui.chat_message, /已为 2026-05-16 生成/);
  assert.match(result.ui.chat_message, /2026-05-15/);
});

test("training plan chat message normalizes alternate generated-plan date phrasings", async () => {
  const phrasings = [
    "已生成 2026-05-16 的训练计划。",
    "为 2026-05-16 生成训练计划。"
  ];

  for (const phrase of phrasings) {
    const ctx = await context(async () => ({
      output: {
        type: "training_plan",
        chat_message: phrase,
        plan_card: minimalPlan({ target_date: "2026-05-16" }),
        quick_actions: []
      },
      raw: {},
      provider: "hermes"
    }));

    const result = await handleChat(ctx, {
      text: "请按 2026-05-15 生成训练计划。",
      target_date: "2026-05-15",
      timezone: "Asia/Singapore"
    });

    assert.equal(result.ui.current_plan.target_date, "2026-05-15");
    assert.doesNotMatch(result.ui.chat_message, /2026-05-16/);
    assert.match(result.ui.chat_message, /2026-05-15/);
  }
});

test("quality conflicts warn without replacing a requested muscle plan with a local recovery plan", async () => {
  const chestPlan = minimalPlan({
    title: "胸部专项训练计划",
    goal: "胸部训练",
    sections: [
      {
        section_id: "main",
        name: "主训练",
        items: [
          {
            item_id: "press-main",
            exercise: "哑铃卧推",
            role: "main",
            movement_pattern: "水平推",
            primary_muscles: ["胸部"],
            selection_reason: "匹配用户明确选择的胸部训练目标。",
            source_note: "",
            common_mistakes: [],
            adjustment_rule: "肩前侧不适时停止。",
            sets: "3",
            reps: "8-10",
            intensity: "RPE 6-7",
            rest: "90 秒",
            cue: "肩胛稳定后再推。",
            substitutions: []
          }
        ]
      }
    ]
  });
  const ctx = await context(async () => ({
    output: {
      type: "training_plan",
      chat_message: "已为 2026-05-15 生成胸部训练计划。",
      plan_card: chestPlan,
      quick_actions: []
    },
    raw: {},
    provider: "hermes"
  }));
  await saveTrainingCard({
    date: "2026-05-15",
    timezone: "Asia/Singapore",
    location: "公寓健身房",
    duration: "45 分钟",
    theme: "上肢拉力·核心稳定·心肺激活",
    planned: [],
    actual_completed: ["胸托哑铃划船", "波比跳"],
    adjustments: [],
    equipment_notes: [],
    body_feedback: ["胸部已有一定刺激"],
    fatigue_notes: [],
    pain_or_discomfort: [],
    unfinished_items: [],
    next_session_suggestions: []
  }, ctx.stateRoot);

  const result = await handleChat(ctx, {
    text: "我想在 2026-05-15 训练：胸部。请根据这些部位生成训练计划。",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  const current = await handleGetCurrentSession(ctx);

  assert.equal(result.ui.current_plan.title, "胸部专项训练计划");
  assert.equal(current.current_plan.title, "胸部专项训练计划");
  assert.ok(result.ui.current_plan.quality_warnings.some((warning) => /刚练过.*胸部/.test(warning)));
  assert.doesNotMatch(result.ui.current_plan.title, /恢复与功能维护/);
  assert.doesNotMatch(result.ui.chat_message, /全身活动度循环/);
});

test("provider invalid output rejects without mutating plan, history, or chat", async () => {
  const ctx = await context(async () => ({
    output: "not json",
    raw: {},
    provider: "hermes"
  }));
  const plan = await seedPlan(ctx);
  const before = await handleGetCurrentSession(ctx);
  await assert.rejects(() => handleChat(ctx, {
    text: "今天该练什么？",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  }), /Hermes response is not valid JSON/);

  const current = await handleGetCurrentSession(ctx);
  const history = await handleHistoryList(ctx);
  assert.equal(current.current_plan.title, plan.title);
  assert.deepEqual(current.chat_messages, before.chat_messages);
  assert.equal(history.length, 0);
});

test("chat persistence keeps only the most recent 80 messages", async () => {
  const ctx = await context(async () => ({
    output: {
      type: "plan_patch",
      chat_message: "继续当前训练。",
      patch: {
        operation: "continue_current",
        target_exercise: "当前动作",
        reason: "测试聊天截断。",
        next_instruction: "保持当前节奏。"
      },
      quick_actions: []
    },
    raw: {},
    provider: "hermes"
  }));
  const session = await handleStartSession(ctx, {
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });
  await saveCurrentSession({
    ...session,
    chat_messages: Array.from({ length: 79 }, (_, index) => ({
      id: `old-${index}`,
      role: index % 2 === 0 ? "user" : "agent",
      text: `旧消息 ${index}`,
      source: "text",
      created_at: `2026-05-15T00:${String(index).padStart(2, "0")}:00.000Z`
    }))
  }, ctx.stateRoot);

  const result = await handleChat(ctx, {
    text: "继续",
    target_date: "2026-05-15",
    timezone: "Asia/Singapore"
  });

  const messages = result.ui.current_session.chat_messages;
  assert.equal(messages.length, 80);
  assert.equal(messages[0].text, "旧消息 1");
  assert.equal(messages.at(-2).text, "继续");
  assert.equal(messages.at(-1).text, "继续当前训练。");
});
