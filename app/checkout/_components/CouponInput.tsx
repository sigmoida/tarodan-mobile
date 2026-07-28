import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { CouponController } from '../_hooks/useCoupon';

const { colors } = theme;

/** Kupon kodu kutusu — uygulanınca indirim rozetine dönüşür. */
export function CouponInput({ coupon }: { coupon: CouponController }) {
  if (coupon.applied) {
    return (
      <View style={[styles.box, styles.appliedBox]} testID="coupon-applied">
        <Ionicons name="pricetag" size={18} color={colors.success[600]!} />
        <View style={styles.appliedText}>
          <Text variant="bodySm" weight="bold" style={{ color: colors.success[600]! }}>
            {coupon.applied.code} uygulandı
          </Text>
          <Text variant="caption" style={{ color: colors.text.muted }}>
            {coupon.applied.name ? `${coupon.applied.name} · ` : ''}
            {formatPrice(coupon.discount)} indirim
          </Text>
        </View>
        <Button variant="ghost" size="sm" title="Kaldır" onPress={coupon.remove} testID="coupon-remove-button" />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.field}>
        <Input
          placeholder="Kupon kodu"
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
        title="Uygula"
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
