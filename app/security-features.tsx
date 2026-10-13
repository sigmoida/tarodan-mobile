import { SectionCard } from "@/ui";
import { useTranslation } from "react-i18next";
import { SECURITY_EMAIL } from "@/constants/legalFacts";
import { CAN_BUY_DIGITAL } from "@/lib/purchases";
import { ContentPage } from "@/components/content/ContentPage";
import { DocBody, DocNote, DocSection, DocText } from "@/components/content/DocBlocks";

function useFeatures() {
  const { t } = useTranslation();
  return [
    { title: t("securityFeatures.sslTitle"), description: t("securityFeatures.sslDesc") },
    {
      title: t("securityFeatures.buyerProtectionTitle"),
      description: t("securityFeatures.buyerProtectionDesc"),
    },
    {
      title: t("securityFeatures.paymentInfraTitle"),
      description: t("securityFeatures.paymentInfraDesc"),
    },
    // iOS: identityDesc names the "Premium satıcılar" tier — item hidden.
    ...(CAN_BUY_DIGITAL
      ? [
          {
            title: t("securityFeatures.identityTitle"),
            description: t("securityFeatures.identityDesc"),
          },
        ]
      : []),
    {
      title: t("information.security.dataPrivacy"),
      description: t("securityFeatures.dataPrivacyDesc"),
    },
    {
      title: t("securityFeatures.messagingTitle"),
      description: t("securityFeatures.messagingDesc"),
    },
    { title: t("mobile.pageSafeTrade"), description: t("securityFeatures.secureTradeDesc") },
    { title: t("securityFeatures.fraudTitle"), description: t("securityFeatures.fraudDesc") },
    {
      title: t("securityFeatures.reportingTitle"),
      description: t("securityFeatures.reportingDesc"),
    },
    { title: t("securityFeatures.ratingTitle"), description: t("securityFeatures.ratingDesc") },
  ];
}

/**
 * Güvenlik özellikleri — web `(trust)/security-features` düzeni: sayfa açıklaması + tek
 * SectionCard içinde başlıklı bölümler. Madde başı ikon kutuları kalktı.
 */
export default function SecurityFeaturesScreen() {
  const { t } = useTranslation();
  const features = useFeatures();
  return (
    <ContentPage
      title={t("mobile.pageSecurityFeatures")}
      description={t("securityFeatures.introText")}
    >
      <SectionCard title={t("securityFeatures.introTitle")}>
        <DocBody>
          {features.map((feature) => (
            <DocSection key={feature.title} title={feature.title}>
              <DocText>{feature.description}</DocText>
            </DocSection>
          ))}
        </DocBody>
      </SectionCard>

      <DocNote>
        {`${t("securityFeatures.footerText")}\n${t("legalContact.emailLabel", { value: SECURITY_EMAIL })}`}
      </DocNote>
    </ContentPage>
  );
}
