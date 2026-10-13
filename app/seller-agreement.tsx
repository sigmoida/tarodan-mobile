import { SectionCard } from "@/ui";
import { useTranslation } from "react-i18next";
import { ContentPage } from "@/components/content/ContentPage";
import { DocBody, DocList, DocSection, DocSubheading, DocText } from "@/components/content/DocBlocks";
import { SELLER_SUPPORT_EMAIL, LEGAL_ENTITY } from "@/constants/legalFacts";

export default function SellerAgreementScreen() {
  const { t } = useTranslation();
  return (
    <ContentPage
      title={t("mobile.pageSellerAgreement")}
      description={t("legalContact.lastUpdatedJan2026")}
    >
      <SectionCard>
        <DocBody>
          <DocSection title={t("sellerAgreementPage.s1Title")}>
            <DocText small>{t("sellerAgreementPage.s1Content", {
            legalName: LEGAL_ENTITY.legalName,
          })}</DocText>
          </DocSection>
          <DocSection title={t("sellerAgreementPage.s2Title")}>
            <DocText small>{t("sellerAgreementPage.s2Content")}</DocText>
          </DocSection>
          <DocSection title={t("sellerAgreementPage.s3Title")}>
            <DocList small items={[
              t("sellerAgreementPage.s3Item1"),
              t("sellerAgreementPage.s3Item2"),
              t("sellerAgreementPage.s3Item3"),
              t("sellerAgreementPage.s3Item4"),
              t("sellerAgreementPage.s3Item5"),
              t("sellerAgreementPage.s3Item6"),
              t("sellerAgreementPage.s3Item7"),
            ]} />
          </DocSection>
          <DocSection title={t("sellerAgreementPage.s4Title")}>
            <DocList small items={[
              t("sellerAgreementPage.s4Item1"),
              t("sellerAgreementPage.s4Item2"),
              t("sellerAgreementPage.s4Item3"),
              t("sellerAgreementPage.s4Item4"),
            ]} />
          </DocSection>
          <DocSection title={t("sellerAgreementPage.s5Title")}>
            <DocText small>{t("sellerAgreementPage.s5Content")}</DocText>
            <DocList small items={[
              t("sellerAgreementPage.s5Item1"),
              t("sellerAgreementPage.s5Item2"),
              t("sellerAgreementPage.s5Item3"),
            ]} />
          </DocSection>
          <DocSection title={t("sellerAgreementPage.s6Title")}>
            <DocText small>{t("sellerAgreementPage.s6Content")}</DocText>
          </DocSection>
          <DocSection title={t("sellerAgreementPage.s7Title")}>
            <DocText small>{t("sellerAgreementPage.s7Content")}</DocText>
          </DocSection>
          <DocSection title={t("sellerAgreementPage.s8Title")}>
            <DocList small items={[
              t("sellerAgreementPage.s8Item1"),
              t("sellerAgreementPage.s8Item2"),
              t("sellerAgreementPage.s8Item3"),
              t("sellerAgreementPage.s8Item4"),
              t("sellerAgreementPage.s8Item5"),
            ]} />
          </DocSection>
          <DocSection title={t("sellerAgreementPage.s9Title")}>
            <DocText small>{t("sellerAgreementPage.s9Content")}</DocText>
          </DocSection>
          <DocSection title={t("sellerAgreementPage.s10Title")}>
            <DocText small>{t("sellerAgreementPage.s10Content")}</DocText>
            <DocText small>{t("legalContact.contactLabel", { value: SELLER_SUPPORT_EMAIL })}</DocText>
          </DocSection>
        </DocBody>
      </SectionCard>
    </ContentPage>
  );
}
