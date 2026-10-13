import { useMemo, useState } from "react";
import { router } from "expo-router";
import type { TFunction } from "i18next";
import { Button, SectionCard, theme } from "@/ui";
import { useTranslation } from "react-i18next";
import { ContentPage } from "@/components/content/ContentPage";
import { DocAccordionItem, DocText } from "@/components/content/DocBlocks";
import { DAMAGE_REPORT_DAYS } from "@/constants/legalFacts";
import { useTimingValues } from "@/hooks/useTimingPolicy";
import type { TimingMessageValues } from "@/lib/shared/timingPolicy";
import { CAN_BUY_DIGITAL } from "@/lib/purchases";

type FaqItem = { q: string; a: string };
type FaqSection = { category: string; questions: FaqItem[] };

/**
 * SSS içerikleri çeviriden geldiği için liste bir FABRİKA (bkz. `guides.tsx` /
 * `buildQuickActionItems`). Birkaç soru/cevap burada ve `help/_lib/faq.ts`de
 * (Yardım Merkezi) neredeyse birebir tekrar ediyordu; ortak olanlar tek
 * kaynağa (`faqShared.*`) taşındı, yalnız bu ekrana özgü olanlar `faqPage.*`de.
 *
 * Süreler (iade penceresi, hazırlık süresi) admin'in Süreler ve Kurallar
 * ekranından gelir (`GET /timing-rules`) — sabit 14 gün değil.
 */
const buildFaqSections = (t: TFunction, timing: TimingMessageValues): FaqSection[] => [
  {
    category: t("faq.buying"),
    questions: [
      { q: t("faqPage.buying.howToOrder.q"), a: t("faqPage.buying.howToOrder.a") },
      { q: t("faqShared.guestCheckout.q"), a: t("faqShared.guestCheckout.a") },
      { q: t("faqShared.paymentMethods.q"), a: t("faqShared.paymentMethods.a") },
      { q: t("faqPage.buying.offer.q"), a: t("faqPage.buying.offer.a") },
    ],
  },
  {
    category: t("faqShared.categories.selling"),
    questions: [
      { q: t("faqShared.howToList.q"), a: t("faqShared.howToList.a") },
      { q: t("faqShared.commissionRate.q"), a: t("faqShared.commissionRate.a") },
      // Ödeme: teslim + iade penceresi + payout grace (alıcı onayı öne çekmez).
      { q: t("faqShared.payoutTiming.q"), a: t("faqShared.payoutTiming.a", timing) },
      // iOS: mentions Premium/Pro tiers by name (Apple 3.1.1/3.1.3) — hidden.
      ...(CAN_BUY_DIGITAL
        ? [{ q: t("faqPage.selling.listingLimit.q"), a: t("faqPage.selling.listingLimit.a") }]
        : []),
    ],
  },
  {
    category: t("faq.shipping"),
    questions: [
      {
        q: t("faqPage.shipping.deliveryTime.q"),
        a: t("faqPage.shipping.deliveryTime.a", timing),
      },
      { q: t("faqPage.shipping.whoPaysShipping.q"), a: t("faqPage.shipping.whoPaysShipping.a") },
      { q: t("faqShared.orderTracking.q"), a: t("faqShared.orderTracking.a") },
    ],
  },
  {
    category: t("faq.trade"),
    questions: [
      // iOS: both mention Premium membership by name — hidden.
      ...(CAN_BUY_DIGITAL
        ? [{ q: t("faqShared.howTradeWorks.q"), a: t("faqShared.howTradeWorks.a") }]
        : []),
      { q: t("faqShared.tradeSafety.q"), a: t("faqShared.tradeSafety.a") },
      ...(CAN_BUY_DIGITAL
        ? [{ q: t("faqPage.trade.tradeFee.q"), a: t("faqPage.trade.tradeFee.a") }]
        : []),
    ],
  },
  {
    category: t("faqPage.categories.returns"),
    questions: [
      {
        q: t("faqPage.returns.returnWindow.q"),
        a: t("faqPage.returns.returnWindow.a", { days: timing.returnWindowDays }),
      },
      {
        q: t("faqPage.returns.damagedItem.q"),
        a: t("faqPage.returns.damagedItem.a", { days: DAMAGE_REPORT_DAYS }),
      },
      { q: t("faqPage.returns.cancelOrder.q"), a: t("faqPage.returns.cancelOrder.a") },
    ],
  },
  {
    category: t("faqPage.categories.account"),
    questions: [
      // iOS: describes paid-tier benefits by name — hidden.
      ...(CAN_BUY_DIGITAL
        ? [{ q: t("faqShared.premiumBenefits.q"), a: t("faqShared.premiumBenefits.a") }]
        : []),
      { q: t("faqShared.forgotPassword.q"), a: t("faqShared.forgotPassword.a") },
      { q: t("faqShared.deleteAccount.q"), a: t("faqShared.deleteAccount.a") },
    ],
  },
];

/**
 * SSS — web `(support)/faq` düzeni: her kategori bir SectionCard. Web cevapları açık gösterir;
 * telefonda ~20 soruyu kısa tutmak için soru satırına dokununca açılır (tek açık soru).
 * Soru satırlarındaki oku işlev taşır; destek bağlantısı düğmesindeki ikon kalktı.
 */
export default function FAQScreen() {
  const { t } = useTranslation();
  const timing = useTimingValues();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const faqSections = useMemo(() => buildFaqSections(t, timing), [t, timing]);

  return (
    <ContentPage title={t("mobile.pageFaq")}>
      {faqSections.map((section, sectionIndex) => (
        <SectionCard key={section.category} title={section.category}>
          {section.questions.map((item, index) => {
            const key = `${sectionIndex}-${index}`;
            return (
              <DocAccordionItem
                key={key}
                question={item.q}
                answer={item.a}
                expanded={expandedKey === key}
                onToggle={() => setExpandedKey(expandedKey === key ? null : key)}
              />
            );
          })}
        </SectionCard>
      ))}

      <SectionCard>
        <DocText tone="muted">{t("faqPage.footer.noAnswer")}</DocText>
        <Button
          variant="primary"
          fullWidth
          title={t("faqPage.footer.contactSupport")}
          onPress={() => router.push("/support")}
          style={{ marginTop: theme.spacing[3] }}
        />
      </SectionCard>
    </ContentPage>
  );
}
