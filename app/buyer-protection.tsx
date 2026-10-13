import { router } from "expo-router";
import { SectionCard } from "@/ui";
import { useTranslation } from "react-i18next";
import { SUPPORT_EMAIL } from "@/constants/legalFacts";
import { ContentPage } from "@/components/content/ContentPage";
import {
  DocBody,
  DocLink,
  DocLinks,
  DocSection,
  DocText,
} from "@/components/content/DocBlocks";

const SECTION_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * Alıcı Koruma — web `(trust)/buyer-protection` düzeni: sayfa açıklaması (son güncelleme) +
 * tek SectionCard içinde numaralı bölümler + altta ilgili sayfa bağlantıları. Koyu hero
 * bandı ve bölüm ikonları kalktı.
 */
export default function BuyerProtectionScreen() {
  const { t } = useTranslation();
  const sections = SECTION_NUMBERS.map((n) => ({
    title: t(`buyerProtectionPage.s${n}Title`),
    content:
      n === 7
        ? t("buyerProtectionPage.s7Content", { email: SUPPORT_EMAIL })
        : t(`buyerProtectionPage.s${n}Content`),
  }));

  return (
    <ContentPage
      title={t("mobile.pageBuyerProtection")}
      description={t("buyerProtectionPage.lastUpdated")}
    >
      <SectionCard title={t("buyerProtectionPage.heroTitle")}>
        <DocBody>
          {sections.map((section) => (
            <DocSection key={section.title} title={section.title}>
              <DocText>{section.content}</DocText>
            </DocSection>
          ))}
        </DocBody>

        <DocLinks>
          <DocLink
            label={t("mobile.pageRefundPolicy")}
            onPress={() => router.push("/refund-policy" as never)}
          />
          <DocLink
            label={t("mobile.pageReturns")}
            onPress={() => router.push("/returns-exchanges" as never)}
          />
          <DocLink label={t("legal.termsTitle")} onPress={() => router.push("/terms")} />
        </DocLinks>
      </SectionCard>
    </ContentPage>
  );
}
