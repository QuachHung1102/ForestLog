export function formatDuration(
  startedAt: string,
  completedAt?: string,
  compact = false,
): string {
  const elapsedMinutes = Math.max(
    0,
    Math.floor(
      (new Date(completedAt ?? Date.now()).getTime() -
        new Date(startedAt).getTime()) /
        60000,
    ),
  );
  const hours = Math.floor(elapsedMinutes / 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const minutes = elapsedMinutes % 60;
  if (days > 0) {
    return compact
      ? `${days}n ${remainingHours}g`
      : `${days} ngày ${remainingHours} giờ`;
  }
  if (compact) return hours > 0 ? `${hours}g ${minutes}p` : `${minutes}p`;
  return hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;
}
