import { useTranslation } from "react-i18next";
import { Text } from "@/ui";
import { ContentPage } from "@/components/content/ContentPage";
import { DocBody, DocSection, DocText } from "@/components/content/DocBlocks";

// Metinler katalogda (`aboutPage.*`) — eskiden sabit Türkçe idi, İngilizce
// cihazda (App Review) sayfanın tamamı Türkçe görünüyordu.
const ABOUT_SECTIONS = ["story", "mission", "values"] as const;

/**
 * Hakkımızda — web `(corporate)/about` gibi kartsız, doğrudan sayfa yüzeyinde akan anlatı:
 * öne çıkan açılış cümlesi (text-lg font-medium) + bölümler. Başlık üst barda.
 */
export default function AboutScreen() {
  const { t } = useTranslation();
  return (
    <ContentPage title={t("mobile.pageAbout")}>
      <DocBody>
        <Text variant="h3" weight="medium">
          {t("aboutPage.subtitle")}
        </Text>
        {ABOUT_SECTIONS.map((key) => (
          <DocSection key={key} title={t(`aboutPage.${key}Title`)}>
            <DocText>{t(`aboutPage.${key}Text`)}</DocText>
          </DocSection>
        ))}
      </DocBody>
    </ContentPage>
  );
}
