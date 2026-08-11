import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text, theme, ScreenHeader } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatServerPrice } from '@/utils/format';
import { useCart } from './_hooks/useCart';
import { styles } from './_lib/styles';
import { CartItemRow } from './_components/CartItemRow';
import { CartSummary } from './_components/CartSummary';

const { colors } = theme;

export default function CartScreen() {
  const { t } = useTranslation();
  const f = useCart();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (f.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ScreenHeader title={t('cart.myCart')} onBack={back} />
        <View style={styles.emptyContent}>
          <Ionicons name="cart-outline" size={80} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>{t('cart.empty')}</Text>
          <Text style={styles.emptySubtitle}>{t('cart.emptyDesc')}</Text>
          <Button
            variant="primary"
            title={t('cart.browseListings')}
            onPress={() => router.replace('/')}
            style={{ marginTop: theme.spacing[6], alignSelf: 'center' }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('cart.myCartWithCount', { count: f.itemCount })} onBack={back} />

      {/* Expiry Notice */}
      <View style={styles.expiryNotice}>
        <Ionicons name="time-outline" size={16} color={colors.warning[600]!} />
        <Text style={styles.expiryText}>{t('cart.expiryNotice')}</Text>
      </View>

      {/* Toplu seçim — sepette birden fazla satır varken anlamlı. */}
      {f.items.length > 1 ? (
        <TouchableOpacity
          testID="cart-select-all"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: f.allSelected }}
          onPress={f.toggleSelectAll}
          style={styles.selectAllRow}
        >
          <Ionicons
            name={f.allSelected ? 'checkbox' : 'square-outline'}
            size={22}
            color={f.allSelected ? colors.primary[600]! : colors.text.muted}
          />
          <Text style={styles.selectAllLabel}>{t('cart.selectAllItems')}</Text>
          <Text style={styles.selectAllCount}>
            {t('cart.selectedCount', { count: f.selectedCount })}
          </Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {f.items.map((item) => (
          <CartItemRow key={item.id} item={item} f={f} />
        ))}

        <CartSummary f={f} />

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.checkoutBar}>
        <View style={styles.checkoutTotal}>
          <Text style={styles.checkoutLabel}>{t('common.total')}</Text>
          {/* Sunucu toplamı gelmeden tutar basılmaz — yerel bir sayı uydurmak
              yerine yer tutucu (ödeme adımında tutar zaten yeniden doğrulanır). */}
          <Text style={styles.checkoutPrice} testID="cart-checkout-total">
            {formatServerPrice(f.total)}
          </Text>
        </View>
        {/* Fiyat alınamadıysa ilerletme: checkout aynı queryKey'i paylaştığı için
            kullanıcı orada da ErrorState'e düşer — bir adım öteye taşımak yerine
            burada durdurup "Tekrar Dene"ye yönlendir (özet kartında).
            `total == null` de kapıya dahil: quote 200 dönüp `total` alanı boş
            gelirse hata yok ama tutar da yok — checkout'un kapısıyla simetrik
            (`app/checkout/index.tsx`), yoksa kullanıcı orada hata kartı
            olmadan devre dışı bir butonla kalırdı. */}
        <Button
          testID="cart-checkout-button"
          variant="primary"
          title={t('cart.proceedToCheckout')}
          style={styles.checkoutButton}
          disabled={f.quoteError || f.total == null || f.selectedCount === 0}
          onPress={() => router.push('/checkout')}
        />
      </View>
    </View>
  );
}
