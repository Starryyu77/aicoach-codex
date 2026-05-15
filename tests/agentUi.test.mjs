import assert from "node:assert/strict";
import test from "node:test";
import { buildAgentUiDocument, validateAgentUiDocument } from "../road-to-summer/gateway/src/ui/agentUi.ts";

test("agent ui document compiles training_plan into safe component tree", () => {
  const output = {
    type: "training_plan",
    chat_message: "今天做胸部训练。",
    plan_card: {
      title: "胸部训练",
      duration: "45 分钟",
      goal: "增肌",
      sections: [
        {
          name: "主训练",
          items: [
            {
              exercise: "哑铃卧推",
              sets: "3",
              reps: "8-10",
              intensity: "RPE 7",
              rest: "90 秒",
              cue: "肩胛稳定后再推",
              substitutions: ["俯卧撑"]
            }
          ]
        }
      ],
      risk_notes: [],
      reasoning: "按当前目标安排。"
    },
    quick_actions: ["开始训练", "完成本组"]
  };
  const ui = {
    chat_message: output.chat_message,
    current_plan: output.plan_card,
    current_session: {
      current_exercise: "哑铃卧推",
      current_set: 1
    },
    quick_actions: output.quick_actions
  };
  const document = buildAgentUiDocument(output, ui);
  assert.equal(document.version, "rts-a2ui-0.1");
  assert.equal(document.surface, "training_cockpit");
  assert.equal(validateAgentUiDocument(document).valid, true);
  assert.ok(document.components.some((component) => component.type === "plan_sections"));
  assert.ok(document.components.some((component) => component.type === "action_row"));
  assert.equal(document.data.plan.title, "胸部训练");
});

test("agent ui validator rejects unsupported component and missing child", () => {
  const document = {
    version: "rts-a2ui-0.1",
    surface: "training_cockpit",
    root: "root",
    components: [
      {
        id: "root",
        type: "surface",
        children: ["evil"]
      },
      {
        id: "script",
        type: "script",
        props: {
          code: "alert(1)"
        }
      }
    ],
    data: {
      chat_message: ""
    }
  };
  const result = validateAgentUiDocument(document);
  assert.equal(result.valid, false);
  assert.match(result.error, /unsupported|child/);
});

test("agent ui validator rejects duplicate component ids and missing root", () => {
  const duplicate = {
    version: "rts-a2ui-0.1",
    surface: "training_cockpit",
    root: "root",
    components: [
      { id: "root", type: "surface", children: [] },
      { id: "root", type: "coach_message", props: { path: "/chat_message" } }
    ],
    data: {
      chat_message: ""
    }
  };
  const missingRoot = {
    version: "rts-a2ui-0.1",
    surface: "training_cockpit",
    root: "missing",
    components: [
      { id: "root", type: "surface", children: [] }
    ],
    data: {
      chat_message: ""
    }
  };

  assert.equal(validateAgentUiDocument(duplicate).valid, false);
  assert.match(validateAgentUiDocument(duplicate).error, /duplicate/);
  assert.equal(validateAgentUiDocument(missingRoot).valid, false);
  assert.match(validateAgentUiDocument(missingRoot).error, /root component not found/);
});
