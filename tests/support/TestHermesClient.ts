import type { HermesMessage, HermesOutput, HermesResponse, PlanCard, PlanItem } from "../../road-to-summer/gateway/src/hermes/types.ts";
import { composePlanFromExerciseSelection } from "../../road-to-summer/gateway/src/training/exerciseSelection.ts";

export interface TestHermesClientContract {
  sendMessage(input: HermesMessage): Promise<HermesResponse>;
}

const QUICK_ACTIONS = [
  "开始训练",
  "完成本组",
  "太轻了",
  "太重了",
  "感觉不到目标肌肉",
  "器械被占用",
  "打开摄像头",
  "结束训练"
];

function defaultPlan(input?: HermesMessage): PlanCard {
  if (!input) throw new Error("Test default plan requires HermesMessage input.");
  return composePlanFromExerciseSelection(input);
}

function memoryUpdate(content: string, reason: string, extra: Record<string, unknown> = {}) {
  return {
    target: "Hermes Memory" as const,
    content,
    reason,
    requires_confirmation: true,
    ...extra
  };
}

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

function currentPlanItem(input: HermesMessage): PlanItem | undefined {
  const current = (input.current_session.current_exercise || "").replace(/\s+/g, "");
  const items = input.current_session.plan_card?.sections.flatMap((section) => section.items).filter(isPlanItem) || [];
  return items.find((item) => item.exercise.replace(/\s+/g, "") === current) || items[0];
}

function currentExerciseName(input: HermesMessage): string {
  return input.current_session.current_exercise || currentPlanItem(input)?.exercise || "当前动作";
}

function currentIntensity(input: HermesMessage): string {
  return currentPlanItem(input)?.intensity || "当前强度";
}

function currentRest(input: HermesMessage): string {
  return currentPlanItem(input)?.rest || "当前休息";
}

function loadAdjustmentOutput(input: HermesMessage, direction: "up" | "down"): HermesOutput {
  const exercise = currentExerciseName(input);
  const from = currentIntensity(input);
  const isUp = direction === "up";
  return {
    type: "plan_patch",
    chat_message: isUp
      ? [
          `收到，**${exercise}** 现在偏轻。`,
          "如果上一组动作稳定、目标肌肉能感觉到、没有疼痛，下一组先小幅加重，不要直接跳太多。",
          "按 RPE/RIR 自动调节的思路，这种情况优先加 2.5%-5% 重量；如果器械加重跨度太大，就保持重量多做 1-2 次或放慢离心。"
        ].join("\n\n")
      : [
          `收到，**${exercise}** 现在偏重。`,
          "下一组不要硬顶重量，先把动作质量拿回来。",
          "按 RPE/RIR 自动调节的思路，如果动作速度明显变慢、姿势变形或目标肌肉感觉丢了，先降重 5%-15%，保留目标次数和动作控制。"
        ].join("\n\n"),
    patch: {
      operation: "adjust_load",
      target_exercise: exercise,
      from,
      to: isUp ? `${from} -> 上调 2.5%-5% 或多做 1-2 次` : `${from} -> 下调 5%-15%`,
      reason: isUp
        ? "用户反馈当前重量太轻，需要在动作质量稳定的前提下小幅提高刺激。"
        : "用户反馈当前重量太重，需要优先保留动作质量和风险控制。",
      next_instruction: isUp
        ? "下一组先小幅加重；如果加重后动作变形，立刻退回原重量并放慢节奏。"
        : "下一组先降重，保持可控速度；如果仍然不稳，减少一组或换更安全的替代动作。"
    },
    quick_actions: QUICK_ACTIONS
  };
}

function addSetDecisionOutput(input: HermesMessage): HermesOutput {
  const exercise = currentExerciseName(input);
  return {
    type: "plan_patch",
    chat_message: [
      `你问要不要给 **${exercise}** 加组，我不会只看“还有力气”。`,
      "如果上一组动作质量稳定、没有疼痛、目标肌肉还有感觉，而且今天主训练还没超量，可以加 1 组。",
      "如果只是觉得不累但动作已经开始代偿，先不加组，改成把下一组做慢一点、做标准。"
    ].join("\n\n"),
    patch: {
      operation: "add_set",
      target_exercise: exercise,
      from: currentPlanItem(input)?.sets || "当前组数",
      to: "当前计划 + 1 组（仅在动作质量稳定且无疼痛时）",
      reason: "用户询问是否加组，需要结合完成度、动作质量和风险，而不是机械增加训练量。",
      next_instruction: "如果加组，RPE 控制在 7-8，不做到力竭；如果动作变形或关节不适，取消加组。"
    },
    quick_actions: QUICK_ACTIONS
  };
}

function unfamiliarExerciseOutput(input: HermesMessage): HermesOutput {
  const exercise = currentExerciseName(input);
  return {
    type: "plan_patch",
    chat_message: [
      `可以，先别急着做 **${exercise}**。`,
      "你先把重量降到很轻，把动作当成练路径：先站稳/坐稳，再找目标肌肉，最后再加重量。",
      "如果这是拉的动作，想象手只是钩子，先用肩胛和手肘带动作；如果这是推的动作，先让肩胛稳定，不要耸肩硬推。"
    ].join("\n\n"),
    patch: {
      operation: "update_cue",
      target_exercise: exercise,
      from: "常规动作 cue",
      to: "先降重练路径，再恢复正式组",
      reason: "用户表示不会做或不确定动作，需要先给低风险执行提示。",
      next_instruction: "下一组用热身重量做 6-8 次找动作；确认路径稳定后再回到正式重量。"
    },
    quick_actions: QUICK_ACTIONS
  };
}

function unstableMovementOutput(input: HermesMessage): HermesOutput {
  const exercise = currentExerciseName(input);
  return {
    type: "plan_patch",
    chat_message: [
      `收到，**${exercise}** 感觉不稳时先不加重量。`,
      "下一组把动作幅度缩小一点，速度放慢，先让身体路径稳定下来。",
      "如果不稳来自关节疼痛、头晕或明显失控，就停止这个动作，换更稳定的替代动作。"
    ].join("\n\n"),
    patch: {
      operation: "update_cue",
      target_exercise: exercise,
      from: "常规动作执行",
      to: "降速、缩小幅度、优先稳定路径",
      reason: "用户反馈动作不稳，优先处理技术和风险，再考虑负荷。",
      next_instruction: "下一组降重或保持重量但放慢；如果仍不稳，改用替代动作。"
    },
    quick_actions: QUICK_ACTIONS
  };
}

function reviewOutput(input: HermesMessage): HermesOutput {
  const cards = input.recent_training_cards || [];
  const targetDate = input.time_context.target_date;
  const isSeriesReview = /前几天|这几天|最近|系列|一整个|这一整个/.test(input.raw_text);
  const targetMatches = isSeriesReview ? [] : cards.filter((card) => card.date === targetDate);
  const picked = targetMatches.length ? targetMatches : cards.slice(0, 3);
  const sessions = picked.map((card) => ({
    date: card.date,
    theme: card.theme,
    summary: `${card.date} ${card.theme}，完成 ${card.actual_completed?.length || 0} 项，调整 ${card.adjustments?.length || 0} 项。`,
    highlights: [
      ...(((card as any).performance_notes as unknown[]) || []),
      ...(card.actual_completed || []).slice(0, 2).map((item) => typeof item === "string" ? item : JSON.stringify(item))
    ].slice(0, 3),
    issues: [
      ...(card.body_feedback || []),
      ...(card.unfinished_items || [])
    ].slice(0, 3).map((item) => typeof item === "string" ? item : JSON.stringify(item))
  }));
  return {
    type: "training_review",
    chat_message: picked.length
      ? `已按 ${input.time_context.target_date_label}（${targetDate}）和最近训练记录做复盘，没有新增训练卡。`
      : "当前没有可复盘的训练卡片。先补录或完成一次训练后再复盘。",
    review_card: {
      title: picked.length ? "训练复盘" : "训练复盘：暂无记录",
      date_range: {
        from: picked.at(-1)?.date,
        to: picked[0]?.date,
        label: targetMatches.length ? input.time_context.target_date_label : "最近训练"
      },
      scope: targetMatches.length ? "single_day" : "recent_series",
      referenced_cards: picked.map((card) => card.id || card.date),
      sessions,
      patterns: picked.length ? ["复盘优先读取历史训练卡，不写入新的完成记录。"] : [],
      risks: picked.flatMap((card) => card.pain_or_discomfort || []).slice(0, 3).map((item) => String(item)),
      next_actions: picked.length ? ["根据复盘结果决定下一次训练方向；如有疼痛或异常疲劳，先降低强度。"] : ["先补录目标日期训练卡。"]
    },
    quick_actions: QUICK_ACTIONS
  };
}

function trainingCardOutput(input: HermesMessage): HermesOutput {
  const time = input.time_context;
  return {
    type: "training_card",
    chat_message: `已生成 ${time.target_date_label}（${time.target_date}）的训练卡片。`,
    training_card: {
      date: time.target_date,
      timezone: time.timezone,
      date_label: time.target_date_label,
      completed_at: time.now_iso,
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

function outputForText(input: HermesMessage): HermesOutput {
  const text = input.raw_text;
  const time = input.time_context;

  if (/(复盘|回顾|分析|看看).*(训练|记录)|(?:前几天|这几天|最近|某一天|5月\d{1,2}日|20\d{2}-\d{1,2}-\d{1,2}).*(训练|记录).*(复盘|总结|回顾|分析)/.test(text)) {
    return reviewOutput(input);
  }

  if (
    /该练什么|今天训练|明天.*训练|明天.*练|后天.*训练|后天.*练|帮我安排|训练计划|今天想练|想练(?:胸|背|腿|肩|下肢|上肢)|今天.*练(?:胸|背|腿|肩|下肢|上肢)/.test(text) ||
    time.temporal_intent === "future_planning"
  ) {
    const plan = defaultPlan(input);
    return {
      type: "training_plan",
      chat_message: `${time.target_date_label}（${time.target_date}）已按动作选择流程生成：${plan.title}。计划已经整理成卡片。`,
      plan_card: plan,
      quick_actions: QUICK_ACTIONS
    };
  }

  if (/练完|训练结束|总结|补录|回填|补.*训练|前天.*练|两天前.*练|前两天.*练/.test(text) || time.temporal_intent === "backfill_training_log") {
    return trainingCardOutput(input);
  }

  if (/(不太喜欢|不喜欢|不爱|讨厌|不想做|默认避免|挺喜欢|很喜欢|喜欢|可以接受|愿意做|想做|不是不喜欢|没有不喜欢)/.test(text)) {
    return {
      type: "plan_patch",
      chat_message: "我已识别这是训练偏好更新。会先作为待确认 Memory 更新展示，确认后再替换旧偏好。",
      patch: {
        operation: "update_cue",
        target_exercise: input.current_session.current_exercise || "偏好记忆",
        reason: "用户表达了训练偏好变化。",
        next_instruction: "请到 Memory 展示层确认这条偏好更新；确认后后续计划会按新偏好生成。"
      },
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

  if (/太轻|太轻松|太简单|没什么重量|重量不够|还能做很多|还有余力/.test(text)) {
    return loadAdjustmentOutput(input, "up");
  }

  if (/太重|太沉|做不动|推不动|拉不动|压不住|重量太大|姿势变形/.test(text)) {
    return loadAdjustmentOutput(input, "down");
  }

  if (/加组|再来一组|还要不要继续做|还要继续吗|要不要多做/.test(text)) {
    return addSetDecisionOutput(input);
  }

  if (/不会做|不太会|不知道怎么做|看不懂|动作不懂|怎么做/.test(text)) {
    return unfamiliarExerciseOutput(input);
  }

  if (/不稳|晃|控制不住|动作乱|姿势不稳|代偿/.test(text)) {
    return unstableMovementOutput(input);
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
    chat_message: [
      `我收到了。先按 **${currentExerciseName(input)}** 的训练中反馈处理。`,
      "如果你是在说重量、动作感受、疼痛、疲劳或器械情况，我会直接按当前动作给出调整，不需要你先帮我分类。",
      "你可以继续直接说自然语言，比如“有点晃”“这个太轻”“肩前侧不舒服”“还能不能加一组”。"
    ].join("\n\n"),
    patch: {
      operation: "update_cue",
      target_exercise: currentExerciseName(input),
      reason: "输入语义不够具体，先维持当前动作并引导用户用自然语言补充训练感受。",
      next_instruction: "继续当前动作；如果重量、疼痛、疲劳或器械有变化，直接用自然语言说明即可。"
    },
    quick_actions: QUICK_ACTIONS
  };
}

export class TestHermesClient implements TestHermesClientContract {
  async sendMessage(input: HermesMessage): Promise<HermesResponse> {
    const output = outputForText(input);
    return {
      output,
      raw: output,
      provider: "hermes"
    };
  }
}
