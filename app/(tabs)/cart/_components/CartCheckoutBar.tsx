import { View, type LayoutChangeEvent } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Button, Text, usePageGutter } from "@/ui";
import { formatServerPrice } from "@/utils/format";
import { styles } from "../_lib/styles";
import type { CartController } from "../_hooks/useCart";

interface Props {
  f: CartController;
  /** Yüzen alt menünün üst kenarının ekran altından uzaklığı (`useTabBarTop`). */
  bottom: number;
  onLayout: (e: LayoutChangeEvent) => void;
}

/**
 * Sepetin sabit "Ödemeye Geç" çubuğu (toplamla birlikte). Sepet bir sekme kökü olduğundan çubuk
 * ekranın dibinde değil, yüzen alt menünün HEMEN ÜSTÜNDE durur (kart görünümlü, kenar boşluklu);
 * liste alt dolgusunu çubuğun ölçülen yüksekliği kadar artırır (`onLayout`). `wide` (medium
 * windows): the button keeps its natural width at the right instead of stretching.
 */
export function CartCheckoutBar({
  f,
  bottom,
  onLayout,
  wide = false,
}: Props & { wide?: boolean }) {
  // The bar sits at the page gutter, like the cart body (wider on tablets).
  const side = usePageGutter();
  return (
    <View
      style={[
        styles.checkoutCard,
        styles.checkoutBarWrap,
        { bottom, left: side, right: side },
      ]}
      onLayout={onLayout}
      testID="cart-checkout-bar"
    >
      <CartCheckoutAction f={f} wide={wide} />
    </View>
  );
}

/**
 * The checkout action: the server total and "Ödemeye Geç". ONE copy of the amount and the gate,
 * drawn in the floating bar (phones, medium) and in the summary panel (expanded and up).
 */
export function CartCheckoutAction({
  f,
  wide = false,
}: {
  f: CartController;
  wide?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.checkoutBar, wide && styles.checkoutBarWide]}>
      <View style={styles.checkoutTotal}>
        <Text variant="caption" tone="muted">
          {t("common.total")}
        </Text>
        {/* Sunucu toplamı gelmeden tutar basılmaz — yerel sayı uydurmak yerine yer tutucu
              (ödeme adımında tutar zaten yeniden doğrulanır). */}
        <Text
          variant="h3"
          weight="bold"
          tone="primary"
          testID="cart-checkout-total"
        >
          {formatServerPrice(f.total)}
        </Text>
      </View>
      {/* Fiyat alınamadıysa ilerletme: checkout aynı queryKey'i paylaştığı için kullanıcı orada
            da ErrorState'e düşer — burada durdurup özet kartında "Tekrar Dene"ye yönlendir.
            `total == null` de kapıya dahil (checkout'un kapısıyla simetrik): quote 200 dönüp
            `total` boş gelirse hata yok ama tutar da yok. */}
      <Button
        testID="cart-checkout-button"
        variant="primary"
        size="lg"
        title={t("cart.proceedToCheckout")}
        style={wide ? styles.checkoutButtonWide : styles.checkoutButton}
        disabled={f.quoteError || f.total == null || f.selectedCount === 0}
        onPress={() => router.push("/checkout")}
      />
    </View>
  );
}
