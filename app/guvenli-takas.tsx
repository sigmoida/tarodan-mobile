import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, SectionCard, theme } from "@/ui";
import { useTranslation } from "react-i18next";
import { CAN_BUY_DIGITAL } from "@/lib/purchases";
import { ContentPage } from "@/components/content/ContentPage";
import { DocCard, DocCards, DocText } from "@/components/content/DocBlocks";

const STEP_NUMBERS = [1, 2, 3, 4, 5, 6] as const;
const GUARANTEE_KEYS = [1, 2, 3, 4, 5] as const;

/**
 * Güvenli Takas — web `(trust)/secure-swap` düzeni: sayfa açıklaması + SectionCard'lar
 * (Nasıl Çalışır adım kartları, Güvenlik Garantileri, takas bilgisi) + sayfa sonu eylem düğmesi.
 * Adım başlıklarındaki süs ikonları, hero ikonu ve numara/çizgi zaman çizelgesi kalktı; web gibi
 * kartlarda küçük "n" etiketi var. Garanti satırlarındaki onay işareti web'de de aynı yerde.
 */
export default function GuvenliTakasScreen() {
  const { t } = useTranslation();
  return (
    <ContentPage title={t("mobile.pageSafeTrade")} description={t("safeTradePage.heroText")}>
      <SectionCard title={t("safeTradePage.howItWorks")}>
        <DocCards>
          {STEP_NUMBERS.map((n) => (
            <DocCard key={n} eyebrow={String(n)} title={t(`safeTradePage.step${n}Title`)}>
              {t(`safeTradePage.step${n}Desc`)}
            </DocCard>
          ))}
        </DocCards>
      </SectionCard>

      <SectionCard title={t("safeTradePage.securityGuarantees")}>
        <DocCards>
          {GUARANTEE_KEYS.map((n) => (
            <DocCard
              key={n}
              title={t(`safeTradePage.guarantee${n}`)}
              leading={
                <Ionicons
                  name="checkmark-circle"
                  size={theme.iconSize.md}
                  color={theme.colors.primary[500]}
                />
              }
            />
          ))}
        </DocCards>
      </SectionCard>

      {CAN_BUY_DIGITAL ? (
        <SectionCard title={t("safeTradePage.whoCanTrade")}>
          <DocText>{t("safeTradePage.whoCanTradeText")}</DocText>
        </SectionCard>
      ) : null}

      <SectionCard title={t("safeTradePage.cashDiffTitle")}>
        <DocText>{t("safeTradePage.cashDiffText")}</DocText>
      </SectionCard>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        title={t("safeTradePage.ctaText")}
        onPress={() => router.push("/trades")}
      />
    </ContentPage>
  );
}
