import { SectionCard } from "@/ui";
import { useTranslation } from "react-i18next";
import { ContentPage } from "@/components/content/ContentPage";
import { DocBody, DocList, DocSection, DocSubheading, DocText } from "@/components/content/DocBlocks";
import { IP_EMAIL, LEGAL_ENTITY } from "@/constants/legalFacts";

export default function IntellectualPropertyScreen() {
  const { t } = useTranslation();
  return (
    <ContentPage
      title={t("mobile.pageIp")}
      description={t("legalContact.lastUpdatedJan2026")}
    >
      <SectionCard>
        <DocBody>
          <DocSection title={t("ipPage.s1Title")}>
            <DocText small>{t("ipPage.s1Content", { entity: LEGAL_ENTITY.legalName })}</DocText>
          </DocSection>
          <DocSection title={t("ipPage.s2Title")}>
            <DocText small>{t("ipPage.s2Content")}</DocText>
          </DocSection>
          <DocSection title={t("ipPage.s3Title")}>
            <DocText small>{t("ipPage.s3Content1")}</DocText>
            <DocText small>{t("ipPage.s3Content2")}</DocText>
          </DocSection>
          <DocSection title={t("ipPage.s4Title")}>
            <DocText small>{t("ipPage.s4Content")}</DocText>
          </DocSection>
          <DocSection title={t("ipPage.s5Title")}>
            <DocText small>{t("ipPage.s5Intro")}</DocText>
            <DocList small items={[
              t("ipPage.s5Item1"),
              t("ipPage.s5Item2"),
              t("ipPage.s5Item3"),
              t("ipPage.s5Item4"),
              t("ipPage.s5Item5"),
            ]} />
          </DocSection>
          <DocSection title={t("ipPage.s6Title")}>
            <DocText small>{t("ipPage.s6Intro")}</DocText>
            <DocList small items={[
              t("ipPage.s6Item1"),
              t("ipPage.s6Item2"),
              t("ipPage.s6Item3"),
            ]} />
          </DocSection>
          <DocSection title={t("ipPage.s7Title")}>
            <DocText small>{t("ipPage.s7Content")}</DocText>
          </DocSection>
          <DocSection title={t("ipPage.s8Title")}>
            <DocList small items={[
              t("ipPage.s8Item1"),
              t("ipPage.s8Item2"),
              t("ipPage.s8Item3"),
              t("ipPage.s8Item4"),
            ]} />
          </DocSection>
          <DocSection title={t("ipPage.s9Title")}>
            <DocText small>{t("ipPage.s9Intro")}</DocText>
            <DocText small>{t("legalContact.emailLabel", { value: IP_EMAIL })}</DocText>
            <DocText small>{t("legalContact.addressLabel", {
            value: t("information.contactInfo.addressValue"),
          })}</DocText>
          </DocSection>
        </DocBody>
      </SectionCard>
    </ContentPage>
  );
}
