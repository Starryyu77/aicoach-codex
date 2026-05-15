import type { CurrentSession, HermesMessage, OfficialSourceTrace, PlanCard, PlanItem, TrainingCard } from "../hermes/types.ts";
import { inferMuscles } from "./planQuality.ts";
import { sourceNoteForRole, withPlanSourceNotes } from "./sourceNotes.ts";

export type ExerciseRole = "warmup" | "main" | "secondary" | "accessory" | "functional_core" | "cardio" | "cooldown";
export type TargetFocus = "chest" | "back" | "lower" | "shoulders" | "recovery" | "general";
export type ReadinessLevel = "green" | "yellow" | "orange" | "red";

export type ExerciseDefinition = {
  exercise: string;
  role: ExerciseRole[];
  movement_pattern: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  adaptations: string[];
  risk_flags: string[];
  cue: string;
  common_mistakes: string[];
  substitutions: string[];
  selection_reason: string;
  adjustment_rule: string;
};

export type ExerciseSelectionCandidate = {
  exercise: string;
  role: ExerciseRole;
  movement_pattern: string;
  primary_muscles: string[];
  equipment: string[];
  score: number;
  selection_reason: string;
  substitutions: string[];
};

export type ExerciseSelectionContext = {
  target_focus: TargetFocus;
  target_adaptation: string;
  readiness: {
    level: ReadinessLevel;
    reasons: string[];
  };
  movement_priorities: string[];
  constraints: string[];
  candidate_roles: Array<{
    role: ExerciseRole;
    candidates: ExerciseSelectionCandidate[];
  }>;
  programming_rules: string[];
};

const EXERCISES: ExerciseDefinition[] = [
  {
    exercise: "肩胛俯卧撑",
    role: ["warmup", "functional_core"],
    movement_pattern: "肩胛控制 / 闭链推准备",
    primary_muscles: ["前锯肌", "肩胛稳定"],
    secondary_muscles: ["胸部", "核心"],
    equipment: ["自重"],
    adaptations: ["功能控制", "胸肩热身"],
    risk_flags: ["腕关节不适", "肩前侧不适"],
    cue: "手臂基本伸直，只让肩胛骨前后滑动，像把地面轻轻推远。",
    common_mistakes: ["做成普通俯卧撑", "耸肩", "塌腰"],
    substitutions: ["墙面肩胛俯卧撑", "弹力带前锯肌推"],
    selection_reason: "胸部或肩部训练前用于打开肩胛控制，不消耗主训练体力，也避免热身和工作组重复同一个动作。",
    adjustment_rule: "肩前侧紧时缩短幅度，先做墙面版本。"
  },
  {
    exercise: "哑铃平板卧推",
    role: ["main"],
    movement_pattern: "水平推",
    primary_muscles: ["胸部"],
    secondary_muscles: ["三头", "肩前束"],
    equipment: ["哑铃", "卧推凳"],
    adaptations: ["增肌", "力量", "可渐进负荷"],
    risk_flags: ["肩前侧紧张时控制幅度"],
    cue: "肩胛稳定，手肘约 45-60 度，下放可控，不要耸肩。",
    common_mistakes: ["下放过快", "肩前顶", "腰部过度反弓"],
    substitutions: ["哑铃地板卧推", "器械推胸", "俯卧撑变式"],
    selection_reason: "胸部增肌时比普通俯卧撑更容易提供可记录的机械张力，适合公寓有哑铃和卧推凳的场景。",
    adjustment_rule: "肩前侧不适时改中立握、缩小幅度或换哑铃地板卧推。"
  },
  {
    exercise: "上斜哑铃卧推",
    role: ["secondary"],
    movement_pattern: "上斜推",
    primary_muscles: ["上胸", "胸部"],
    secondary_muscles: ["肩前束", "三头"],
    equipment: ["哑铃", "卧推凳"],
    adaptations: ["增肌", "角度补充"],
    risk_flags: ["肩前侧紧张时降低角度"],
    cue: "凳子不要太陡，胸口向上，手肘别张太开。",
    common_mistakes: ["凳子角度过高", "耸肩", "手腕后折"],
    substitutions: ["上斜俯卧撑", "哑铃地板卧推"],
    selection_reason: "补平板卧推没有覆盖好的上胸角度，避免整节课只有一个推举方向。",
    adjustment_rule: "肩前侧紧时降低凳角或改上斜俯卧撑。"
  },
  {
    exercise: "节奏俯卧撑",
    role: ["accessory", "warmup"],
    movement_pattern: "闭链水平推",
    primary_muscles: ["胸部"],
    secondary_muscles: ["三头", "核心", "前锯肌"],
    equipment: ["自重"],
    adaptations: ["功能控制", "胸部补量"],
    risk_flags: ["腕关节不适", "肩前侧不适"],
    cue: "身体像一块板，慢慢下放，推起时把地面推远。",
    common_mistakes: ["塌腰", "耸肩", "只用手臂硬推"],
    substitutions: ["上斜俯卧撑", "把手俯卧撑", "哑铃地板卧推"],
    selection_reason: "作为收尾能补胸部训练量，同时加入闭链肩胛控制和核心抗伸展。",
    adjustment_rule: "太轻时放慢离心或底部停顿；肩腕不适时改上斜。"
  },
  {
    exercise: "哑铃肩推",
    role: ["main", "secondary"],
    movement_pattern: "垂直推",
    primary_muscles: ["肩部"],
    secondary_muscles: ["三头", "核心"],
    equipment: ["哑铃"],
    adaptations: ["肩部增肌", "力量", "功能控制"],
    risk_flags: ["肩前侧紧张时降低重量或改地雷管推"],
    cue: "肋骨别外翻，哑铃沿耳朵两侧上推，顶端不要耸肩顶住。",
    common_mistakes: ["腰后仰", "耸肩", "手肘过度外张"],
    substitutions: ["单臂哑铃肩推", "半跪姿推举", "上斜俯卧撑"],
    selection_reason: "肩部训练需要一个可追踪负荷的主推动作，但要用可控重量避免肩前侧压力过大。",
    adjustment_rule: "肩前侧紧时改单臂或半跪姿，RPE 控制在 6-7。"
  },
  {
    exercise: "哑铃侧平举",
    role: ["secondary", "accessory"],
    movement_pattern: "肩外展",
    primary_muscles: ["肩中束"],
    secondary_muscles: ["上斜方"],
    equipment: ["哑铃"],
    adaptations: ["肩部塑形", "局部增肌"],
    risk_flags: ["耸肩代偿"],
    cue: "手肘带着哑铃向两侧打开，像把水轻轻倒出去，不要耸肩抢动作。",
    common_mistakes: ["用身体甩", "耸肩", "抬得过高"],
    substitutions: ["弹力带侧平举", "机械侧平举"],
    selection_reason: "肩部塑形时能直接补肩中束训练量，疲劳成本低于继续重推。",
    adjustment_rule: "太轻先放慢离心；耸肩时降重并停在肩高以下。"
  },
  {
    exercise: "俯身反向飞鸟",
    role: ["accessory"],
    movement_pattern: "水平外展",
    primary_muscles: ["后束"],
    secondary_muscles: ["中下斜方", "肩胛稳定"],
    equipment: ["哑铃"],
    adaptations: ["肩部平衡", "功能控制"],
    risk_flags: ["下背疲劳时胸托完成"],
    cue: "胸口稳定，手肘向两侧打开，像展开后背，不要用腰甩。",
    common_mistakes: ["身体借力", "耸肩", "手臂弯曲变化太大"],
    substitutions: ["Face Pull", "胸托反向飞鸟", "Y-T-W"],
    selection_reason: "补后束和肩胛控制，避免肩部训练只做前侧推举和侧平举。",
    adjustment_rule: "下背累时改胸托反向飞鸟或 Face Pull。"
  },
  {
    exercise: "高位下拉",
    role: ["main"],
    movement_pattern: "垂直拉",
    primary_muscles: ["背阔"],
    secondary_muscles: ["二头", "下斜方"],
    equipment: ["高位下拉"],
    adaptations: ["背部增肌", "垂直拉能力"],
    risk_flags: ["肩不适时避免耸肩硬拉"],
    cue: "先把肩膀放低，再用手肘往裤兜方向拉。",
    common_mistakes: ["耸肩", "身体后仰过多", "用手腕硬拽"],
    substitutions: ["弹力带下拉", "单臂哑铃 Pullover", "引体向上辅助"],
    selection_reason: "当目标是背阔宽度时，垂直拉比单纯划船更直接。",
    adjustment_rule: "感觉不到背时先降重，慢离心，底部停 1 秒。"
  },
  {
    exercise: "胸托哑铃划船",
    role: ["main", "secondary"],
    movement_pattern: "水平拉",
    primary_muscles: ["中背", "背部"],
    secondary_muscles: ["后束", "二头"],
    equipment: ["哑铃", "卧推凳"],
    adaptations: ["背部增肌", "肩胛后缩"],
    risk_flags: ["胸托角度不合适时调整凳子"],
    cue: "胸贴稳，手肘往身体后侧收，不要甩重量。",
    common_mistakes: ["耸肩", "下背代偿", "顶峰不停顿"],
    substitutions: ["单臂哑铃划船", "坐姿划船", "器械划船"],
    selection_reason: "高位下拉或绳索被占用时，能保留背部拉力刺激并降低下背负担。",
    adjustment_rule: "动作不顺时先降重，顶峰停 1 秒。"
  },
  {
    exercise: "Face Pull",
    role: ["accessory"],
    movement_pattern: "水平外展 / 肩胛控制",
    primary_muscles: ["后束", "肩胛稳定"],
    secondary_muscles: ["中下斜方", "外旋肌群"],
    equipment: ["绳索", "弹力带"],
    adaptations: ["功能控制", "肩部平衡"],
    risk_flags: ["绳索高度不合适时不要硬做"],
    cue: "拉向脸部两侧，手肘打开，最后像做一个双臂展示。",
    common_mistakes: ["耸肩", "用腰后仰", "手腕乱甩"],
    substitutions: ["反向飞鸟", "Y-T-W", "弹力带拉开"],
    selection_reason: "用于补后束和肩胛控制，尤其适合推拉训练后的肩部平衡。",
    adjustment_rule: "绳索高度不合适时换反向飞鸟或 Y-T-W。"
  },
  {
    exercise: "哑铃高脚杯深蹲",
    role: ["main", "secondary"],
    movement_pattern: "膝主导",
    primary_muscles: ["股四头肌", "下肢"],
    secondary_muscles: ["臀部", "核心"],
    equipment: ["哑铃"],
    adaptations: ["下肢增肌", "动作控制"],
    risk_flags: ["膝痛时控制深度"],
    cue: "抱住哑铃，膝盖跟脚尖方向一致，躯干稳定。",
    common_mistakes: ["膝内扣", "脚跟抬起", "下放失控"],
    substitutions: ["分腿蹲", "腿举", "箱式深蹲"],
    selection_reason: "在公寓健身房里是高收益膝主导动作，技术门槛低于杠铃深蹲。",
    adjustment_rule: "膝不适时缩小幅度或换分腿蹲/箱式深蹲。"
  },
  {
    exercise: "哑铃罗马尼亚硬拉",
    role: ["main", "secondary"],
    movement_pattern: "髋主导",
    primary_muscles: ["腘绳肌", "臀部"],
    secondary_muscles: ["下背", "核心"],
    equipment: ["哑铃"],
    adaptations: ["后链增肌", "髋铰链"],
    risk_flags: ["下背疲劳", "腿后侧明显酸痛"],
    cue: "髋往后坐，背保持长，哑铃贴近腿走。",
    common_mistakes: ["弯腰找深度", "膝盖锁死", "哑铃离身体太远"],
    substitutions: ["臀桥", "腿弯举", "单腿 RDL"],
    selection_reason: "目标是臀腿后链和髋主导能力时，比深蹲更直接。",
    adjustment_rule: "下背或腿后侧状态差时降重或改臀桥。"
  },
  {
    exercise: "单腿臀桥",
    role: ["accessory", "functional_core"],
    movement_pattern: "单侧髋伸",
    primary_muscles: ["臀部"],
    secondary_muscles: ["腘绳肌", "核心"],
    equipment: ["自重", "瑜伽垫"],
    adaptations: ["臀部控制", "单侧稳定"],
    risk_flags: ["腰部代偿"],
    cue: "先收紧肋骨，再把髋推上去，感受臀部顶峰收缩。",
    common_mistakes: ["腰顶起来", "骨盆旋转", "腿后侧抽筋"],
    substitutions: ["臀桥", "Fire Hydrant", "臀推"],
    selection_reason: "适合发现左右臀部控制差异时使用，疲劳成本低。",
    adjustment_rule: "腿后侧抢感时降低高度或换 Fire Hydrant。"
  },
  {
    exercise: "Fire Hydrant",
    role: ["accessory", "functional_core"],
    movement_pattern: "髋外展 / 髋稳定",
    primary_muscles: ["臀中肌"],
    secondary_muscles: ["核心"],
    equipment: ["瑜伽垫"],
    adaptations: ["髋稳定", "臀部控制"],
    risk_flags: ["髂腰肌代偿"],
    cue: "骨盆别歪，像把膝盖向侧后方打开。",
    common_mistakes: ["身体侧倒", "腰转动", "抬太高"],
    substitutions: ["站姿扶墙髋外展", "蚌式", "侧向走"],
    selection_reason: "当侧卧髋外展代偿明显时，常比继续硬做侧卧外展更稳定。",
    adjustment_rule: "髂腰肌抢感时降低幅度，控制骨盆。"
  },
  {
    exercise: "Dead Bug",
    role: ["functional_core"],
    movement_pattern: "核心抗伸展",
    primary_muscles: ["核心"],
    secondary_muscles: ["髋屈肌控制"],
    equipment: ["瑜伽垫"],
    adaptations: ["功能控制", "恢复"],
    risk_flags: ["腰拱起"],
    cue: "腰背轻轻贴住地面，慢慢伸手伸腿，保持呼吸。",
    common_mistakes: ["憋气", "腰拱", "动作太快"],
    substitutions: ["鸟狗", "平板支撑"],
    selection_reason: "低疲劳地补核心抗伸展，适合几乎所有训练日。",
    adjustment_rule: "腰拱起时缩短动作范围。"
  },
  {
    exercise: "Pallof Press",
    role: ["functional_core"],
    movement_pattern: "核心抗旋转",
    primary_muscles: ["核心"],
    secondary_muscles: ["肩胛稳定"],
    equipment: ["绳索", "弹力带"],
    adaptations: ["功能控制"],
    risk_flags: ["绳索不可用"],
    cue: "身体别被拉转，手推出去后停一秒。",
    common_mistakes: ["身体旋转", "耸肩", "憋气"],
    substitutions: ["侧平板", "Dead Bug", "Suitcase Carry"],
    selection_reason: "用于补抗旋转能力，避免核心只做卷腹。",
    adjustment_rule: "绳索不可用时换弹力带或侧平板。"
  },
  {
    exercise: "划船机或快走",
    role: ["cardio"],
    movement_pattern: "低强度心肺",
    primary_muscles: ["心肺"],
    secondary_muscles: ["全身"],
    equipment: ["划船机", "跑步机", "自重"],
    adaptations: ["心肺", "恢复"],
    risk_flags: ["下肢酸痛时降低强度"],
    cue: "保持能完整说话的强度，不追求冲刺。",
    common_mistakes: ["恢复日做太猛", "腿不适还硬拉划船机"],
    substitutions: ["室内轻松步行", "单车"],
    selection_reason: "恢复或功能维护日用于促进血流，疲劳成本低。",
    adjustment_rule: "腿后侧不适时改快走或停止。"
  },
  {
    exercise: "全身活动度循环",
    role: ["main", "warmup"],
    movement_pattern: "活动度 / 技术控制",
    primary_muscles: ["全身"],
    secondary_muscles: ["髋", "胸椎", "肩胛"],
    equipment: ["自重"],
    adaptations: ["恢复", "功能控制"],
    risk_flags: ["疼痛时缩小幅度"],
    cue: "动作范围舒服即可，不追求酸胀和泵感。",
    common_mistakes: ["做成高强度循环", "追求拉痛"],
    substitutions: ["瑜伽流动", "猫牛式 + 胸椎旋转"],
    selection_reason: "当最近上肢和下肢都刚训练过时，用它保留训练价值并降低恢复压力。",
    adjustment_rule: "任何动作出现疼痛就缩小幅度或跳过。"
  }
];

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function detectTargetFocus(rawText: string): TargetFocus {
  if (/恢复|放松|活动度|别太猛|轻松/.test(rawText)) return "recovery";
  if (/胸|卧推|俯卧撑|推胸/.test(rawText)) return "chest";
  if (/背|下拉|划船|背阔|拉/.test(rawText)) return "back";
  if (/腿|下肢|臀|深蹲|硬拉|rdl/i.test(rawText)) return "lower";
  if (/肩|侧平举|后束|推举/.test(rawText)) return "shoulders";
  return "general";
}

function detectReadiness(rawText: string): ExerciseSelectionContext["readiness"] {
  const reasons: string[] = [];
  const painNegated = /无疼|无痛|无不适|没有疼|没有痛|没有不适|不疼|不痛|疼痛\s*0|疼痛\s*无/.test(rawText);
  if (!painNegated && /疼|刺痛|麻|胸闷|头晕|放射痛/.test(rawText)) {
    return { level: "red", reasons: ["出现疼痛或高风险症状，需要暂停常规高强度训练。"] };
  }
  if (/疲劳\s*(7|8|9|10)|7\/10|8\/10|9\/10|睡眠.*[0-5]\s*小时|睡.*[0-5]\s*小时|很累|特别累/.test(rawText)) {
    reasons.push("疲劳高或睡眠差，降低系统疲劳和接近力竭训练。");
    return { level: "orange", reasons };
  }
  if (/疲劳\s*(5|6)|5\/10|6\/10|有点累|一般|酸/.test(rawText)) {
    reasons.push("状态一般，保留主训练但控制总量和 RPE。");
    return { level: "yellow", reasons };
  }
  return { level: "green", reasons: ["未发现明显疲劳或疼痛信号，可正常训练。"] };
}

function availableEquipment(rawText: string, session?: CurrentSession): string[] {
  const text = `${rawText}\n${session?.location || ""}`;
  const equipment = ["自重", "瑜伽垫", "哑铃", "卧推凳"];
  if (/高位下拉|下拉/.test(text)) equipment.push("高位下拉");
  if (/绳索|cable|大型健身房/.test(text)) equipment.push("绳索");
  if (/划船机/.test(text)) equipment.push("划船机");
  if (/跑步机/.test(text)) equipment.push("跑步机");
  if (/只有哑铃/.test(text)) return ["自重", "哑铃"];
  return unique(equipment);
}

function movementPriorities(focus: TargetFocus, readiness: ReadinessLevel): string[] {
  if (readiness === "red") return ["低风险恢复", "呼吸", "温和活动度"];
  if (readiness === "orange" || focus === "recovery") return ["活动度", "核心控制", "低强度心肺"];
  if (focus === "chest") return ["水平推", "上斜推", "闭链推", "核心抗伸展"];
  if (focus === "back") return ["垂直拉", "水平拉", "肩胛控制", "核心抗伸展"];
  if (focus === "lower") return ["膝主导", "髋主导", "单侧髋稳定", "核心抗旋转"];
  if (focus === "shoulders") return ["垂直推或低风险替代", "肩外展", "后束", "肩胛控制"];
  return ["高收益复合动作", "拉力", "核心控制", "低强度心肺"];
}

function targetAdaptation(focus: TargetFocus, readiness: ReadinessLevel): string {
  if (readiness === "red") return "风险筛查优先，暂停高强度训练";
  if (readiness === "orange" || focus === "recovery") return "恢复 / 技术控制 / 低疲劳功能维护";
  if (focus === "chest" || focus === "back" || focus === "lower" || focus === "shoulders") return "增肌塑形 + 功能性维护";
  return "全身高收益训练 + 功能性维护";
}

function recentConstraints(cards: TrainingCard[]): string[] {
  return cards.slice(0, 3).flatMap((card) => {
    const muscles = inferMuscles([
      card.theme,
      JSON.stringify(card.actual_completed || []),
      JSON.stringify(card.body_feedback || []),
      JSON.stringify(card.fatigue_notes || [])
    ].join("\n"));
    return muscles.length ? [`${card.date} ${card.theme}: 最近刺激 ${muscles.join("、")}`] : [];
  });
}

function scoreExercise(exercise: ExerciseDefinition, focus: TargetFocus, equipment: string[], readiness: ReadinessLevel): number {
  let score = 0;
  if (exercise.equipment.some((item) => equipment.includes(item))) score += 2;
  if (focus === "chest" && exercise.primary_muscles.some((item) => /胸|上胸/.test(item))) score += 4;
  if (focus === "back" && exercise.primary_muscles.some((item) => /背|背阔|中背/.test(item))) score += 4;
  if (focus === "lower" && exercise.primary_muscles.some((item) => /股四|腘绳|臀|下肢/.test(item))) score += 4;
  if (focus === "recovery" && exercise.adaptations.some((item) => /恢复|功能控制|心肺/.test(item))) score += 4;
  if (focus === "general" && exercise.adaptations.some((item) => /功能控制|背部增肌|心肺/.test(item))) score += 2;
  if (readiness === "orange" && exercise.adaptations.some((item) => /恢复|功能控制/.test(item))) score += 3;
  if (readiness === "orange" && exercise.role.includes("main") && !exercise.adaptations.includes("恢复")) score -= 2;
  return score;
}

function candidatesForRole(
  role: ExerciseRole,
  focus: TargetFocus,
  equipment: string[],
  readiness: ReadinessLevel
): ExerciseSelectionCandidate[] {
  return EXERCISES
    .filter((exercise) => exercise.role.includes(role))
    .map((exercise) => ({
      exercise: exercise.exercise,
      role,
      movement_pattern: exercise.movement_pattern,
      primary_muscles: exercise.primary_muscles,
      equipment: exercise.equipment,
      score: scoreExercise(exercise, focus, equipment, readiness),
      selection_reason: exercise.selection_reason,
      substitutions: exercise.substitutions
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export function buildExerciseSelectionContext(input: {
  rawText: string;
  currentSession?: CurrentSession;
  recentTrainingCards?: TrainingCard[];
}): ExerciseSelectionContext {
  const readiness = detectReadiness(input.rawText);
  const focus = readiness.level === "orange" || readiness.level === "red"
    ? "recovery"
    : detectTargetFocus(input.rawText);
  const equipment = availableEquipment(input.rawText, input.currentSession);
  const roles: ExerciseRole[] = focus === "recovery"
    ? ["warmup", "main", "functional_core", "cardio", "cooldown"]
    : ["warmup", "main", "secondary", "accessory", "functional_core", "cardio"];
  return {
    target_focus: focus,
    target_adaptation: targetAdaptation(focus, readiness.level),
    readiness,
    movement_priorities: movementPriorities(focus, readiness.level),
    constraints: unique([
      ...recentConstraints(input.recentTrainingCards || []),
      readiness.level !== "green" ? `准备度 ${readiness.level}: ${readiness.reasons.join(" ")}` : "",
      includesAny(input.rawText, ["肩前侧", "肩膀"]) ? "肩前侧紧张：推类动作控制幅度和 RPE" : "",
      includesAny(input.rawText, ["只有哑铃"]) ? "器械限制：只有哑铃，优先哑铃/自重动作" : ""
    ]),
    candidate_roles: roles.map((role) => ({
      role,
      candidates: candidatesForRole(role, focus, equipment, readiness.level)
    })),
    programming_rules: [
      "先判断目标适应，再选择动作模式。",
      "每个动作必须有角色、选择理由、替代动作和调整规则。",
      "主动作优先满足目标匹配、可渐进负荷、技术可控和关节友好。",
      "疲劳高时优先稳定动作、活动度、低强度心肺和核心控制。",
      "器械受限时先保持训练目标，再保持动作模式和目标肌群偏向。"
    ]
  };
}

function byName(name: string): ExerciseDefinition {
  const exercise = EXERCISES.find((item) => item.exercise === name);
  if (!exercise) throw new Error(`Unknown exercise: ${name}`);
  return exercise;
}

function toPlanItem(name: string, role: ExerciseRole, sets: string, reps: string, intensity: string, rest: string): PlanItem {
  const exercise = byName(name);
  return {
    exercise: exercise.exercise,
    role,
    movement_pattern: exercise.movement_pattern,
    primary_muscles: exercise.primary_muscles,
    selection_reason: exercise.selection_reason,
    source_note: sourceNoteForRole(role, exercise.exercise),
    common_mistakes: exercise.common_mistakes,
    adjustment_rule: exercise.adjustment_rule,
    sets,
    reps,
    intensity,
    rest,
    cue: exercise.cue,
    substitutions: exercise.substitutions
  };
}

function officialSourceTrace(context: ExerciseSelectionContext, mode: "standard" | "recovery"): OfficialSourceTrace[] {
  const isRecovery = mode === "recovery";
  return [
    {
      framework: "ACE IFT",
      model: "ACE Integrated Fitness Training Model",
      official_source: "ACE IFT Model",
      source_url: "https://www.acefitness.org/fitness-certifications/personal-trainer-certification/ace-ift-model.aspx",
      source_location: "ACE IFT 模型页面：强调从用户能力、环境、信心、偏好和坚持度出发做训练进阶。",
      principle: "计划要从用户当下可执行的条件出发，而不是照搬模板。",
      applied_decision: isRecovery
        ? "目标日期准备度有限，所以训练保持简单可执行，不强行做复杂分化。"
        : "本次计划优先选择公寓健身房可重复、可记录的动作。",
      why_it_matters: "这样计划更像真实教练按你当下条件安排，而不是套模板。"
    },
    {
      framework: "NASM OPT",
      model: "Optimum Performance Training Model",
      official_source: "NASM OPT Model",
      source_url: "https://www.nasm.org/certified-personal-trainer/the-opt-model",
      source_location: "NASM OPT 模型页面：训练阶段从稳定耐力、力量耐力、肌肉发展到最大力量和爆发力逐步推进。",
      principle: "先判断训练阶段，再决定强度；状态或技术不够时先回到稳定和控制。",
      applied_decision: isRecovery
        ? "目标日期不适合硬做高刺激增肌，所以回退到稳定、控制和恢复。"
        : `本次计划偏向 ${context.target_adaptation}，不做最大力量或爆发力取向。`,
      why_it_matters: "这解释了为什么先选训练阶段，而不是只选一个身体部位。"
    },
    {
      framework: "NSCA Program Design",
      model: "NSCA program design / Essentials of Personal Training",
      official_source: "NSCA Determination of Resistance Training Frequency",
      source_url: "https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/",
      source_location: "NSCA 训练频率资料：训练频率受动作选择、每次训练肌群、训练量、强度、训练状态和压力影响。",
      principle: "先看最近训练、压力、动作选择和训练量强度，再决定频率和恢复。",
      applied_decision: isRecovery
        ? "最近或当前恢复约束让本次总负荷降低，转向活动度、核心和低强度心肺。"
        : "本次按热身、主动作、次主动作、辅助和功能核心排序，并检查最近训练冲突。",
      why_it_matters: "这让用户能看到为什么刚练过的肌群不会被机械重复安排。"
    },
    {
      framework: "ACSM 2026",
      model: "Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults",
      official_source: "ACSM 2026 Resistance Training Guidelines Update",
      source_url: "https://acsm.org/resistance-training-guidelines-update-2026/",
      source_location: "ACSM 2026 抗阻训练指南更新：力量、肌肥大、爆发力和身体功能等结果需要匹配训练变量，并强调个体化和一致性。",
      principle: "把目标结果映射到重量、训练量、休息、速度意图和可持续执行。",
      applied_decision: isRecovery
        ? "目标日期的训练目标是恢复和身体功能，所以强度和训练量都控制得更低。"
        : `本次组数、次数、RPE 和休息都服务于 ${context.target_adaptation}。`,
      why_it_matters: "这让训练变量和训练目标直接对应，而不是随便写。"
    },
    {
      framework: "RPE/RIR Autoregulation",
      model: "Repetitions in Reserve and readiness-based autoregulation",
      official_source: "NSCA Coach: Using Intensity Based on Sets and Repetitions",
      source_url: "https://www.nsca.com/education/articles/nsca-coach/using-intensity-based-on-sets-and-repetitions-over-50-years-of-experience-a-brief-overview-of-load-setting-and-programming-strategy/",
      source_location: "NSCA 关于自我调节和 RIR 的资料：训练变量可以根据当天表现、疲劳、准备度和剩余次数感调整。",
      principle: "根据即时表现和主观强度调整重量、次数、组数、休息或动作选择。",
      applied_decision: "每个动作都带下一组调整规则，训练反馈可以改变下一组，不需要推翻整份计划。",
      why_it_matters: "用户能看到为什么说累、太轻、感觉不到目标肌肉时，计划会被动态调整。"
    }
  ];
}

function recoveryPlan(input: HermesMessage, context: ExerciseSelectionContext): PlanCard {
  const time = input.time_context;
  return withPlanSourceNotes({
    title: `${time.target_date} 恢复与功能维护`,
    target_date: time.target_date,
    date_label: undefined,
    timezone: time.timezone,
    duration: "25-40 分钟",
    goal: context.target_adaptation,
    sections: [
      {
        name: "状态检查",
        items: [
          "先确认疼痛、麻木、头晕、胸闷等停止信号；有异常则不进入训练。",
          toPlanItem("全身活动度循环", "warmup", "2", "6-8 分钟", "RPE 2-3", "30 秒")
        ]
      },
      {
        name: "主训练",
        items: [
          toPlanItem("全身活动度循环", "main", "3", "髋铰链 8 次 + 胸椎旋转 6 次/侧 + 猫牛式 6 次", "RPE 3-4", "45 秒"),
          toPlanItem("Dead Bug", "functional_core", "3", "每侧 8-10 次", "可控", "45 秒")
        ]
      },
      {
        name: "低强度心肺",
        items: [toPlanItem("划船机或快走", "cardio", "1", "8-12 分钟", "RPE 3-4", "-")]
      }
    ],
    risk_notes: context.constraints,
    reasoning: [
      "动作选择流程：目标 -> 目标适应 -> 动作模式 -> 候选动作 -> 个体过滤 -> 动作角色。",
      `${time.target_date} 判断为 ${context.target_adaptation}，因此不追求高刺激，优先活动度、核心控制和低强度心肺。`
    ].join("\n"),
    framework_trace: [
      "ACE IFT: 根据用户当前疲劳/睡眠/疼痛语义优先保证可执行性和安全边界。",
      "NASM OPT: 回退到 stabilization_endurance / recovery 取向，先恢复控制质量。",
      "NSCA Program Design: 降低总负荷，保留活动度、核心和低强度心肺结构。",
      "ACSM 2026: 将目标从高刺激训练变量改为身体功能、恢复和一致性。",
      "RPE/RIR Autoregulation: 使用 RPE 2-4 和疼痛停止规则作为本次调整依据。"
    ],
    official_source_trace: officialSourceTrace(context, "recovery"),
    decision_basis: [
      `目标适应：${context.target_adaptation}`,
      `动作模式：${context.movement_priorities.join(" / ")}`,
      ...context.constraints
    ],
    recent_training_summary: context.constraints.filter((item) => /^\d{4}-/.test(item)),
    quality_warnings: context.readiness.level === "green" ? [] : context.readiness.reasons
  });
}

export function composePlanFromExerciseSelection(input: HermesMessage): PlanCard {
  const context = buildExerciseSelectionContext({
    rawText: input.raw_text,
    currentSession: input.current_session,
    recentTrainingCards: input.recent_training_cards
  });
  const time = input.time_context;
  if (context.target_focus === "recovery" || context.readiness.level === "orange" || context.readiness.level === "red") {
    return recoveryPlan(input, context);
  }

  const focus = context.target_focus;
  const titleByFocus: Record<TargetFocus, string> = {
    chest: "胸部增肌 + 上肢推力控制",
    back: "背部拉力 + 肩胛控制",
    lower: "下肢力量 + 髋膝控制",
    shoulders: "肩部塑形 + 肩胛稳定",
    recovery: "恢复与功能维护",
    general: "背部拉力 + 核心稳定"
  };

  const sections = focus === "chest" ? [
    {
      name: "热身",
      items: [
        toPlanItem("肩胛俯卧撑", "warmup", "1-2", "8-10 次", "轻", "30 秒")
      ]
    },
    {
      name: "主训练",
      items: [
        toPlanItem("哑铃平板卧推", "main", "3-4", "6-10 次", "RPE 7-8", "2-3 分钟"),
        toPlanItem("上斜哑铃卧推", "secondary", "2-3", "8-12 次", "RPE 7-8", "90 秒")
      ]
    },
    {
      name: "辅助训练",
      items: [
        toPlanItem("节奏俯卧撑", "accessory", "2-3", "8-20 次", "RPE 8", "60 秒"),
        toPlanItem("Face Pull", "accessory", "2-3", "12-15 次", "RPE 6-7", "45 秒")
      ]
    },
    {
      name: "功能 / 核心",
      items: [toPlanItem("Dead Bug", "functional_core", "2-3", "每侧 8-10 次", "可控", "45 秒")]
    }
  ] : focus === "lower" ? [
    {
      name: "热身",
      items: [toPlanItem("全身活动度循环", "warmup", "1", "6-8 分钟", "轻", "30 秒")]
    },
    {
      name: "主训练",
      items: [
        toPlanItem("哑铃高脚杯深蹲", "main", "3-4", "8-12 次", "RPE 7-8", "90 秒"),
        toPlanItem("哑铃罗马尼亚硬拉", "secondary", "3", "8-10 次", "RPE 7", "90 秒")
      ]
    },
    {
      name: "辅助训练",
      items: [
        toPlanItem("单腿臀桥", "accessory", "2-3", "每侧 8-12 次", "RPE 7", "60 秒"),
        toPlanItem("Fire Hydrant", "accessory", "2", "每侧 10-12 次", "轻-中", "45 秒")
      ]
    },
    {
      name: "功能 / 核心",
      items: [toPlanItem("Dead Bug", "functional_core", "2-3", "每侧 8-10 次", "可控", "45 秒")]
    }
  ] : focus === "shoulders" ? [
    {
      name: "热身",
      items: [
        toPlanItem("肩胛俯卧撑", "warmup", "1-2", "8-10 次", "轻", "30 秒"),
        toPlanItem("Face Pull", "accessory", "1-2", "12-15 次", "RPE 5-6", "30-45 秒")
      ]
    },
    {
      name: "主训练",
      items: [
        toPlanItem("哑铃肩推", "main", "3-4", "6-10 次", "RPE 7-8", "90-120 秒"),
        toPlanItem("哑铃侧平举", "secondary", "3", "12-15 次", "RPE 7-8", "60 秒")
      ]
    },
    {
      name: "辅助训练",
      items: [
        toPlanItem("俯身反向飞鸟", "accessory", "2-3", "12-15 次", "RPE 6-7", "45-60 秒")
      ]
    },
    {
      name: "功能 / 核心",
      items: [toPlanItem("Dead Bug", "functional_core", "2-3", "每侧 8-10 次", "可控", "45 秒")]
    }
  ] : [
    {
      name: "热身",
      items: [toPlanItem("划船机或快走", "warmup", "1", "5-6 分钟", "RPE 3-4", "-")]
    },
    {
      name: "主训练",
      items: [
        toPlanItem("高位下拉", "main", "4", "8-12 次", "RPE 7-8", "90 秒"),
        toPlanItem("胸托哑铃划船", "secondary", "4", "10-12 次", "RPE 7-8", "75-90 秒")
      ]
    },
    {
      name: "辅助训练",
      items: [
        toPlanItem("Face Pull", "accessory", "3", "12-15 次", "RPE 6-7", "45-60 秒")
      ]
    },
    {
      name: "功能 / 核心",
      items: [toPlanItem("Dead Bug", "functional_core", "3", "每侧 8-10 次", "可控", "45 秒")]
    }
  ];

  return withPlanSourceNotes({
    title: `${time.target_date} ${titleByFocus[focus]}`,
    target_date: time.target_date,
    date_label: undefined,
    timezone: time.timezone,
    duration: "45-60 分钟",
    goal: context.target_adaptation,
    sections,
    risk_notes: context.constraints,
    reasoning: [
      "本计划按动作选择 Skill 生成：先确定目标适应，再匹配动作模式和候选动作，最后分配主动作、次主动作、辅助动作与功能核心。",
      `今日目标偏向：${titleByFocus[focus]}。`,
      `动作模式优先级：${context.movement_priorities.join(" / ")}。`
    ].join("\n"),
    framework_trace: [
      "ACE IFT: 结合用户目标、场地器械和偏好，优先选择可重复执行的动作。",
      `NASM OPT: 选择 ${focus === "general" ? "strength_endurance / muscle_development" : "muscle_development"} 取向，匹配当前训练目标和准备度。`,
      "NSCA Program Design: 按热身、主动作、次主动作、辅助、功能核心组织训练结构。",
      `ACSM 2026: 将 ${context.target_adaptation} 映射到可追踪组数、次数、RPE 和休息。`,
      "RPE/RIR Autoregulation: 每个动作提供下一组调整规则，训练中按表现修正。"
    ],
    official_source_trace: officialSourceTrace(context, "standard"),
    decision_basis: [
      `目标适应：${context.target_adaptation}`,
      `动作模式：${context.movement_priorities.join(" / ")}`,
      "每个动作包含角色、选择理由、替代动作和调整规则。",
      ...context.constraints
    ],
    recent_training_summary: context.constraints.filter((item) => /^\d{4}-/.test(item)),
    quality_warnings: context.readiness.level === "green" ? [] : context.readiness.reasons
  });
}
