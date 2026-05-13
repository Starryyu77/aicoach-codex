import { loadMemory, recentTrainingLogSections } from "../memory/loadMemory.mjs";

function has(text, value) {
  return text.includes(value);
}

export async function buildContext(rootDir = process.cwd()) {
  const memory = await loadMemory(rootDir);
  const profile = memory["user_profile.md"] || "";
  const equipment = memory["equipment_memory.md"] || "";
  const location = memory["location_memory.md"] || "";
  const preferences = memory["preference_memory.md"] || "";
  const risks = memory["risk_memory.md"] || "";
  const observations = memory["observation_memory.md"] || "";

  return {
    memory,
    user_goal: has(profile, "增肌塑形") ? "增肌塑形 + 功能性维护" : "",
    training_frequency: has(profile, "不固定") ? "不固定" : "",
    primary_location: has(profile, "公寓健身房") ? "公寓健身房" : "",
    available_equipment: ["哑铃", "卧推凳", "高位下拉", "绳索", "划船机"].filter((item) => has(equipment + profile, item)),
    equipment_constraints: equipment,
    location_constraints: location,
    preferences,
    risks,
    observations,
    recent_sessions: recentTrainingLogSections(memory["training_logs.md"] || "", 3),
    today_recommendation_direction: "在不固定训练频率下，优先完成有价值的主训练，再补核心和活动度。"
  };
}

