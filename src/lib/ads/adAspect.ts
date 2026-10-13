/** Afişin kendi ölçüsü yoksa konuma göre varsayılan en/boy oranı (web ile aynı). */
export const FALLBACK_AD_RATIO: Record<string, number> = {
  topbar: 970 / 90,
  header: 970 / 250,
  footer: 970 / 250,
  inline: 970 / 200,
  popup: 4 / 3,
};

const DEFAULT_RATIO = 970 / 250;

const isPositive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * Yuvanın en/boy oranı: görsel yüklendiyse gerçek oranı (`naturalRatio`);
 * yüklenene kadar kayıtlı `width/height` (yer ayırma — kayma olmasın); o da
 * yoksa konum varsayılanı.
 *
 * Kutu ile görselin oranı AYNI olmalı: tıklanabilir alanlar kutunun yüzdesiyle
 * yerleşir; görsel kutuya kırpılarak (cover) ya da harf kutusuyla (contain)
 * sığarsa alanlar görselden kayar. Kayıtlı ölçü admin'de görselden bağımsız
 * seçilebildiği için yetkili olan görselin kendisidir.
 */
export function adAspectRatio(
  ad: { width: number | null; height: number | null },
  position: string,
  naturalRatio?: number | null,
): number {
  if (isPositive(naturalRatio)) return naturalRatio;
  if (isPositive(ad.width) && isPositive(ad.height)) return ad.width / ad.height;
  return FALLBACK_AD_RATIO[position] ?? DEFAULT_RATIO;
}

/** Görsel yükleme olayındaki ölçüden gerçek oran; okunamazsa null. */
export function naturalRatioOf(
  source: { width?: number; height?: number } | null | undefined,
): number | null {
  return source && isPositive(source.width) && isPositive(source.height)
    ? source.width / source.height
    : null;
}

/**
 * Verilen oranda (`ratio` = en/boy) kutuyu `maxWidth` x `maxHeight` içine
 * sığdırır: oran HER ZAMAN korunur, iki sınır da aşılmaz. Kutu görselin oranını
 * taşıdığı için `contain` kırpma/letterbox yapmaz ve yüzdeyle konumlanan
 * tıklanabilir bölgeler görselin gerçekte kapladığı dikdörtgenle çakışır.
 */
export function fitBox(
  ratio: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const width = Math.min(maxWidth, maxHeight * ratio);
  return { width, height: width / ratio };
}
