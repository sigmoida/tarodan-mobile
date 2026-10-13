/**
 * Durum varyantı sözlüğü — web `packages/shared/src/status-variant.ts` ile aynı:
 * beş değer, bilerek. `default` marka (primary) tonudur, üçü anlam taşır
 * (success / warning / danger), `outline` nötr olandır (etiket, pasif durum,
 * kategori). Durum haritaları YALNIZ bu beşini kullanır.
 */
export type WebStatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'outline';

/**
 * Rozet bileşeninin kabul ettiği geniş (eski) sözlük. `primary | secondary |
 * info | destructive` web'de yok; yalnız `Badge`'in tip uyumu için duruyor ve
 * `src/ui` bu beşliye indirildiğinde buradan da silinir. Yeni kod
 * `WebStatusVariant` kullanır.
 *
 * @deprecated `WebStatusVariant` kullanın.
 */
export type StatusVariant =
  | WebStatusVariant
  | 'primary'
  | 'secondary'
  | 'info'
  | 'destructive';
