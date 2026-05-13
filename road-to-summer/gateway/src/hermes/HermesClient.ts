import type { HermesMessage, HermesOutput, HermesResponse, PlanCard } from "./types.ts";

export interface HermesClient {
  sendMessage(input: HermesMessage): Promise<HermesResponse>;
}

const QUICK_ACTIONS = [
  "完成本组",
  "太轻了",
  "太重了",
  "感觉不到目标肌肉",
  "器械被占用",
  "打开摄像头",
  "结束训练"
];

function defaultPlan(): PlanCard {
  return {
    title: "背部拉力 + 核心稳定",
    duration: "45-60 分钟",
    goal: "增肌塑形 + 功能性维护",
    sections: [
      {
        name: "热身",
        items: [
          {
            exercise: "划船机轻松热身",
            sets: "1",
            reps: "5-6 分钟",
            intensity: "RPE 3-4",
            rest: "-",
            cue: "让体温上来，不追求速度",
            substitutions: ["快走", "动态拉伸"]
          }
        ]
      },
      {
        name: "主训练",
        items: [
          {
            exercise: "高位下拉",
            sets: "4",
            reps: "8-12",
            intensity: "RPE 7-8",
            rest: "90 秒",
            cue: "先把肩膀放低，再用手肘往裤兜方向拉",
            substitutions: ["胸托哑铃划船", "单臂哑铃划船", "弹力带下拉"]
          },
          {
            exercise: "胸托哑铃划船",
            sets: "4",
            reps: "10-12",
            intensity: "RPE 7-8",
            rest: "75-90 秒",
            cue: "胸贴稳，手肘往身体后侧收",
            substitutions: ["单臂哑铃划船", "俯身哑铃划船"]
          }
        ]
      },
      {
        name: "辅助训练",
        items: [
          {
            exercise: "反向飞鸟",
            sets: "3",
            reps: "12-15",
            intensity: "RPE 7",
            rest: "60 秒",
            cue: "不要甩，像把肩胛往后放进裤兜",
            substitutions: ["弹力带拉开"]
          }
        ]
      },
      {
        name: "核心 / 心肺 / 拉伸",
        items: [
          {
            exercise: "死虫",
            sets: "3",
            reps: "每侧 8-10",
            intensity: "可控",
            rest: "45 秒",
            cue: "腰不要拱起来",
            substitutions: ["平板支撑"]
          }
        ]
      }
    ],
    risk_notes: ["肩前侧如果从紧变成疼，停止上肢推动作并改轻量活动度。"],
    reasoning: "频率不固定时，优先完成高价值主训练；公寓健身房空间有限，避免大范围移动；用户不喜欢波比跳和高强度 HIIT，因此用低风险心肺和核心替代。"
  };
}

function memoryUpdate(content: string, reason: string) {
  return {
    target: "Hermes Memory" as const,
    content,
    reason,
    requires_confirmation: true
  };
}

function outputForText(input: HermesMessage): HermesOutput {
  const text = input.raw_text;

  if (/今天该练什么|今天训练|帮我安排/.test(text)) {
    return {
      type: "training_plan",
      chat_message: "今天建议做背部拉力 + 核心稳定。计划已经整理成卡片。",
      plan_card: defaultPlan(),
      quick_actions: QUICK_ACTIONS
    };
  }

  if (/高位下拉.*修好|高位下拉.*可用/.test(text)) {
    return {
      type: "plan_patch",
      chat_message: "已识别高位下拉恢复可用。建议确认后更新 Hermes Memory。",
      patch: {
        operation: "update_cue",
        target_exercise: "高位下拉",
        from: "unavailable",
        to: "available",
        reason: "用户反馈器械已修复",
        next_instruction: "后续训练可以重新使用高位下拉。"
      },
      quick_actions: QUICK_ACTIONS,
      memory_updates: [
        memoryUpdate("高位下拉状态恢复为 available。", "器械长期状态变化，需要更新 Hermes Memory。")
      ]
    };
  }

  if (/高位下拉.*坏|高位下拉.*不能用/.test(text)) {
    return {
      type: "plan_patch",
      chat_message: "高位下拉今天不能用，先不改变背部训练目标，改用胸托哑铃划船或单臂哑铃划船。",
      patch: {
        operation: "replace_exercise",
        target_exercise: "高位下拉",
        from: "高位下拉",
        to: "胸托哑铃划船",
        reason: "高位下拉不可用，但仍要保留背部拉力刺激。",
        next_instruction: "做胸托哑铃划船 4 组 x 10-12 次，RPE 7-8，休息 75-90 秒。"
      },
      quick_actions: QUICK_ACTIONS,
      memory_updates: [
        memoryUpdate("高位下拉当前状态为 unavailable。", "器械长期状态可能影响后续计划，需要确认后写入 Hermes Memory。")
      ]
    };
  }

  if (/高位下拉|绳索划船/.test(text) && /有人|占用|排队|没有了|没了/.test(text)) {
    return {
      type: "plan_patch",
      chat_message: "器械被占用，不改变背部训练目标。先换成不依赖绳索的划船动作。",
      patch: {
        operation: "replace_exercise",
        target_exercise: "高位下拉 / 绳索划船",
        from: "高位下拉 / 绳索划船",
        to: "胸托哑铃划船",
        reason: "保持背部拉力训练目标，同时避开被占用器械。",
        next_instruction: "做胸托哑铃划船 4 组 x 10-12 次；如果没有胸托条件，换单臂哑铃划船。"
      },
      quick_actions: QUICK_ACTIONS
    };
  }

  if (/累|疲劳|没力/.test(text)) {
    return {
      type: "plan_patch",
      chat_message: "我先不直接让你结束。先判断是全身没力还是目标肌肉正常酸胀；如果动作质量稳定，延长休息后继续；如果动作变形，下一组降重 10%-15%。",
      patch: {
        operation: "extend_rest",
        target_exercise: input.current_session.current_exercise || "当前动作",
        from: "常规休息",
        to: "90-120 秒休息",
        reason: "用户反馈疲劳，需要先判断疲劳类型和动作质量，而不是直接结束训练。",
        next_instruction: "休息到呼吸恢复；下一组如果动作变形就降重 10%-15%，如有疼痛或头晕则停止。"
      },
      quick_actions: QUICK_ACTIONS
    };
  }

  if (/感觉不到|背阔肌|发力/.test(text)) {
    return {
      type: "plan_patch",
      chat_message: "下一组先别急着拉重量。先把肩膀放低，不要耸肩；想象用手肘往身体两侧的裤兜方向拉，而不是用手把重量硬拽下来。",
      patch: {
        operation: "update_cue",
        target_exercise: input.current_session.current_exercise || "高位下拉",
        from: "常规 cue",
        to: "手像挂钩，手肘往裤兜方向拉",
        reason: "用户感觉不到背阔肌发力，需要降低代偿并更新动作提示。",
        next_instruction: "下一组降重 10%-15%，放慢下拉速度，最低点停 1 秒。"
      },
      quick_actions: QUICK_ACTIONS
    };
  }

  if (/练完|训练结束|总结/.test(text)) {
    return {
      type: "training_card",
      chat_message: "已生成本次训练卡片。",
      training_card: {
        date: new Date().toISOString().slice(0, 10),
        location: input.current_session.location || "公寓健身房",
        duration: "",
        theme: input.current_session.theme || "背部拉力 + 核心稳定",
        planned: input.current_session.plan_card?.sections || [],
        actual_completed: [],
        adjustments: input.current_session.events || [],
        equipment_notes: [],
        body_feedback: [],
        fatigue_notes: [],
        pain_or_discomfort: [],
        unfinished_items: [],
        next_session_suggestions: ["下次优先读取本次训练卡片、器械状态和身体反馈，再决定训练方向。"]
      },
      memory_updates: [
        memoryUpdate("本次训练卡片已生成，可用于下次训练计划。", "训练卡片是下一次训练的重要上下文。")
      ]
    };
  }

  if (input.movement_assessment) {
    return {
      type: "plan_patch",
      chat_message: "下一组先不要加重量。检测到轻微耸肩和身体后仰，先把重量降一点，想象用手肘往裤兜方向拉。",
      patch: {
        operation: "update_cue",
        target_exercise: input.movement_assessment.exercise,
        from: "原动作 cue",
        to: "先肩膀下沉，再用手肘往裤兜方向拉",
        reason: "检测到轻微耸肩和身体后仰。",
        next_instruction: "降重，放慢下拉速度，先肩膀下沉，再用手肘往裤兜方向拉。"
      },
      quick_actions: QUICK_ACTIONS
    };
  }

  return {
    type: "plan_patch",
    chat_message: "我已收到反馈。请确认这是器械、疲劳、疼痛、动作感受，还是训练结束。",
    patch: {
      operation: "update_cue",
      target_exercise: input.current_session.current_exercise || "",
      reason: "输入暂未能稳定分类。",
      next_instruction: "请补充当前动作和具体感受。"
    },
    quick_actions: QUICK_ACTIONS
  };
}

export class MockHermesClient implements HermesClient {
  async sendMessage(input: HermesMessage): Promise<HermesResponse> {
    const output = outputForText(input);
    return {
      output,
      raw: output,
      provider: "mock"
    };
  }
}

