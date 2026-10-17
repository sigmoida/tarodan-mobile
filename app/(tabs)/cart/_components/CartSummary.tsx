import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Button, ErrorState, SectionCard, Text } from '@/ui';
import { OrderSummaryLines } from '@/components/orders/OrderSummaryLines';
import { searchEntryHref } from '@/lib/navigation/searchHref';
import { styles } from '../_lib/styles';
import type { CartController } from '../_hooks/useCart';

/**
 * Sipariş özeti kartı (web `CartSummary`): tutar satırları + (misafirse) giriş çağrısı +
 * "Alışverişe Devam Et". Ödemeye Geç düğmesi sabit alt barda (`index.tsx`).
 *
 * Checkout'un özetiyle AYNI satırlar (`OrderSummaryLines`): dört satır da `pricing.summary`'den
 * aynen basılır, istemcide hiçbir toplama/çıkarma yapılmaz; sunucu değeri yoksa yer tutucu.
 */
export function CartSummary({ f }: { f: CartController }) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('checkout.orderSummary')} testID="cart-summary">
      {/* Hiçbir satır seçili değil: quote hiç çalışmıyor, `total` null kalıyor ve aşağıdaki hata
          kapısına düşerdi — oysa hata YOK, kullanıcı seçimi kaldırdı. Bu kapı hata kapısından
          ÖNCE gelmeli. */}
      {f.selectedCount === 0 ? (
        <View style={styles.summaryNote} testID="cart-summary-none-selected">
          <Text variant="bodySm" tone="muted">{t('cart.noneSelected')}</Text>
        </View>
      ) : f.quoteError || (!f.quoteLoading && f.total == null) ? (
        /* Quote hata verdiyse dört satırı da "—" basıp kullanıcıyı sebepsiz bırakma — checkout
           ile AYNI çıkış yolu (src/ui/CLAUDE.md › Empty and error states). `total == null` de bu kapıya dahil: sorgu 200 dönüp `total`
           boş gelirse `quoteError` false olur ama kullanıcı yalnız "—" görür ve retry kalmazdı.
           ⚠️ `quoteLoading` şart: ilk yüklemede `total` zaten null, o kapı olmadan her sepet
           açılışında hata kartı yanıp sönerdi. */
        <View testID="cart-summary-error">
          <ErrorState placement="inline"
            title={t('cart.priceUnavailableTitle')}
            message={t('cart.priceUnavailableMessage')}
            onRetry={f.retryQuote}
          />
        </View>
      ) : (
        <OrderSummaryLines
          productAmount={f.productAmount}
          shippingAmount={f.shippingAmount}
          serviceFeeAmount={f.serviceFeeAmount}
          total={f.total}
          totalTestID="cart-summary-total"
        />
      )}

      <View style={styles.actions}>
        {!f.isAuthenticated ? (
          <>
            <Button
              variant="secondary"
              title={t('checkout.loginFasterCheckout')}
              fullWidth
              onPress={() => router.push('/(auth)/login' as any)}
            />
            <Text variant="caption" tone="muted" align="center">{t('checkout.cartSavedAfterLogin')}</Text>
          </>
        ) : null}
        <Button
          variant="ghost"
          title={t('cart.continueShopping')}
          fullWidth
          onPress={() => router.push(searchEntryHref('all'))}
        />
      </View>
    </SectionCard>
  );
}
