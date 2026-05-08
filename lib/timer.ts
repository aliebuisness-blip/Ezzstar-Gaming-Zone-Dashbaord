export function getRemainingTime(startTime: number, durationSeconds: number, nowMs = Date.now()): number {
  const endTime = startTime + durationSeconds * 1000;
  return Math.max(0, endTime - nowMs);
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
}
