import { normalizeChineseNumbers, normalizeTerminology } from "./terminology.mjs";

const FILLERS = [
  "嗯",
  "呃",
  "那个",
  "就是",
  "然后呢",
  "然后",
  "我想说",
  "就是说"
];

export function cleanTranscript(rawText = "") {
  let text = String(rawText).trim();
  for (const filler of FILLERS) {
    text = text.replaceAll(filler, "");
  }
  text = normalizeTerminology(text);
  text = normalizeChineseNumbers(text);
  return text
    .replace(/\s+/g, " ")
    .replace(/[，,]\s*/g, "，")
    .replace(/[。.!！]+$/g, "")
    .trim();
}

