import { cleanTranscript } from "./cleanTranscript.mjs";
import { BODY_PART_TERMS, EQUIPMENT_TERMS } from "./terminology.mjs";

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function extractMatches(text, terms) {
  return terms.filter((term) => text.includes(term));
}

function extractTime(text) {
  const match = text.match(/(上午|下午|晚上|早上)?\s*(\d{1,2})点/);
  return match ? `${match[1] || ""}${match[2]}点` : "";
}

function extractLocation(text) {
  if (text.includes("公寓健身房")) return "公寓健身房";
  if (text.includes("健身房")) return "当前健身房";
  if (text.includes("家里")) return "家里";
  if (text.includes("酒店")) return "酒店健身房";
  return "";
}

function extractDislikedItems(text) {
  const items = [];
  if (text.includes("波比跳")) items.push("波比跳");
  if (text.includes("高强度 HIIT")) items.push("高强度 HIIT");
  return items;
}

function riskLevelFor(text) {
  if (/胸闷|头晕|恶心|麻|放射痛|刺痛|关节不稳/.test(text)) return "high";
  if (/疼|痛|不适|紧/.test(text)) return "medium";
  if (/累|疲劳|没力/.test(text)) return "low";
  return "none";
}

function followupsFor(eventType) {
  if (eventType === "fatigue_feedback") {
    return ["是全身没力，还是某个部位累？0-10 大概几分？有没有头晕、胸闷、恶心或疼痛？"];
  }
  if (eventType === "pain_feedback") {
    return ["哪个位置？是酸胀、紧、刺痛，还是关节痛？0-10 大概几分？"];
  }
  return [];
}

function classify(cleanText, equipment) {
  if (/练完|训练结束|总结|整理成卡片/.test(cleanText)) return "training_completion";
  if (/今天该练什么|今天训练|帮我安排今天|到健身房了/.test(cleanText)) return "training_request";
  if (equipment.length && /坏|不能用|不可用|修好|修好了|可用/.test(cleanText)) return "equipment_status";
  if (equipment.length && /有人|占用|没有了|没了|排队/.test(cleanText)) return "equipment_occupied";
  if (/晚上|早上|上午|下午|\d+点/.test(cleanText) && /人多|人很多|经常排队|排队/.test(cleanText)) {
    return "crowd_observation";
  }
  if (/(记住|以后).*(健身房|场地|公寓).*(小|空间|不适合|避免|不能做)/.test(cleanText)) {
    return "location_memory_update";
  }
  if (/不太喜欢|不喜欢|讨厌|偏好|默认避免/.test(cleanText)) return "preference_update";
  if (/疼|痛|不适|紧/.test(cleanText)) return "pain_feedback";
  if (/累|疲劳|没力/.test(cleanText)) return "fatigue_feedback";
  if (/感觉不到|发力|不会做|动作不对|动作感觉/.test(cleanText)) return "exercise_feedback";
  if (/太轻|太重|加组|继续|只有.*能用|只能用/.test(cleanText)) return "plan_adjustment_request";
  if (/睡|疲劳\d|疼痛|时间|今天别太猛/.test(cleanText)) return "daily_status";
  return "unknown";
}

function nextActionFor(eventType) {
  return {
    training_request: "generate_plan",
    daily_status: "generate_plan",
    equipment_status: "adjust_current_session",
    equipment_occupied: "adjust_current_session",
    exercise_feedback: "adjust_current_session",
    fatigue_feedback: "adjust_current_session",
    pain_feedback: "adjust_current_session",
    preference_update: "create_memory_candidate",
    location_memory_update: "create_memory_candidate",
    crowd_observation: "create_memory_candidate",
    plan_adjustment_request: "adjust_current_session",
    training_completion: "write_training_log",
    memory_update_request: "create_memory_candidate",
    unknown: "ask_followup"
  }[eventType];
}

export function parseTrainingEvent(rawText) {
  const cleanText = cleanTranscript(rawText);
  let equipment = extractMatches(cleanText, EQUIPMENT_TERMS);
  if (equipment.includes("绳索划船")) {
    equipment = equipment.filter((item) => item !== "绳索");
  }
  const bodyParts = extractMatches(cleanText, BODY_PART_TERMS);
  const eventType = classify(cleanText, equipment);
  const status = cleanText.includes("修好") || cleanText.includes("可用")
    ? "available"
    : /坏|不能用|不可用/.test(cleanText)
      ? "unavailable"
      : /有人|占用|排队|没了|没有了/.test(cleanText)
        ? "occupied"
        : "";

  const entities = {
    equipment,
    body_parts: bodyParts,
    status,
    location: extractLocation(cleanText),
    time: extractTime(cleanText),
    disliked_items: extractDislikedItems(cleanText)
  };

  if (cleanText.includes("今天别太猛")) {
    entities.intensity_constraint = "lower_intensity_today";
  }

  const memoryEvents = new Set([
    "equipment_status",
    "preference_update",
    "location_memory_update",
    "crowd_observation",
    "pain_feedback"
  ]);

  return {
    event_type: eventType,
    raw_text: rawText,
    clean_text: cleanText,
    entities,
    intent: eventType,
    should_update_memory: memoryEvents.has(eventType),
    risk_level: riskLevelFor(cleanText),
    requires_followup: eventType === "unknown",
    followup_questions: eventType === "unknown" ? ["你是想让我安排今天训练、调整当前动作，还是记录训练结果？"] : followupsFor(eventType),
    next_action: nextActionFor(eventType)
  };
}
