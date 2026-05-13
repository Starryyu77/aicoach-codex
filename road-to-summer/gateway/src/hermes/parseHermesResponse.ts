import type { HermesOutput, HermesResponse } from "./types.ts";
import { validateAgentOutput } from "../ui/validateAgentOutput.ts";

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const candidates = [
    trimmed,
    trimmed.replace(/,\s*([}\]])/g, "$1")
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next repair candidate before falling back to object extraction.
    }
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1"));
      }
    }
    throw new Error("Hermes response is not valid JSON");
  }
}

export function parseHermesResponse(response: HermesResponse): HermesOutput {
  const output = typeof response.output === "string" ? extractJson(response.output) : response.output;
  const result = validateAgentOutput(output);
  if (!result.valid) {
    throw new Error(`Invalid Hermes output: ${result.error}`);
  }
  return output as HermesOutput;
}
