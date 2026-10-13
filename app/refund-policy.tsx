import { SectionCard } from "@/ui";
import { useTranslation } from "react-i18next";
import { ContentPage } from "@/components/content/ContentPage";
import { DocBody, DocList, DocSection, DocSubheading, DocText } from "@/components/content/DocBlocks";
import {
  RETURN_REQUEST_DAYS,
  REFUND_PAYOUT_DAYS,
  DAMAGE_REPORT_DAYS,
  SUPPORT_EMAIL,
} from "@/constants/legalFacts";

export default function RefundPolicyScreen() {
  const { t } = useTranslation();
  return (
    <ContentPage
      title={t("mobile.pageRefundPolicy")}
      description={t("legalContact.lastUpdatedJan2026")}
    >
      <SectionCard>
        <DocBody>
          <DocSection title={t("refundPolicyPage.s1Title")}>
            <DocText small>{t("refundPolicyPage.s1Content", { days: RETURN_REQUEST_DAYS })}</DocText>
          </DocSection>
          <DocSection title={t("refundPolicyPage.s2Title")}>
            <DocList small items={[
              t("refundPolicyPage.s2Item1", { days: RETURN_REQUEST_DAYS }),
              t("refundPolicyPage.s2Item2"),
              t("refundPolicyPage.s2Item3"),
              t("refundPolicyPage.s2Item4"),
              t("refundPolicyPage.s2Item5"),
            ]} />
          </DocSection>
          <DocSection title={t("refundPolicyPage.s3Title")}>
            <DocSubheading>{t("refundPolicyPage.step1Title")}</DocSubheading>
            <DocText small>{t("refundPolicyPage.step1Content")}</DocText>
            <DocSubheading>{t("refundPolicyPage.step2Title")}</DocSubheading>
            <DocText small>{t("refundPolicyPage.step2Content")}</DocText>
            <DocSubheading>{t("refundPolicyPage.step3Title")}</DocSubheading>
            <DocText small>{t("refundPolicyPage.step3Content")}</DocText>
            <DocSubheading>{t("refundPolicyPage.step4Title")}</DocSubheading>
            <DocText small>{t("refundPolicyPage.step4Content", { days: REFUND_PAYOUT_DAYS })}</DocText>
          </DocSection>
          <DocSection title={t("refundPolicyPage.s4Title")}>
            <DocList small items={[
              t("refundPolicyPage.s4Item1"),
              t("refundPolicyPage.s4Item2"),
              t("refundPolicyPage.s4Item3", { days: RETURN_REQUEST_DAYS }),
              t("refundPolicyPage.s4Item4"),
            ]} />
          </DocSection>
          <DocSection title={t("refundPolicyPage.s5Title")}>
            <DocText small>{t("refundPolicyPage.s5Content", { days: DAMAGE_REPORT_DAYS })}</DocText>
          </DocSection>
          <DocSection title={t("refundPolicyPage.s6Title")}>
            <DocText small>{t("refundPolicyPage.s6Content")}</DocText>
          </DocSection>
          <DocSection title={t("refundPolicyPage.s7Title")}>
            <DocText small>{t("refundPolicyPage.s7Content")}</DocText>
          </DocSection>
          <DocSection title={t("refundPolicyPage.s8Title")}>
            <DocText small>{t("refundPolicyPage.s8Content")}</DocText>
            <DocText small>{t("legalContact.emailLabel", { value: SUPPORT_EMAIL })}</DocText>
          </DocSection>
        </DocBody>
      </SectionCard>
    </ContentPage>
  );
}
