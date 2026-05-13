import { formatPkr, formatSpica, spicaToPkr } from "@/lib/spica";
import { formatTime } from "@/lib/timer";

export { formatPkr, formatSpica, formatTime, spicaToPkr };

export function formatShortDate(value: number | string | Date) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatClock(value?: number | string | Date | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
