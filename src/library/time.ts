/** Read "4:10" or "250" as seconds. Returns null for empty or unreadable input. */
export function parseTime(raw: string): number | null {
  const input = raw.trim();
  if (!input) return null;
  const clock = /^(\d+):(\d{1,2})$/.exec(input);
  if (clock) {
    const sec = Number(clock[2]);
    return sec < 60 ? Number(clock[1]) * 60 + sec : null;
  }
  return /^\d+(\.\d+)?$/.test(input) ? Number(input) : null;
}

/** Seconds as "m:ss", or "" for null. */
export function formatTime(sec: number | null): string {
  if (sec === null) return "";
  const total = Math.round(sec);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
