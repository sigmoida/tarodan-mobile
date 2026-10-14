/**
 * Yazarak onay — web `DangerZoneSection` ile aynı fikir: kullanıcı
 * `settings.deleteAccountKeyword` ("SİL" / "DELETE") yazmadan silme düğmesi açılmaz.
 *
 * Web büyük/küçük harf duyarlı; mobilde klavye farkları yüzünden gevşetildi:
 * Türkçe olmayan klavyede `autoCapitalize="characters"` "sil"i "SIL" (noktasız I) yapar,
 * bazı Android klavyeleri büyük harfi hiç uygulamaz. Bu yüzden iki taraf da
 * normalleştirilir: NFC, baş/son boşluk, I/İ/ı/i tek harfe katlanır, büyük/küçük harf
 * yok sayılır. Başka kelimeler ("SL", "SILME") yine eşleşmez.
 */
const normalize = (s: string): string =>
  s
    .normalize('NFC')
    .trim()
    // Ayrık nokta (i + U+0307, "İ"nin ayrışmış küçüğü) atılır; I/İ/ı/i → i.
    .replace(/̇/g, '')
    .replace(/[Iİıi]/g, 'i')
    .toLowerCase();

export function matchesDeleteKeyword(input: string, keyword: string): boolean {
  const k = normalize(keyword);
  return k.length > 0 && normalize(input) === k;
}
