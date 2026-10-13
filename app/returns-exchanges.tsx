import { useTranslation } from "react-i18next";
import { InfoPage } from "@/components/common/InfoPage";
import {
  RETURN_REQUEST_DAYS,
  REFUND_PAYOUT_DAYS,
} from "@/constants/legalFacts";

/** İade ve değişim — bilgi sayfası (web `DocPage` düzeni). */
export default function ReturnsExchangesScreen() {
  const { t } = useTranslation();
  return (
    <InfoPage
      title={t("mobile.pageReturns")}
      pageTitle={t("mobile.pageReturns")}
      description={t("returnsExchangesPage.pageSubtitle")}
      sections={[
        {
          title: t("mobile.pageRefundPolicy"),
          content: t("returnsExchangesPage.policyContent", {
            days: RETURN_REQUEST_DAYS,
          }),
        },
        {
          title: t("information.returns.process"),
          content: t("returnsExchangesPage.processContent"),
        },
        {
          title: t("returnsExchangesPage.timelineTitle"),
          content: t("returnsExchangesPage.timelineContent", {
            days: REFUND_PAYOUT_DAYS,
          }),
        },
      ]}
    />
  );
}
