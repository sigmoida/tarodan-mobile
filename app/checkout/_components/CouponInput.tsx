import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, theme } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { CouponController } from '../_hooks/useCoupon';

/**
 * Kupon kodu kutusu — uygulanınca başarı kutusuna (`Alert` success) dönüşür.
 *
 * İndirim tutarı BURADA gösterilir, ödeme özetinde DEĞİL: `OrderSummary`'nin üç
 * satırının toplamı sunucu garantisiyle `total`a eşit, araya bir "İndirim" satırı
 * koymak toplamı tutmaz hale getiriyordu (kullanıcı açıklanamayan bir fark
 * görüyordu). Kaynak yalnızca quote yanıtının KÖKÜNDEKİ `couponDiscount`;
 * `/discounts/validate`'in `estimatedDiscount`'u bir tahmindir ve hiçbir para
 * gösteriminde kullanılmaz. Değer yoksa/0 ise sayı basılmaz.
 */
export function CouponInput({
  coupon,
  couponDiscount,
}: {
  coupon: CouponController;
  /** Quote kökündeki `couponDiscount` — sunucunun kendi sayısı. */
  couponDiscount?: number | null;
}) {
  const { t } = useTranslation();
  if (coupon.applied) {
    const showDiscount = couponDiscount != null && couponDiscount > 0;
    return (
      <Alert
        variant="success"
        testID="coupon-applied"
        title={
          showDiscount
            ? t('checkout.couponAppliedWithDiscount', { code: coupon.applied.code, amount: formatPrice(couponDiscount) })
            : t('checkout.couponAppliedLabel', { code: coupon.applied.code })
        }
        action={
          <Button variant="outline" size="sm" title={t('common.remove')} onPress={coupon.remove} testID="coupon-remove-button" />
        }
      >
        {coupon.applied.name || undefined}
      </Alert>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.field}>
        <Input
          placeholder={t('checkout.couponCodePlaceholder')}
          value={coupon.code}
          onChangeText={coupon.setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={coupon.apply}
          error={coupon.error ?? undefined}
          testID="coupon-input"
        />
      </View>
      <Button
        variant="outline"
        title={t('common.apply')}
        onPress={coupon.apply}
        isLoading={coupon.isPending}
        disabled={coupon.isPending || !coupon.code.trim()}
        testID="coupon-apply-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Input (md) ve Button (md) aynı boy (`controlHeight.md`): üstten hizalı = aynı hizada; hata
  // satırı kutunun altına eklenir, düğme kutuyla hizalı kalır.
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
  },
  field: { flex: 1 },
});
