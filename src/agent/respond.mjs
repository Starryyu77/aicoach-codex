import { memoryCandidateFromEvent } from "../memory/memoryWriter.mjs";

function exercise(exerciseName, sets, reps, intensity, rest, notes, substitutions = []) {
  return {
    exercise: exerciseName,
    sets,
    reps,
    intensity,
    rest,
    notes,
    common_mistakes: [],
    substitutions
  };
}

function planResponse(context) {
  const plan = {
    today_summary: "公寓健身房训练，以背部拉力 + 上肢稳定 + 核心为主；避开波比跳和高强度 HIIT，注意肩前侧状态。",
    today_goal: context.user_goal || "增肌塑形 + 功能性维护",
    training_focus: "背部拉力、肩胛控制、核心稳定",
    warm_up: [
      exercise("划船机轻松热身", "1", "5-6 分钟", "RPE 3-4", "-", "让体温上来，不追求速度"),
      exercise("弹力带肩胛下压", "2", "12-15", "轻", "30 秒", "先找肩膀放低的感觉"),
      exercise("胸椎旋转 + 肩前侧动态拉伸", "2", "每侧 8 次", "轻", "30 秒", "肩前侧紧时不要拉到疼")
    ],
    main_training: [
      exercise("高位下拉", "4", "8-12", "RPE 7-8", "90 秒", "先把肩膀放低，再用手肘往裤兜方向拉", ["胸托哑铃划船", "单臂哑铃划船", "弹力带下拉"]),
      exercise("胸托哑铃划船", "4", "10-12", "RPE 7-8", "75-90 秒", "胸贴稳，手肘往身体后侧收", ["单臂哑铃划船", "俯身哑铃划船"]),
      exercise("哑铃卧推", "3", "8-10", "RPE 7", "90 秒", "肩前侧紧就缩小幅度或改俯卧撑", ["地板哑铃卧推", "俯卧撑"])
    ],
    accessory_training: [
      exercise("哑铃侧平举", "3", "12-15", "RPE 7", "60 秒", "不要耸肩，手臂抬到肩高即可"),
      exercise("反向飞鸟", "3", "12-15", "RPE 7", "60 秒", "像把肩胛往后放进裤兜，不要甩")
    ],
    core_or_cardio: [
      exercise("死虫", "3", "每侧 8-10", "可控", "45 秒", "腰不要拱起来"),
      exercise("平板支撑", "2-3", "30-45 秒", "RPE 7", "45 秒", "保持呼吸，不塌腰")
    ],
    cool_down: [
      exercise("背阔肌拉伸", "2", "30 秒/侧", "轻", "-", "拉到有牵拉感即可"),
      exercise("肩前侧放松", "2", "30 秒/侧", "轻", "-", "不能拉出疼痛")
    ],
    risk_notes: ["肩前侧如果从紧变成疼，停止卧推动作并改为轻量活动度。"],
    substitutions: ["高位下拉被占用时改胸托哑铃划船或单臂哑铃划船；绳索不可用时优先使用哑铃动作。"],
    reasoning: "频率不固定时，本次先完成背部拉力和核心稳定这类高价值训练；公寓健身房空间有限，所以不安排农夫走路和大范围移动动作；用户不喜欢波比跳和高强度 HIIT，因此心肺以划船机轻松热身和核心控制替代。"
  };

  return {
    kind: "training_plan",
    plan,
    memory_updates: []
  };
}

function replacementForEquipment(event) {
  const equipment = event.entities.equipment || [];
  if (equipment.includes("高位下拉") || equipment.includes("绳索划船")) {
    return [
      {
        exercise: "胸托哑铃划船",
        sets: "4",
        reps: "10-12",
        intensity: "RPE 7-8",
        rest: "75-90 秒",
        reason: "不依赖高位下拉或绳索，也能保留背部拉力训练刺激。"
      },
      {
        exercise: "单臂哑铃划船",
        sets: "3-4",
        reps: "10-12/侧",
        intensity: "RPE 7",
        rest: "60-90 秒",
        reason: "器械有限时可继续训练背部，并方便找单侧发力。"
      }
    ];
  }
  if (equipment.includes("卧推凳")) {
    return [
      {
        exercise: "地板哑铃卧推",
        sets: "3-4",
        reps: "8-12",
        intensity: "RPE 7",
        rest: "75-90 秒",
        reason: "保留水平推动作，同时不依赖卧推凳。"
      },
      {
        exercise: "俯卧撑",
        sets: "3",
        reps: "接近力竭前 2 次停止",
        intensity: "RPE 7-8",
        rest: "60-90 秒",
        reason: "场地受限时稳定可执行。"
      }
    ];
  }
  return [
    {
      exercise: "哑铃替代动作",
      sets: "3-4",
      reps: "10-12",
      intensity: "RPE 7",
      rest: "60-90 秒",
      reason: "当前器械受限，先用可用器械保留训练目标。"
    }
  ];
}

function equipmentOccupiedResponse(event) {
  return {
    kind: "session_adjustment",
    event_type: "equipment_unavailable",
    equipment: event.entities.equipment,
    status: "occupied",
    training_goal_unchanged: true,
    replacement_options: replacementForEquipment(event),
    session_update: `本次训练中 ${event.entities.equipment.join("、")} 暂时不可用，使用替代动作继续完成原训练目标。`,
    memory_updates: []
  };
}

function equipmentStatusResponse(event) {
  const update = memoryCandidateFromEvent(event);
  const isAvailable = event.entities.status === "available";
  return {
    kind: "equipment_status",
    event_type: "equipment_status",
    equipment: event.entities.equipment,
    status: event.entities.status,
    current_session_action: isAvailable
      ? "恢复该器械为可用；后续计划可以重新安排。"
      : "本次训练改用替代动作，不等待该器械。",
    replacement_options: isAvailable ? [] : replacementForEquipment(event),
    memory_updates: update ? [update] : []
  };
}

function fatigueResponse(event) {
  return {
    kind: "fatigue_decision",
    event_type: "fatigue_feedback",
    response: "你现在说有点累，我先不直接让你结束。先判断是全身没力，还是目标肌肉正常酸胀；刚才动作质量有没有明显下降；今天主训练完成了多少。",
    decision_rules: [
      "如果只是正常训练疲劳：休息延长到 90-120 秒，再完成下一组。",
      "如果动作开始变形：下一组降重 10%-15%，或少做 1 组。",
      "如果主训练已经完成 80% 以上：不强行加组，转核心、拉伸或结束。",
      "如果出现疼痛、头晕、胸闷或恶心：停止当前动作。"
    ],
    followup_questions: event.followup_questions,
    memory_updates: []
  };
}

function exerciseCueResponse() {
  return {
    kind: "exercise_explanation",
    exercise: "高位下拉",
    technical_explanation: "肩胛先下沉，再让背阔肌主导肩关节内收和伸展。",
    plain_language_explanation: "下一组先别急着拉重量。先把肩膀放低，不要耸肩；想象你不是用手把重量拉下来，而是用手肘往身体两侧的裤兜方向拉。",
    body_feel: "你应该感觉腋下到身体侧面收紧，而不是前臂和手腕先酸。",
    analogy: "手只是挂钩，手肘才是主发动机。",
    next_set_adjustment: "下一组降重 10%-15%，下拉速度放慢，最低点停 1 秒。",
    if_still_not_working: "如果还是感觉不到背，换成单臂绳索下拉或单臂哑铃划船。"
  };
}

function crowdObservationResponse(event) {
  const update = memoryCandidateFromEvent(event);
  return {
    kind: "memory_observation",
    event_type: "crowd_observation",
    response: "这是场地人流观察，可以记录，但第一版不把它直接变成绝对规则。后续多次在同一时间段出现，再升级为稳定场地规律。",
    memory_updates: update ? [update] : []
  };
}

function genericMemoryCandidateResponse(event) {
  const update = memoryCandidateFromEvent(event);
  return {
    kind: "memory_candidate",
    event_type: event.event_type,
    response: "已识别为可能需要长期保存的信息，先生成记忆候选，确认后再写入。",
    memory_updates: update ? [update] : []
  };
}

function trainingCompletionResponse() {
  const card = {
    date: new Date().toISOString().slice(0, 10),
    location: "公寓健身房",
    duration: "",
    training_theme: "待从当前 session 汇总",
    planned_session: [],
    actual_completed: [],
    adjustments: [],
    equipment_issues: [],
    body_feedback: [],
    fatigue_level: "",
    pain_or_discomfort: [],
    unfinished_items: [],
    performance_notes: [],
    next_session_suggestions: ["下次优先读取本次未完成项、器械状态和身体反馈，再决定训练方向。"],
    memory_updates: []
  };

  return {
    kind: "training_log_card",
    card,
    memory_updates: [
      {
        target_file: "training_logs.md",
        content: JSON.stringify(card, null, 2),
        reason: "训练结束记录卡应追加到训练日志，供下次训练调用。",
        requires_confirmation: false
      }
    ]
  };
}

function planAdjustmentResponse(event) {
  const text = event.clean_text;
  if (text.includes("太轻")) {
    return {
      kind: "session_adjustment",
      response: "如果动作质量稳定且上一组 RPE 低于 7，下一组可以加重量 5%-10%；如果只是想增加刺激，也可以先保持重量、放慢离心、每组多 2 次。",
      memory_updates: []
    };
  }
  if (text.includes("太重")) {
    return {
      kind: "session_adjustment",
      response: "下一组先降重 10%-15%，保持动作路径。如果动作已经变形，减少 1 组比硬撑更好。",
      memory_updates: []
    };
  }
  if (text.includes("加组")) {
    return {
      kind: "session_adjustment",
      response: "是否加组看三个条件：主目标是否还没完成、上一组 RPE 是否低于 8、动作质量是否稳定。三项都满足可以加 1 组；否则不加，转下一项。",
      memory_updates: []
    };
  }
  return {
    kind: "session_adjustment",
    response: "我会按当前可用器械改写后续动作，保持今天的训练目标不变。",
    memory_updates: []
  };
}

export function createResponse(event, context = {}) {
  switch (event.event_type) {
    case "training_request":
    case "daily_status":
      return planResponse(context);
    case "equipment_occupied":
      return equipmentOccupiedResponse(event);
    case "equipment_status":
      return equipmentStatusResponse(event);
    case "fatigue_feedback":
      return fatigueResponse(event);
    case "exercise_feedback":
      return exerciseCueResponse(event);
    case "crowd_observation":
      return crowdObservationResponse(event);
    case "location_memory_update":
    case "preference_update":
    case "pain_feedback":
      return genericMemoryCandidateResponse(event);
    case "training_completion":
      return trainingCompletionResponse();
    case "plan_adjustment_request":
      return planAdjustmentResponse(event);
    default:
      return {
        kind: "followup",
        response: "你是想让我安排今天训练、调整当前动作，还是记录训练结果？",
        followup_questions: event.followup_questions,
        memory_updates: []
      };
  }
}

