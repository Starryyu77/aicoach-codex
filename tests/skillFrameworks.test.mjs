import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const skillRoot = path.resolve("road-to-summer/hermes-extension/skills/road_to_summer");

async function skillFile(name) {
  return readFile(path.join(skillRoot, name), "utf8");
}

test("Road to Summer skill pack includes five complementary framework modules", async () => {
  const files = [
    "framework_nasm_opt.md",
    "framework_ace_ift.md",
    "framework_nsca_program_design.md",
    "framework_acsm_resistance_training_2026.md",
    "framework_autoregulation.md",
    "framework_integration.md"
  ];
  const contents = await Promise.all(files.map(skillFile));
  assert.match(contents[0], /NASM OPT/);
  assert.match(contents[1], /ACE IFT/);
  assert.match(contents[2], /NSCA Program Design/);
  assert.match(contents[3], /ACSM 2026/);
  assert.match(contents[4], /RPE \/ RIR \/ Autoregulation/);
  assert.match(contents[5], /Ownership Map/);
});

test("main skill references framework modules and requires framework trace", async () => {
  const skill = await skillFile("SKILL.md");
  assert.match(skill, /framework_integration\.md/);
  assert.match(skill, /framework_nasm_opt\.md/);
  assert.match(skill, /framework_ace_ift\.md/);
  assert.match(skill, /framework_nsca_program_design\.md/);
  assert.match(skill, /framework_acsm_resistance_training_2026\.md/);
  assert.match(skill, /framework_autoregulation\.md/);
  assert.match(skill, /official_sources\.md/);
  assert.match(skill, /plan_card\.framework_trace/);
  assert.match(skill, /plan_card\.official_source_trace/);
  assert.match(skill, /source_note/);
  assert.match(skill, /Chinese|中文/);
});

test("framework integration defines non-overlapping responsibilities", async () => {
  const integration = await skillFile("framework_integration.md");
  assert.match(integration, /NASM OPT\s*\n\s*-> phase and progression\/regression/);
  assert.match(integration, /ACE IFT\s*\n\s*-> user-centered starting point/);
  assert.match(integration, /NSCA Program Design\s*\n\s*-> session structure/);
  assert.match(integration, /ACSM 2026 Resistance Training\s*\n\s*-> outcome-to-variable mapping/);
  assert.match(integration, /RPE\/RIR Autoregulation\s*\n\s*-> real-time load/);
  assert.match(integration, /Safety\/risk beats all other frameworks/);
});

test("official source registry maps framework decisions to visible source trace fields", async () => {
  const registry = await skillFile("official_sources.md");
  assert.match(registry, /Source Trace Schema/);
  assert.match(registry, /https:\/\/www\.nasm\.org\/certified-personal-trainer\/the-opt-model/);
  assert.match(registry, /https:\/\/www\.acefitness\.org\/fitness-certifications\/personal-trainer-certification\/ace-ift-model\.aspx/);
  assert.match(registry, /https:\/\/www\.nsca\.com\/education\/articles\/kinetic-select\/determination-of-resistance-training-frequency\//);
  assert.match(registry, /https:\/\/acsm\.org\/resistance-training-guidelines-update-2026\//);
  assert.match(registry, /https:\/\/www\.nsca\.com\/education\/articles\/nsca-coach\/using-intensity-based-on-sets-and-repetitions/);
  assert.match(registry, /applied_decision/);
  assert.match(registry, /why_it_matters/);
  assert.match(registry, /source_note/);
  assert.match(registry, /教练依据/);
});
