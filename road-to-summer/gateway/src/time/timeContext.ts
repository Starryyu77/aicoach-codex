export type TemporalIntent =
  | "today_session"
  | "future_planning"
  | "backfill_training_log"
  | "past_reference"
  | "selected_date"
  | "unspecified";

export type DateSource = "explicit_text" | "relative_text" | "selected_date" | "default_today";

export type TimeContext = {
  timezone: string;
  now_iso: string;
  today: string;
  target_date: string;
  target_date_label: string;
  target_offset_days: number;
  temporal_intent: TemporalIntent;
  date_source: DateSource;
  date_conflict?: {
    selected_date: string;
    resolved_date: string;
    resolution: "explicit_text_wins" | "relative_text_wins";
  };
  mentioned_terms: string[];
};

export type BuildTimeContextOptions = {
  rawText?: string;
  timezone?: string;
  targetDate?: string;
  now?: Date;
};

const DEFAULT_TIMEZONE = "Asia/Singapore";
const DAY_MS = 24 * 60 * 60 * 1000;

function formatDateParts(date: Date, timezone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day")
  };
}

export function todayInTimezone(now: Date = new Date(), timezone = DEFAULT_TIMEZONE): string {
  const { year, month, day } = formatDateParts(now, timezone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day) + days * DAY_MS;
  const target = new Date(utc);
  return [
    target.getUTCFullYear(),
    String(target.getUTCMonth() + 1).padStart(2, "0"),
    String(target.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function dateDiffDays(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  return Math.round((Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / DAY_MS);
}

function isIsoDate(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function parseExplicitDate(text: string, today: string): { date?: string; term?: string } {
  const iso = text.match(/\b(20\d{2}-\d{1,2}-\d{1,2})\b/);
  if (iso) {
    const [year, month, day] = iso[1].split("-").map(Number);
    return {
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      term: iso[1]
    };
  }

  const monthDay = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
  if (monthDay) {
    const year = Number(today.slice(0, 4));
    return {
      date: `${year}-${String(Number(monthDay[1])).padStart(2, "0")}-${String(Number(monthDay[2])).padStart(2, "0")}`,
      term: monthDay[0]
    };
  }

  return {};
}

function parseRelativeOffset(text: string): { offset?: number; term?: string } {
  const patterns: Array<[RegExp, number]> = [
    [/前两天|两天前|2\s*天前/, -2],
    [/前天/, -2],
    [/昨天|昨日/, -1],
    [/今天|今日/, 0],
    [/明天|明日/, 1],
    [/后天/, 2]
  ];
  for (const [pattern, offset] of patterns) {
    const match = text.match(pattern);
    if (match) return { offset, term: match[0] };
  }
  return {};
}

function inferIntent(text: string, offset: number, hasSelectedDate: boolean): TemporalIntent {
  const asksForBackfill = /(补|补录|回填|记录|总结).*(训练|练|卡|内容)|(?:训练|练).*(补|补录|回填|记录|总结)/.test(text);
  const reportsCompletedPastTraining = /(练了|训练了|做了|完成了|打卡|练完了|训练结束)/.test(text);
  if ((asksForBackfill || reportsCompletedPastTraining) && offset < 0) {
    return "backfill_training_log";
  }
  if (/(练完|训练结束|总结)/.test(text)) {
    return offset < 0 ? "backfill_training_log" : "today_session";
  }
  if (hasSelectedDate) return "selected_date";
  if (offset > 0) return "future_planning";
  if (offset < 0) return "past_reference";
  if (/(今天|今日)/.test(text)) return "today_session";
  return "unspecified";
}

export function buildTimeContext(options: BuildTimeContextOptions = {}): TimeContext {
  const timezone = options.timezone || DEFAULT_TIMEZONE;
  const now = options.now || new Date();
  const today = todayInTimezone(now, timezone);
  const text = options.rawText || "";
  const mentionedTerms: string[] = [];

  const explicit = parseExplicitDate(text, today);
  if (explicit.term) mentionedTerms.push(explicit.term);

  const relative = parseRelativeOffset(text);
  if (relative.term) mentionedTerms.push(relative.term);

  let targetDate = today;
  let offset = 0;
  let hasSelectedDate = false;
  let dateSource: DateSource = "default_today";
  const selectedDate = isIsoDate(options.targetDate) ? options.targetDate : undefined;
  let dateConflict: TimeContext["date_conflict"];

  if (explicit.date) {
    targetDate = explicit.date;
    offset = dateDiffDays(today, targetDate);
    dateSource = "explicit_text";
    if (selectedDate && selectedDate !== targetDate) {
      dateConflict = {
        selected_date: selectedDate,
        resolved_date: targetDate,
        resolution: "explicit_text_wins"
      };
    }
  } else if (typeof relative.offset === "number") {
    offset = relative.offset;
    targetDate = addDays(today, offset);
    dateSource = "relative_text";
    if (selectedDate && selectedDate !== targetDate) {
      dateConflict = {
        selected_date: selectedDate,
        resolved_date: targetDate,
        resolution: "relative_text_wins"
      };
    }
  } else if (selectedDate) {
    targetDate = selectedDate;
    offset = dateDiffDays(today, targetDate);
    hasSelectedDate = true;
    dateSource = "selected_date";
    mentionedTerms.push("selected_date");
  }

  return {
    timezone,
    now_iso: now.toISOString(),
    today,
    target_date: targetDate,
    target_date_label: targetDate,
    target_offset_days: offset,
    temporal_intent: inferIntent(text, offset, hasSelectedDate),
    date_source: dateSource,
    date_conflict: dateConflict,
    mentioned_terms: Array.from(new Set(mentionedTerms))
  };
}
