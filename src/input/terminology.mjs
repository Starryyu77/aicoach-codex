const REPLACEMENTS = [
  [/下拉机|拉背机器/g, "高位下拉"],
  [/平板凳|凳子/g, "卧推凳"],
  [/坐姿划船/g, "绳索划船"],
  [/背阔肌|背阔|大背/g, "背阔肌"],
  [/肩膀前面|前三角/g, "肩前侧"],
  [/burpee|Burpee|波比(?!跳)/g, "波比跳"],
  [/高强度间歇|高强度有氧|HIIT/g, "高强度 HIIT"],
  [/公斤|千克/g, "kg"]
];

const CHINESE_NUMBERS = new Map([
  ["零", "0"],
  ["一", "1"],
  ["二", "2"],
  ["两", "2"],
  ["三", "3"],
  ["四", "4"],
  ["五", "5"],
  ["六", "6"],
  ["七", "7"],
  ["八", "8"],
  ["九", "9"],
  ["十", "10"]
]);

export function normalizeTerminology(text) {
  return REPLACEMENTS.reduce((value, [pattern, replacement]) => {
    return value.replace(pattern, replacement);
  }, text);
}

export function normalizeChineseNumbers(text) {
  let normalized = text;
  for (const [source, target] of CHINESE_NUMBERS.entries()) {
    normalized = normalized.replaceAll(source, target);
  }
  return normalized
    .replace(/(\d+)\s*组\s*(\d+)\s*(个|次)?/g, "$1x$2")
    .replace(/(\d+)\s*点/g, "$1点")
    .replace(/(\d+)\s*分钟/g, "$1分钟");
}

export const EQUIPMENT_TERMS = [
  "高位下拉",
  "绳索划船",
  "卧推凳",
  "划船机",
  "绳索",
  "哑铃",
  "杠铃",
  "弹力带"
];

export const BODY_PART_TERMS = [
  "肩前侧",
  "肩膀",
  "背阔肌",
  "背",
  "腰",
  "膝盖",
  "手腕",
  "肘",
  "腿"
];

