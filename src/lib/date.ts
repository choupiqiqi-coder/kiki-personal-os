export const DEFAULT_TIME_ZONE = "Asia/Shanghai";

export function getLocalDate(timeZone = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getDayBounds(date: string) {
  return {
    start: new Date(`${date}T00:00:00+08:00`).toISOString(),
    end: new Date(`${date}T24:00:00+08:00`).toISOString(),
  };
}

export function formatChineseDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: DEFAULT_TIME_ZONE,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${date}T12:00:00+08:00`));
}

export function getDailyMode(morningStart = "07:00:00", eveningStart = "21:00:00") {
  const current = new Intl.DateTimeFormat("en-GB", {
    timeZone: DEFAULT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  if (current >= eveningStart.slice(0, 5) || current < morningStart.slice(0, 5)) {
    return "evening" as const;
  }
  return current < "11:00" ? ("morning" as const) : ("day" as const);
}
