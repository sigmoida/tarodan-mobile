import { SectionCard } from "@/ui";
import { useTranslation } from "react-i18next";
import { ContentPage } from "@/components/content/ContentPage";
import { DocBody, DocSection, DocText } from "@/components/content/DocBlocks";

/** Bölüm anahtarları (`information.authenticity.<key>` + `<key>Desc`) — web ile aynı sıra. */
const SECTIONS = ["process", "protection", "badges"] as const;

/**
 * Orijinallik Garantisi sayfası. Web karşılığı: `(trust)/authenticity` (DocPage + tek SectionCard).
 * İçerik information.authenticity.* i18n namespace'inden gelir (web ile aynı anahtarlar).
 */
export default function AuthenticityScreen() {
  const { t } = useTranslation();

  return (
    <ContentPage
      title={t("information.authenticity.title")}
      description={t("information.authenticity.subtitle")}
    >
      <SectionCard>
        <DocBody>
          {SECTIONS.map((key) => (
            <DocSection key={key} title={t(`information.authenticity.${key}`)}>
              <DocText>{t(`information.authenticity.${key}Desc`)}</DocText>
            </DocSection>
          ))}
        </DocBody>
      </SectionCard>
    </ContentPage>
  );
}
