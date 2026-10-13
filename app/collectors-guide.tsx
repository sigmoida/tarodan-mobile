import { SectionCard } from "@/ui";
import { useTranslation } from "react-i18next";
import { ContentPage } from "@/components/content/ContentPage";
import { DocBody, DocSection, DocText } from "@/components/content/DocBlocks";

/** Bölüm anahtarları (`information.collectorsGuide.<key>` + `<key>Desc`) — web ile aynı sıra. */
const SECTIONS = ["tips", "grading", "storage", "valuation"] as const;

/**
 * Koleksiyoner Rehberi sayfası. Web karşılığı: `(support)/collectors-guide` (DocPage + SectionCard).
 * İçerik information.collectorsGuide.* i18n namespace'inden gelir (web ile aynı).
 */
export default function CollectorsGuideScreen() {
  const { t } = useTranslation();

  return (
    <ContentPage
      title={t("information.collectorsGuide.title")}
      description={t("information.collectorsGuide.subtitle")}
    >
      <SectionCard>
        <DocBody>
          {SECTIONS.map((key) => (
            <DocSection key={key} title={t(`information.collectorsGuide.${key}`)}>
              <DocText>{t(`information.collectorsGuide.${key}Desc`)}</DocText>
            </DocSection>
          ))}
        </DocBody>
      </SectionCard>
    </ContentPage>
  );
}
