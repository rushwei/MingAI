export function formatDate(dateStr: string, includeTime = false): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  const base = `${y}年${m}月${day}日`;
  if (!includeTime) return base;
  return `${base} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
