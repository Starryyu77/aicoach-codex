import assert from "node:assert/strict";
import test from "node:test";
import { withPlanSourceNotes } from "../road-to-summer/gateway/src/training/sourceNotes.ts";

test("plan source enrichment always includes the professional source registry", () => {
  const plan = withPlanSourceNotes({
    title: "测试训练",
    duration: "40 分钟",
    goal: "验证来源补全",
    reasoning: "模型只返回了部分来源。",
    risk_notes: [],
    framework_trace: ["自定义：根据用户今天想练胸安排。"],
    official_source_trace: [
      {
        framework: "ACSM 2026",
        model: "",
        official_source: "",
        source_url: "",
        source_location: "",
        principle: "",
        applied_decision: "用 3 组 x 8-12 次匹配增肌刺激。",
        why_it_matters: ""
      }
    ],
    sections: [
      {
        name: "主训练",
        items: [
          {
            exercise: "哑铃平板卧推",
            role: "main",
            sets: "3 组",
            reps: "8-12 次",
            intensity: "RPE 7",
            rest: "90 秒",
            cue: "肩胛稳定后推起。",
            substitutions: []
          }
        ]
      }
    ]
  });

  assert.ok(plan.framework_trace.some((trace) => /ACE IFT/.test(trace)));
  assert.ok(plan.framework_trace.some((trace) => /NASM OPT/.test(trace)));
  assert.ok(plan.framework_trace.some((trace) => /NSCA Program Design/.test(trace)));
  assert.ok(plan.framework_trace.some((trace) => /ACSM 2026/.test(trace)));
  assert.ok(plan.framework_trace.some((trace) => /RPE\/RIR/.test(trace)));

  const frameworks = plan.official_source_trace.map((trace) => trace.framework);
  assert.deepEqual(frameworks.slice(0, 5), ["ACE IFT", "NASM OPT", "NSCA Program Design", "ACSM 2026", "RPE/RIR Autoregulation"]);
  assert.ok(plan.official_source_trace.every((trace) => trace.official_source && trace.source_url && trace.source_location));
  assert.ok(plan.official_source_trace.some((trace) => trace.framework === "ACSM 2026" && trace.applied_decision.includes("3 组")));

  const item = plan.sections[0].items[0];
  assert.equal(typeof item, "object");
  assert.match(item.source_note, /教练依据/);
});
