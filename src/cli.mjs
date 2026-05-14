import { access, readFile } from "node:fs/promises";
import { buildContext } from "./agent/contextBuilder.mjs";
import { createResponse } from "./agent/respond.mjs";
import { renderResponseMarkdown } from "./agent/renderResponse.mjs";
import { parseTrainingEvent } from "./input/parseTrainingEvent.mjs";

const args = process.argv.slice(2);
const command = args.find((arg) => ["--help", "-h", "help", "examples", "doctor"].includes(arg));
const asJson = args.includes("--json");
const input = args.filter((arg) => arg !== "--json").join(" ").trim();

function printHelp() {
  console.log(`Road to Summer CLI

Usage:
  npm run cli -- "今天该练什么？"
  npm run cli -- --json "高位下拉有人了"
  npm run cli -- examples
  npm run cli -- doctor

Commands:
  --help, -h, help   Show this help.
  examples           Show useful training prompts.
  doctor             Check local CLI prerequisites.

For the full Gateway + Frontend smoke test:
  npm run dx:smoke`);
}

function printExamples() {
  console.log(`Road to Summer CLI examples

Training request:
  npm run cli -- "今天该练什么？"
  npm run cli -- "明天该练什么？"

In-session adjustment:
  npm run cli -- "高位下拉和绳索划船有人了。"
  npm run cli -- "我有点累了，还要不要继续？"
  npm run cli -- "我感觉不到背阔肌发力。"

Training log:
  npm run cli -- "5月13日我练了下肢，帮我补记录。"

JSON output:
  npm run cli -- --json "高位下拉坏了，今天不能用。"`);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runDoctor() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const checks = [
    {
      name: "Node",
      ok: nodeMajor >= 25,
      detail: `node ${process.version}; required ${packageJson.engines?.node || "not declared"}`
    },
    {
      name: "Memory files",
      ok: await exists("memory/user_profile.md") && await exists("memory/training_rules.md"),
      detail: "memory/user_profile.md and memory/training_rules.md"
    },
    {
      name: "Hermes skill pack",
      ok: await exists("road-to-summer/hermes-extension/skills/road_to_summer/SKILL.md"),
      detail: "road-to-summer/hermes-extension/skills/road_to_summer/SKILL.md"
    },
    {
      name: "Frontend package",
      ok: await exists("road-to-summer/frontend/package.json"),
      detail: "road-to-summer/frontend/package.json"
    },
    {
      name: "Parser smoke",
      ok: parseTrainingEvent("今天该练什么？").event_type === "training_request",
      detail: "parseTrainingEvent(\"今天该练什么？\")"
    }
  ];

  console.log("Road to Summer CLI doctor\n");
  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
  }
  console.log("\nFull local app check:");
  console.log("  npm run dx:smoke");
  if (checks.some((check) => !check.ok)) process.exit(1);
}

if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
  process.exit(0);
}

if (command === "examples") {
  printExamples();
  process.exit(0);
}

if (command === "doctor") {
  await runDoctor();
  process.exit(0);
}

if (!input) {
  printHelp();
  process.exit(1);
}

const event = parseTrainingEvent(input);
const context = await buildContext(process.cwd());
const response = createResponse(event, context);

if (asJson) {
  console.log(JSON.stringify({ event, response }, null, 2));
} else {
  console.log("## Parsed Event");
  console.log("```json");
  console.log(JSON.stringify(event, null, 2));
  console.log("```");
  console.log();
  console.log(renderResponseMarkdown(response));
}
