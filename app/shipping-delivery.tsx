import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui";
import { InfoPage } from "@/components/common/InfoPage";

/** Kargo ve teslimat — bilgi sayfası (web `DocPage` düzeni) + sipariş takibine bağlantı. */
export default function ShippingDeliveryScreen() {
  const { t } = useTranslation();
  return (
    <InfoPage
      title={t("mobile.pageShipping")}
      pageTitle={t("shippingDeliveryPage.pageTitle")}
      description={t("shippingDeliveryPage.pageSubtitle")}
      sections={[
        {
          title: t("information.shipping.methods"),
          content: t("shippingDeliveryPage.methodsContent"),
        },
        {
          title: t("information.shipping.costs"),
          content: t("shippingDeliveryPage.costsContent"),
        },
        {
          title: t("information.shipping.times"),
          content: t("shippingDeliveryPage.timesContent"),
        },
        {
          title: t("shippingDeliveryPage.trackingTitle"),
          content: t("shippingDeliveryPage.trackingContent"),
        },
      ]}
      footer={
        <Button
          variant="outline"
          fullWidth
          title={t("shippingDeliveryPage.trackLinkText")}
          onPress={() => router.push("/order-track")}
        />
      }
    />
  );
}
