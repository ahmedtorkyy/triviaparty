/** Get UTC week number */
function getUTCWeek(date: Date): number {
  const dayOffset = (date.getUTCDay() + 6) % 7; // Monday as first day
  const weekOffset = (date.getUTCDate() + dayOffset - 1) / 7;
  return Math.floor(weekOffset) + 1;
}