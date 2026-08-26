/**
 * Şema fabrikalarını testte kurmak için çevirmen.
 *
 * Şemalar artık `t`'yi argüman alıyor (gerekçe: `@/utils/validation` başı — zod
 * mesajları şema KURULURKEN çözülüyor, modül seviyesinde kurulan bir şema
 * metnini ilk yüklenen dilde donduruyordu).
 *
 * Bu yardımcı **gerçek kataloğu** kullanır, sahte bir metin üretmez. Sebebi:
 * şema testlerinin bir kısmı hata MESAJINI okuyor. Anahtarı geri döndüren bir
 * saplama, katalogda karşılığı olmayan bir anahtara geçildiğinde de testi
 * geçirirdi — yani göç sırasında yanlış anahtar yazmak sessizce fark edilmezdi.
 */
import i18n from '@/i18n/config';
import type { TFunction } from 'i18next';

/** Şema fabrikalarına verilecek çevirmen (varsayılan dil: katalogun tr'si). */
export const schemaT = i18n.t.bind(i18n) as TFunction;

/**
 * Bir şema fabrikasını verilen dilde kurar. Dil bağımlı bir davranışı test
 * ederken kullanılır; çoğu şema testi diliyle ilgilenmez ve `schemaT` yeter.
 */
export async function buildInLocale<T>(
  locale: 'tr' | 'en',
  build: (t: TFunction) => T,
): Promise<T> {
  const previous = i18n.language;
  await i18n.changeLanguage(locale);
  const schema = build(i18n.t.bind(i18n) as TFunction);
  await i18n.changeLanguage(previous);
  return schema;
}
