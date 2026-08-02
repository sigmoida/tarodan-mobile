import { View } from 'react-native';
import { Divider, ErrorState, Text, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import { formatServerPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import type { CartController } from '../_hooks/useCart';

const { colors } = theme;

/**
 * Sipariş özeti kartı + (misafir ise) misafir-checkout bilgisi.
 *
 * Checkout'un `OrderSummary`'siyle AYNI disiplin: dört satır da
 * `pricing.summary`'den aynen basılır, istemcide hiçbir toplama/çıkarma yapılmaz.
 * Sunucu değeri yoksa tutar yerine yer tutucu — yerel `getSubtotal()` sonucunu
 * "Toplam" diye basmak, hiçbir sunucu alanına karşılık gelmeyen bir para değeri
 * göstermek demekti.
 */
export function CartSummary({ f }: { f: CartController }) {
  return (
    <>
      {/* Quote hata verdiyse dört satırı da "—" basıp kullanıcıyı sebepsiz
          bırakma — checkout'un `OrderSummary`'siyle AYNI çıkış yolu (§11).
          `total == null` de bu kapıya dahil: sorgu 200 dönüp `total` alanı boş
          gelirse `quoteError` false olur, buton yine kapalıdır (bkz. index.tsx)
          ama kullanıcı yalnız dört "—" görür ve elinde retry KALMAZ.
          ⚠️ `quoteLoading` şart: ilk yüklemede `total` zaten null, o kapı olmadan
          her sepet açılışında hata kartı yanıp sönerdi. */}
      {f.quoteError || (!f.quoteLoading && f.total == null) ? (
        <View style={styles.summary} testID="cart-summary-error">
          <ErrorState
            title="Fiyat bilgisi alınamadı"
            message="Sepet tutarı sunucudan alınamadı. Bağlantınızı kontrol edip tekrar deneyin."
            onRetry={f.retryQuote}
          />
        </View>
      ) : (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Sipariş Özeti</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ara Toplam ({f.itemCount} ürün)</Text>
            <Text style={styles.summaryValue}>{formatServerPrice(f.productAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kargo</Text>
            <Text style={styles.summaryValue}>{formatServerPrice(f.shippingAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform Hizmet Bedeli</Text>
            <Text style={styles.summaryValue}>{formatServerPrice(f.serviceFeeAmount)}</Text>
          </View>
          <Divider style={{ marginVertical: theme.spacing[3] }} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalValue} testID="cart-summary-total">
              {formatServerPrice(f.total)}
            </Text>
          </View>
        </View>
      )}

      {/* Guest Checkout Info — yalnızca giriş yapmamış kullanıcılara göster */}
      {!f.isAuthenticated && (
        <View style={styles.guestInfo}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info[600]!} />
          <Text style={styles.guestInfoText}>
            Üye olmadan da alışveriş yapabilirsiniz. Siparişinizi e-posta ile takip edebilirsiniz.
          </Text>
        </View>
      )}
    </>
  );
}
