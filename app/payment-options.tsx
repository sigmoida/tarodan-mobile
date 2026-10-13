import { useTranslation } from "react-i18next";
import { InfoPage } from "@/components/common/InfoPage";

/** Ödeme seçenekleri — web `PaymentOptionsClient`: üç bölüm, güvenlik başlığında kalkan ikonu. */
export default function PaymentOptionsScreen() {
  const { t } = useTranslation();
  return (
    <InfoPage
      title={t("mobile.pagePaymentOptions")}
      description={t("paymentOptionsPage.pageSubtitle")}
      sections={[
        {
          title: t("paymentOptionsPage.acceptedTitle"),
          content: t("paymentOptionsPage.acceptedContent"),
        },
        {
          icon: "shield-check",
          title: t("paymentOptionsPage.securityTitle"),
          content: t("paymentOptionsPage.securityContent"),
        },
        {
          title: t("paymentOptionsPage.installmentsTitle"),
          content: t("paymentOptionsPage.installmentsContent"),
        },
      ]}
    />
  );
}
