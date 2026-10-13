import type { MessageKey } from "@/i18n/lib/generated/keys";

/**
 * Hukuki metinlerin yapısı — web `apps/web/src/components/legal/LegalDocument.tsx`
 * tipleriyle BİREBİR aynı. İçerik `privacy.ts` / `terms.ts` / `distanceSales.ts`
 * dosyalarında (web `_lib`'lerinin kopyası), çizim `@/components/legal/LegalDocument`.
 */
export type LegalBlock =
  | { type: "p"; text: string }
  /** Düz madde listesi; `label` verilen maddede etiket kalın basılır. */
  | { type: "list"; items: { label?: string; text: string }[] }
  /** Başlıklı alt gruplar (ör. veri kategorilerinin ilgili kişi grubuna göre dökümü). */
  | { type: "groups"; groups: { title: string; items: string[] }[] }
  /** Siparişe/kişiye özel, metinde sabit olmayan alanlar. */
  | {
      type: "fields";
      intro?: string;
      items: { label: string; value?: string }[];
    }
  /** Vurgulanan uyarı/onay cümlesi. */
  | { type: "note"; text: string };

export interface LegalSection {
  /** Madde numarası (ör. "1", "6.1", "2.3"). */
  number: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalPart {
  title: string;
  intro?: string;
  /**
   * Numaralı madde olmadan doğrudan kartın gövdesi. MOBİL EKİ: web'in çerez
   * sayfası `LegalDocument` değil, başlığı numaralı kartlar (`SectionCard`)
   * kullanıyor; native kopyası her kartı bir bölüm + bloklar olarak çizer.
   */
  blocks?: LegalBlock[];
  sections: LegalSection[];
}

/**
 * Web'deki `Translate` (next-intl `t`) karşılığı. Anahtar `MessageKey` ile
 * tiplenir: kopyalanan metinde katalogda olmayan bir anahtar derlemeyi kırar.
 */
export type Translate = (
  key: MessageKey,
  values?: Record<string, string | number>,
) => string;
