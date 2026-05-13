import { buildContext } from "./agent/contextBuilder.mjs";
import { createResponse } from "./agent/respond.mjs";
import { renderResponseMarkdown } from "./agent/renderResponse.mjs";
import { parseTrainingEvent } from "./input/parseTrainingEvent.mjs";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const input = args.filter((arg) => arg !== "--json").join(" ").trim();

if (!input) {
  console.error('Usage: npm run cli -- "今天该练什么？"');
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

