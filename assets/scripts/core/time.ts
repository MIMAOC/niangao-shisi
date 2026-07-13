/** 本地日历日，形如 2026-07-13。每日限量（体力广告、元宝限购）都按这个键比对。 */
export function formatLocalDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
