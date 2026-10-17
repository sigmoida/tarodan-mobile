/**
 * `POST /security/2fa/enable` yanıtı. Ölçüldü (staging): `secret`, `qrCodeUrl` (`otpauth://…`
 * bağlantısı — GÖRSEL DEĞİL), `qrCodeImage` (çizilebilir base64 data URI), `backupCodes`.
 */
export interface TwoFactorSetup {
  secret: string;
  qrCodeImage: string;
  backupCodes: string[];
}

/** Gösterilen yedek kodlar ve kaynağı: kurulum bitince ekran kapanır, yenilemede ekranda kalınır. */
export interface ShownBackupCodes {
  codes: string[];
  source: 'setup' | 'regenerate';
}

/** Bazı uçlar gövdeyi `{ data: … }` zarfında döndürüyor; ikisini de kabul et. */
export function unwrap(body: unknown): Record<string, unknown> {
  const b = body as { data?: unknown } | null | undefined;
  const inner = b && typeof b === 'object' && b.data && typeof b.data === 'object' ? b.data : b;
  return (inner && typeof inner === 'object' ? inner : {}) as Record<string, unknown>;
}

function stringList(v: unknown): string[] | null {
  return Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string') : null;
}

/** Yedek kod listesi: düz dizi, `{ backupCodes }` ya da `{ data: [...] | { backupCodes } }`. */
export function extractBackupCodes(body: unknown): string[] {
  const direct = stringList(body);
  if (direct) return direct;
  const b = (body ?? {}) as { backupCodes?: unknown; data?: unknown };
  return stringList(b.backupCodes) ?? stringList(b.data) ?? stringList(unwrap(body).backupCodes) ?? [];
}

/** `enable` yanıtını kurulum verisine çevirir. */
export function toTwoFactorSetup(body: unknown): TwoFactorSetup {
  const p = unwrap(body);
  return {
    secret: typeof p.secret === 'string' ? p.secret : '',
    qrCodeImage: typeof p.qrCodeImage === 'string' ? p.qrCodeImage : '',
    backupCodes: extractBackupCodes(p),
  };
}

/** `<b>…</b>` işaretli katalog metnini düz / kalın parçalara böler (web `t.rich`'in karşılığı). */
export function boldSegments(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(<b>.*?<\/b>)/)
    .filter(Boolean)
    .map((part) => {
      const m = /^<b>(.*)<\/b>$/.exec(part);
      return m ? { text: m[1]!, bold: true } : { text: part, bold: false };
    });
}
