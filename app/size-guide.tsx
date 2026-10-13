import { SectionCard, Text } from "@/ui";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ContentPage } from "@/components/content/ContentPage";
import { DocCard, DocCards, DocNote } from "@/components/content/DocBlocks";

function useScales(t: TFunction) {
  return [
    {
      scale: "1:8",
      length: "~55-65 cm",
      weight: "~3-5 kg",
      description: t("sizeGuidePage.desc8"),
      brands: "Pocher, DeAgostini, GT Spirit",
      priceRange: "5.000 - 50.000+ TL",
    },
    {
      scale: "1:12",
      length: "~35-40 cm",
      weight: "~1.5-3 kg",
      description: t("sizeGuidePage.desc12"),
      brands: "Kyosho, AUTOart, TSM",
      priceRange: "2.000 - 20.000 TL",
    },
    {
      scale: "1:18",
      length: "~25-30 cm",
      weight: "~800g - 1.5 kg",
      description: t("sizeGuidePage.desc18"),
      brands: "AUTOart, CMC, BBR, Maisto, Bburago",
      priceRange: "300 - 15.000 TL",
    },
    {
      scale: "1:24",
      length: "~18-20 cm",
      weight: "~300-500g",
      description: t("sizeGuidePage.desc24"),
      brands: "Maisto, Welly, Jada Toys, Motormax",
      priceRange: "100 - 2.000 TL",
    },
    {
      scale: "1:32",
      length: "~12-15 cm",
      weight: "~100-200g",
      description: t("sizeGuidePage.desc32"),
      brands: "Bburago, Siku, Kinsmart",
      priceRange: "50 - 500 TL",
    },
    {
      scale: "1:36",
      length: "~11-13 cm",
      weight: "~80-150g",
      description: t("sizeGuidePage.desc36"),
      brands: "Kinsmart, Welly, RMZ City",
      priceRange: "30 - 200 TL",
    },
    {
      scale: "1:43",
      length: "~9-11 cm",
      weight: "~50-120g",
      description: t("sizeGuidePage.desc43"),
      brands: "Spark, IXO, Minichamps, Schuco",
      priceRange: "80 - 3.000 TL",
    },
    {
      scale: "1:64",
      length: "~7-8 cm",
      weight: "~30-50g",
      description: t("sizeGuidePage.desc64"),
      brands: "Hot Wheels, Matchbox, Greenlight, Tomica",
      priceRange: "10 - 1.000+ TL",
    },
  ];
}

/**
 * Ölçek rehberi — web `(support)/size-guide` düzeni: sayfa açıklaması + SectionCard içinde
 * kartlar. Ölçek kartlarının vurgu rengi (anlamsız süs), spec ikonları ve ipucu ampulü kalktı.
 */
export default function SizeGuideScreen() {
  const { t } = useTranslation();
  const scales = useScales(t);
  return (
    <ContentPage title={t("mobile.pageSizeGuide")} description={t("sizeGuidePage.intro")}>
      <SectionCard>
        <DocCards>
          {scales.map((item) => (
            <DocCard key={item.scale} title={item.scale} eyebrow={`${item.length} · ${item.weight}`}>
              <Text variant="bodySm" tone="muted">
                {item.description}
              </Text>
              <Text variant="bodySm">
                <Text variant="bodySm" weight="medium" tone="heading">
                  {`${t("sizeGuidePage.brandsLabel")} `}
                </Text>
                {item.brands}
              </Text>
              <Text variant="bodySm">
                <Text variant="bodySm" weight="medium" tone="heading">
                  {`${t("sizeGuidePage.priceRangeLabel")} `}
                </Text>
                {item.priceRange}
              </Text>
            </DocCard>
          ))}
        </DocCards>
      </SectionCard>

      <DocNote>{t("sizeGuidePage.tip")}</DocNote>
    </ContentPage>
  );
}
