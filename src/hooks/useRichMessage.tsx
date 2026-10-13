import React from 'react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '@/i18n/config';
import type { MessageKey } from '@/i18n/lib';

/** Etiket adı → parçayı (etiketin içindeki metni) düğüme çeviren işlev. */
export type RichTags = Record<string, (chunks: string) => React.ReactNode>;

const TAG_PATTERN = /<(\w+)>(.*?)<\/\1>/g;

/**
 * Web `t.rich` karşılığı. Katalog metni `<terms>Kullanım Şartları</terms> ve …` biçiminde
 * etiket taşır (next-intl rich text); i18next-icu etiketleri işlemez, bu yüzden ham şablon
 * okunur, etiketler `tags` ile düğüme çevrilir, geri kalan düz metin olarak bırakılır.
 * Bilinmeyen etiket düz metin olarak kalır. ICU kaçışı (`''` → `'`) çözülür.
 */
export function renderRichMessage(template: string, tags: RichTags): React.ReactNode[] {
  const source = template.replace(/''/g, "'");
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const match of source.matchAll(TAG_PATTERN)) {
    const [whole, name, chunks] = match;
    const start = match.index ?? 0;
    if (start > last) out.push(source.slice(last, start));
    const render = tags[name];
    out.push(
      render ? <React.Fragment key={`${name}-${start}`}>{render(chunks)}</React.Fragment> : chunks,
    );
    last = start + whole.length;
  }
  if (last < source.length) out.push(source.slice(last));
  return out;
}

/** Aktif dildeki etiketli katalog metnini `tags` ile çizer; dil değişince yeniden render olur. */
export function useRichMessage(key: MessageKey, tags: RichTags): React.ReactNode[] {
  // Abonelik: dil değişince bileşen yeniden çizilsin.
  useTranslation();
  const raw = i18nInstance.getResource(i18nInstance.language, 'translation', key);
  const template = typeof raw === 'string' ? raw : i18nInstance.t(key);
  return renderRichMessage(template, tags);
}
