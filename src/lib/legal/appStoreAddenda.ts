import type { LegalPart, Translate } from "./types";

/**
 * Mağaza kuralı gereği mobil kullanım koşullarına EKLENEN bölüm — web metninde
 * yok. Apple 1.2 (kullanıcı içeriği): koşullar uygunsuz içeriğe ve kötü
 * niyetli kullanıcılara sıfır tolerans olduğunu, şikayet/engelleme yolunu ve
 * 24 saatlik inceleme taahhüdünü açıkça söylemeli. Metin YENİ yazılmadı:
 * mobilin eski koşullar sayfasında zaten yayımlanan `termsPage.s10ZeroTolerance`
 * maddesidir. Web'e de eklenirse bu ek kaldırılmalı (hukuk + web ekibi).
 */
export const termsAppStoreAddendum = (t: Translate): LegalPart => ({
  title: t("legal.appContentRulesTitle"),
  sections: [
    {
      number: "1",
      heading: t("legal.appContentRulesHeading"),
      blocks: [{ type: "note", text: t("termsPage.s10ZeroTolerance") }],
    },
  ],
});
