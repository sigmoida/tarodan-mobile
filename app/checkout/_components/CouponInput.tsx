import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, Input, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { CouponController } from '../_hooks/useCoupon';

const { colors } = theme;

/**
 * Kupon kodu kutusu — uygulanınca rozete dönüşür.
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
      <View style={[styles.box, styles.appliedBox]} testID="coupon-applied">
        <Ionicons name="pricetag" size={18} color={colors.success[600]!} />
        <View style={styles.appliedText}>
          <Text variant="bodySm" weight="bold" style={{ color: colors.success[600]! }}>
            {showDiscount
              ? t('checkout.couponAppliedWithDiscount', { code: coupon.applied.code, amount: formatPrice(couponDiscount) })
              : t('checkout.couponAppliedLabel', { code: coupon.applied.code })}
          </Text>
          {coupon.applied.name ? (
            <Text variant="caption" style={{ color: colors.text.muted }}>
              {coupon.applied.name}
            </Text>
          ) : null}
        </View>
        <Button variant="ghost" size="sm" title={t('common.remove')} onPress={coupon.remove} testID="coupon-remove-button" />
      </View>
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
        style={styles.applyButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  field: { flex: 1 },
  applyButton: { marginTop: theme.spacing[1] },
  appliedBox: {
    alignItems: 'center',
    padding: theme.spacing[3],
    backgroundColor: colors.success[50]!,
    borderRadius: theme.radius.lg,
  },
  appliedText: { flex: 1 },
});
