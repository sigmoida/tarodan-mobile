import React from 'react';
import type { ListingFormController } from '../_hooks/useListingForm';

export type ListingFormKey = keyof ListingFormController;
type SectionComponent = (props: { f: ListingFormController }) => React.ReactElement | null;

/**
 * İlan formu bölümünü `React.memo`'lar: controller (`f`) her render'da YENİ nesnedir, bu yüzden
 * karşılaştırma `f`'in kimliğine değil, bölümün OKUDUĞU alanlara bakar (`keys`). Fiyat yazarken
 * yalnız fiyat/kargo kartları, kategori seçerken yalnız ilgili kartlar yeniden çizilir; görsel
 * ızgarası, seçici listeleri vb. olduğu gibi kalır.
 *
 * Kural: `keys` dosyadaki HER `f.<alan>` erişimini kapsar (olay işleyicilerinde okunanlar dahil —
 * eksik anahtar bayat değer/closure demektir). `listingSectionKeys.test.ts` kaynağı tarayıp bunu
 * kilitler. İşleyiciler controller'da referans-kararlıdır (aksi halde memo boşa düşer, hata olmaz).
 */
export function memoSection<C extends SectionComponent>(Comp: C, keys: readonly ListingFormKey[]) {
  const Memo = React.memo(Comp, (prev, next) =>
    keys.every((k) => Object.is(prev.f[k], next.f[k])),
  );
  Memo.displayName = Comp.name;
  return Object.assign(Memo, { fKeys: keys });
}
