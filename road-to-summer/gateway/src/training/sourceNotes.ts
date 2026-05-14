import type { OfficialSourceTrace, PlanCard, PlanItem, PlanSection } from "../hermes/types.ts";

function isPlanItem(item: PlanItem | string): item is PlanItem {
  return typeof item === "object" && item !== null && "exercise" in item;
}

export function sourceNoteForRole(role?: string, exercise?: string): string {
  const name = exercise || "这个动作";
  if (role === "warmup") {
    return `教练依据：这里参考 NASM OPT 的稳定耐力和动作控制思路，先用 ${name} 确认关节活动和控制质量，再进入正式训练。`;
  }
  if (role === "main") {
    return `教练依据：这里参考 ACSM 抗阻训练变量原则，把 ${name} 放在主训练，用组数、次数、RPE 和休息时间提供可追踪刺激。`;
  }
  if (role === "secondary" || role === "accessory") {
    return `教练依据：这里参考 NSCA 训练结构原则，${name} 用来补足主动作没有覆盖好的动作模式和目标肌群，不盲目堆重复动作。`;
  }
  if (role === "functional_core") {
    return `教练依据：这里参考 ACE IFT 的功能训练思路，${name} 不是为了刷疲劳，而是让核心控制服务后续动作质量。`;
  }
  if (role === "cardio" || role === "cooldown") {
    return `教练依据：这里参考 NSCA 总负荷管理和 RPE/RIR 调整原则，用 ${name} 做低强度整理，帮助恢复而不是继续增加系统疲劳。`;
  }
  return `教练依据：这个动作按目标、动作模式、器械条件和当前状态筛选；训练中再用 RPE/RIR 反馈调整下一组。`;
}

function withSectionSourceNotes(section: PlanSection): PlanSection {
  return {
    ...section,
    items: section.items.map((item) => {
      if (!isPlanItem(item)) return item;
      return {
        ...item,
        source_note: item.source_note || sourceNoteForRole(item.role, item.exercise)
      };
    })
  };
}

function chineseTrace(trace: OfficialSourceTrace): OfficialSourceTrace {
  if (/NASM/i.test(trace.framework)) {
    return {
      ...trace,
      source_location: "NASM OPT 模型页面：训练阶段从稳定耐力、力量耐力、肌肉发展到最大力量和爆发力逐步推进。",
      principle: "先判断训练阶段和动作控制，再决定强度；状态不足时先回退到稳定和控制。",
      applied_decision: trace.applied_decision && !/[A-Za-z]{8,}/.test(trace.applied_decision)
        ? trace.applied_decision
        : "本次计划先保证动作控制和可恢复性，再安排主训练刺激。",
      why_it_matters: "这样用户能看到计划不是随机按部位排，而是先选训练阶段。"
    };
  }
  if (/ACE/i.test(trace.framework)) {
    return {
      ...trace,
      source_location: "ACE IFT 模型页面：从用户能力、偏好、信心、环境和坚持度出发做训练进阶。",
      principle: "计划要从用户当下可执行的条件出发，而不是照搬模板。",
      applied_decision: trace.applied_decision && !/[A-Za-z]{8,}/.test(trace.applied_decision)
        ? trace.applied_decision
        : "本次动作优先匹配公寓健身房、器械限制和用户偏好。",
      why_it_matters: "这能提高计划真实执行的概率。"
    };
  }
  if (/NSCA/i.test(trace.framework)) {
    return {
      ...trace,
      source_location: "NSCA 训练频率和计划设计资料：训练频率受动作选择、肌群安排、训练量、强度、训练状态和压力影响。",
      principle: "先看最近训练和总负荷，再决定今天是否重复某个肌群或动作模式。",
      applied_decision: trace.applied_decision && !/[A-Za-z]{8,}/.test(trace.applied_decision)
        ? trace.applied_decision
        : "本次计划根据最近训练记录调整主训练方向和训练量。",
      why_it_matters: "这解释了为什么刚练过的部位不会被机械重复安排。"
    };
  }
  if (/ACSM/i.test(trace.framework)) {
    return {
      ...trace,
      source_location: "ACSM 抗阻训练指南更新：不同目标需要匹配不同训练变量，并强调个体化和一致性。",
      principle: "把训练目标映射到组数、次数、强度、休息和速度意图等变量。",
      applied_decision: trace.applied_decision && !/[A-Za-z]{8,}/.test(trace.applied_decision)
        ? trace.applied_decision
        : "本次计划用明确的组数、次数、RPE 和休息服务当前目标。",
      why_it_matters: "这让训练变量有依据，而不是只写一个动作名称。"
    };
  }
  if (/RPE|RIR/i.test(trace.framework)) {
    return {
      ...trace,
      source_location: "NSCA 关于 RPE/RIR 和自我调节的资料：训练变量可以根据当天表现、疲劳和剩余次数感调整。",
      principle: "根据即时表现调整重量、次数、组数、休息或动作选择。",
      applied_decision: trace.applied_decision && !/[A-Za-z]{8,}/.test(trace.applied_decision)
        ? trace.applied_decision
        : "每个动作都提供下一组调整规则，训练中按反馈改。",
      why_it_matters: "这避免计划死板执行，也避免用户一说累就直接结束。"
    };
  }
  return trace;
}

export function withPlanSourceNotes(plan: PlanCard): PlanCard {
  return {
    ...plan,
    sections: plan.sections.map(withSectionSourceNotes),
    official_source_trace: plan.official_source_trace?.map(chineseTrace)
  };
}

export function coachPlanMessage(message: string, plan: PlanCard): string {
  const alreadyCoachLike = /NSCA|ACSM|NASM|ACE|RPE|RIR|教练依据/.test(message);
  if (alreadyCoachLike) return message;
  const firstMain = plan.sections
    .flatMap((section) => section.items)
    .find((item) => isPlanItem(item) && item.role === "main");
  const exercise = isPlanItem(firstMain) ? firstMain.exercise : "主训练动作";
  return [
    message,
    "",
    `教练解释：今天我不是只按“想练哪里”排动作，而是先看最近训练和恢复窗口。这里用 NSCA 的训练频率/总负荷原则决定今天是否该重复某个肌群；再用 ACSM 抗阻训练变量原则给 ${exercise} 配组数、次数、RPE 和休息。每个动作下面我也会直接写清楚它来自哪个训练原则，以及下一组该怎么调整。`
  ].join("\n");
}
