import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Alert, Button, Checkbox, Text } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { formatServerPrice } from '@/utils/format';
import { useCart } from './_hooks/useCart';
import { styles } from './_lib/styles';
import { CartItemRow } from './_components/CartItemRow';
import { CartSummary } from './_components/CartSummary';

/**
 * Sepet — web CartClient'ın telefon görünümü: "Sepetim" başlığı (alt başlıkta ürün sayısı), toplu
 * seçim, satır kartları, sipariş özeti kartı; "Ödemeye Geç" sabit alt barda (toplamla birlikte).
 * Mantık `useCart`'ta.
 */
export default function CartScreen() {
  const { t } = useTranslation();
  const f = useCart();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (f.items.length === 0) {
    return (
      <PageShell
        title={t('cart.myCart')}
        onBack={back}
        empty
        emptyState={{
          icon: 'cart-outline',
          title: t('cart.empty'),
          description: t('cart.emptyDesc'),
          actionLabel: t('cart.browseListings'),
          onAction: () => router.replace('/'),
        }}
      />
    );
  }

  return (
    <PageShell
      title={t('cart.myCart')}
      subtitle={`${f.itemCount} ${t('collection.items')}`}
      onBack={back}
      footer={
        <View style={styles.checkoutBar}>
          <View style={styles.checkoutTotal}>
            <Text variant="caption" tone="muted">{t('common.total')}</Text>
            {/* Sunucu toplamı gelmeden tutar basılmaz — yerel sayı uydurmak yerine yer tutucu
                (ödeme adımında tutar zaten yeniden doğrulanır). */}
            <Text variant="h3" weight="bold" tone="primary" testID="cart-checkout-total">
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
            title={t('cart.proceedToCheckout')}
            style={styles.checkoutButton}
            disabled={f.quoteError || f.total == null || f.selectedCount === 0}
            onPress={() => router.push('/checkout')}
          />
        </View>
      }
    >
      <Alert variant="warning">{t('cart.expiryNotice')}</Alert>

      {/* Toplu seçim — sepette birden fazla satır varken anlamlı. */}
      {f.items.length > 1 ? (
        <View style={styles.selectAllRow}>
          <Checkbox
            testID="cart-select-all"
            checked={f.allSelected}
            onChange={f.toggleSelectAll}
            label={t('cart.selectAllItems')}
          />
          <Text variant="bodySm" tone="muted" style={styles.selectAllCount}>
            {t('cart.selectedCount', { count: f.selectedCount })}
          </Text>
        </View>
      ) : null}

      {f.items.map((item) => (
        <CartItemRow key={item.id} item={item} f={f} />
      ))}

      <CartSummary f={f} />
    </PageShell>
  );
}
