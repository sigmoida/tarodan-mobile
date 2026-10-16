import { Clipboard } from 'react-native';

/**
 * Panoya yazmanın TEK yolu. RN çekirdeğindeki `Clipboard` (yeni native bağımlılık
 * yok) burada sarılır; ekranlar/bileşenler doğrudan `Clipboard` import etmez.
 * Boş değer yazılmaz. Başarılıysa `true` döner (native modül yoksa `false`).
 */
export function copyToClipboard(value: string | null | undefined): boolean {
  if (!write(value)) return false;
  // Uygulamadan başka bir şey kopyalandı: bekleyen hassas temizlik artık onu silmesin.
  cancelSensitiveClear();
  return true;
}

/** Hassas değer (2FA gizli anahtarı, yedek kodlar) panoda en fazla bu kadar kalır. */
export const SENSITIVE_CLIPBOARD_TTL_MS = 60_000;

let clearTimer: ReturnType<typeof setTimeout> | null = null;

function write(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    Clipboard.setString(value);
    return true;
  } catch {
    return false;
  }
}

function cancelSensitiveClear(): void {
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = null;
}

/**
 * Hassas değeri kopyalar ve `ttlMs` sonra panoyu boşaltır (çağıran kullanıcıyı uyarır).
 * Aynı cihazda Authenticator'a yapıştırmak için kopyalama gerekli (QR aynı telefonda
 * okutulamaz); ama değer panoda süresiz kalırsa her uygulama / klavye / pano geçmişi onu
 * okuyabilir. Pano içeriği okunarak karşılaştırılmaz: iOS'ta okuma "yapıştır" izni
 * sorar. Bu yüzden süre dolunca koşulsuz boşaltılır — arada UYGULAMADAN başka bir kopya
 * yapıldıysa (`copyToClipboard`) temizlik iptal edilir.
 */
export function copySensitiveToClipboard(
  value: string | null | undefined,
  ttlMs: number = SENSITIVE_CLIPBOARD_TTL_MS,
): boolean {
  if (!write(value)) return false;
  cancelSensitiveClear();
  clearTimer = setTimeout(() => {
    clearTimer = null;
    try {
      Clipboard.setString('');
    } catch {
      /* native modül yok: yazım da olmamıştı */
    }
  }, ttlMs);
  return true;
}
