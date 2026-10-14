/**
 * Yazarak onay — web `DangerZoneSection` ile aynı kural: kullanıcı
 * `settings.deleteAccountKeyword` ("SİL" / "DELETE") yazmadan silme düğmesi açılmaz.
 * Büyük/küçük harf duyarlı (web gibi); yalnız klavyenin eklediği baş/son boşluk yok sayılır.
 */
export function matchesDeleteKeyword(input: string, keyword: string): boolean {
  return keyword.length > 0 && input.trim() === keyword;
}
