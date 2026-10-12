/**
 * Kalan süre "12:34:56" / "3g 04:12" — bitmiş ya da geçersizse null (web ile aynı).
 * `dayUnit` çevirisinden gelir (`time.dayShort`: tr "g", en "d").
 */
export function remaining(
  endsAt: string,
  now: number = Date.now(),
  dayUnit: string = 'g',
): string | null {
  const diff = new Date(endsAt).getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return days > 0
    ? `${days}${dayUnit} ${pad(hours)}:${pad(minutes)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
