/** 随机取一个；空数组返回 null。random 注入是为了测试里能固定结果。 */
export function pickOne<T>(values: T[], random: () => number = Math.random): T | null {
  if (values.length === 0) return null;
  return values[Math.min(Math.floor(random() * values.length), values.length - 1)];
}
