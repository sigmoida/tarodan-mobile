import { useMemo } from "react";
import type { TFunction } from "i18next";
import { SectionCard } from "@/ui";
import { useTranslation } from "react-i18next";
import { ContentPage } from "@/components/content/ContentPage";
import { DocList } from "@/components/content/DocBlocks";

type Guide = {
  title: string;
  steps: string[];
};

/**
 * Rehber içerikleri çeviriden geldiği için liste bir FABRİKA: modül
 * seviyesinde kurulsaydı `t` daha hazır olmadan çalışır ve metinler ilk
 * dilde donardı (bkz. `buildQuickActionItems` — aynı gerekçe).
 */
const buildGuides = (t: TFunction): Guide[] => [
  {
    title: t("guides.howToBuy.title"),
    steps: [
      t("guides.howToBuy.step1"),
      t("guides.howToBuy.step2"),
      t("guides.howToBuy.step3"),
      t("guides.howToBuy.step4"),
      t("guides.howToBuy.step5"),
      t("guides.howToBuy.step6"),
      t("guides.howToBuy.step7"),
    ],
  },
  {
    title: t("guides.howToSell.title"),
    steps: [
      t("guides.howToSell.step1"),
      t("guides.howToSell.step2"),
      t("guides.howToSell.step3"),
      t("guides.howToSell.step4"),
      t("guides.howToSell.step5"),
      t("guides.howToSell.step6"),
      t("guides.howToSell.step7"),
      t("guides.howToSell.step8"),
    ],
  },
  {
    title: t("guides.shippingSteps.title"),
    steps: [
      t("guides.shippingSteps.step1"),
      t("guides.shippingSteps.step2"),
      t("guides.shippingSteps.step3"),
      t("guides.shippingSteps.step4"),
      t("guides.shippingSteps.step5"),
      t("guides.shippingSteps.step6"),
      t("guides.shippingSteps.step7"),
      t("guides.shippingSteps.step8"),
    ],
  },
  {
    title: t("guides.tradeGuide"),
    steps: [
      t("guides.tradeSteps.step1"),
      t("guides.tradeSteps.step2"),
      t("guides.tradeSteps.step3"),
      t("guides.tradeSteps.step4"),
      t("guides.tradeSteps.step5"),
      t("guides.tradeSteps.step6"),
      t("guides.tradeSteps.step7"),
      t("guides.tradeSteps.step8"),
      t("guides.tradeSteps.step9"),
    ],
  },
  {
    title: t("guides.collectionGuide.title"),
    steps: [
      t("guides.collectionGuide.step1"),
      t("guides.collectionGuide.step2"),
      t("guides.collectionGuide.step3"),
      t("guides.collectionGuide.step4"),
      t("guides.collectionGuide.step5"),
      t("guides.collectionGuide.step6"),
      t("guides.collectionGuide.step7"),
    ],
  },
  {
    title: t("guides.safetyTips"),
    steps: [
      t("guides.safetySteps.step1"),
      t("guides.safetySteps.step2"),
      t("guides.safetySteps.step3"),
      t("guides.safetySteps.step4"),
      t("guides.safetySteps.step5"),
      t("guides.safetySteps.step6"),
      t("guides.safetySteps.step7"),
    ],
  },
];

/**
 * Rehberler — web `(support)/guides` düzeni: her rehber bir SectionCard, adımlar numaralı
 * liste olarak AÇIK (web'de de açık). Akordeon, rehber başı ikonlar ve numara rozetleri kalktı.
 * Sayfa içi bağlantı çubuğu (web'deki #anchor listesi) mobilde yok.
 */
export default function GuidesScreen() {
  const { t } = useTranslation();
  const guides = useMemo(() => buildGuides(t), [t]);

  return (
    <ContentPage title={t("mobile.pageGuides")} description={t("guides.subtitle")}>
      {guides.map((guide) => (
        <SectionCard key={guide.title} title={guide.title}>
          <DocList ordered small items={guide.steps} />
        </SectionCard>
      ))}
    </ContentPage>
  );
}
