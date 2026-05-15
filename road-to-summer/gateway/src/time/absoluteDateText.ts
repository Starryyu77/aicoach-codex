const DAY_MS = 24 * 60 * 60 * 1000;

function isIsoDate(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function isValidMonthDay(month: number, day: number, year: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addDaysIso(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
  return [
    target.getUTCFullYear(),
    String(target.getUTCMonth() + 1).padStart(2, "0"),
    String(target.getUTCDate()).padStart(2, "0")
  ].join("-");
}

export function replaceRelativeDateLabels(text: string, baseDate?: string): string {
  if (!isIsoDate(baseDate)) return text;
  const year = Number(baseDate.slice(0, 4));
  const replacements: Array<[RegExp, string]> = [
    [/前天(?:[（(]\s*\d{1,2}\s*月\s*\d{1,2}\s*[日号]?\s*[）)])?/g, addDaysIso(baseDate, -2)],
    [/(?:昨天|昨日)(?:[（(]\s*\d{1,2}\s*月\s*\d{1,2}\s*[日号]?\s*[）)])?/g, addDaysIso(baseDate, -1)],
    [/(?:今天|今日|当天|当日)(?:[（(]\s*\d{1,2}\s*月\s*\d{1,2}\s*[日号]?\s*[）)])?/g, baseDate],
    [/(?:明天|明日)(?:[（(]\s*\d{1,2}\s*月\s*\d{1,2}\s*[日号]?\s*[）)])?/g, addDaysIso(baseDate, 1)],
    [/后天(?:[（(]\s*\d{1,2}\s*月\s*\d{1,2}\s*[日号]?\s*[）)])?/g, addDaysIso(baseDate, 2)]
  ];
  return replacements
    .reduce((result, [pattern, date]) => result.replace(pattern, date), text)
    .replace(/(?<![\d年])(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/g, (_, month: string, day: string) => {
      const monthValue = Number(month);
      const dayValue = Number(day);
      if (!isValidMonthDay(monthValue, dayValue, year)) return _;
      return `${year}-${String(monthValue).padStart(2, "0")}-${String(dayValue).padStart(2, "0")}`;
    })
    .replace(/([\u4e00-\u9fff])(\d{4}-\d{2}-\d{2})/g, "$1 $2")
    .replace(/(\d{4}-\d{2}-\d{2})([\u4e00-\u9fff])/g, "$1 $2");
}

export function normalizeRelativeDateText<T>(value: T, baseDate?: string): T {
  if (!isIsoDate(baseDate)) return value;
  if (typeof value === "string") return replaceRelativeDateLabels(value, baseDate) as T;
  if (Array.isArray(value)) return value.map((item) => normalizeRelativeDateText(item, baseDate)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeRelativeDateText(item, baseDate)])
    ) as T;
  }
  return value;
}
