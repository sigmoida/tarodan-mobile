import { Clipboard } from 'react-native';

/**
 * Panoya yazmanın TEK yolu. RN çekirdeğindeki `Clipboard` (yeni native bağımlılık
 * yok) burada sarılır; ekranlar/bileşenler doğrudan `Clipboard` import etmez.
 * Boş değer yazılmaz. Başarılıysa `true` döner (native modül yoksa `false`).
 */
export function copyToClipboard(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    Clipboard.setString(value);
    return true;
  } catch {
    return false;
  }
}
