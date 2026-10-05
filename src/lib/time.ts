import { formatDistanceToNowStrict } from "date-fns";

export const ago = (d: Date | string | number) => `${formatDistanceToNowStrict(new Date(d))} ago`;

export function until(d: Date | string | number): string {
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 48) return `${Math.floor(h / 24)} days`;
  if (h >= 1) return `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
  return `${Math.max(1, Math.floor(ms / 60_000))} min`;
}
