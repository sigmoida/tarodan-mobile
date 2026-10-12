import React from 'react';
import { View, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';

const { colors } = theme;

/**
 * Mesafeli satış sözleşmesi onayı — ödeme düğmesinin ön koşulu (web
 * `components/payment/DistanceSalesConsent` aynası).
 *
 * Sepet checkout'u (3. adım) ve ödeme ekranı (teklif siparişi vb.) aynı onayı
 * ister; metin ve sözleşme bağlantısı tek yerde durur ki biri güncellenip
 * diğeri eskide kalmasın. Onayın kendisi çağıranın state'idir (checkout sipariş
 * gövdesiyle, ödeme ekranı direct-form gövdesiyle sunucuya yazar).
 */
export function DistanceSalesConsent({
  checked,
  onToggle,
  testID,
  style,
}: {
  checked: boolean;
  onToggle: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.row, style]}>
      <TouchableOpacity
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={onToggle}
        hitSlop={8}
      >
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={22}
          color={checked ? colors.primary[600]! : colors.text.muted}
        />
      </TouchableOpacity>
      <View style={styles.body}>
        <Text variant="caption">{t('checkout.distanceSalesConsent')}</Text>
        <TouchableOpacity onPress={() => router.push('/distance-sales')}>
          <Text variant="caption" style={styles.link}>
            {t('checkout.distanceSalesConsentLink')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
  },
  body: { flex: 1 },
  link: {
    color: colors.primary[600],
    textDecorationLine: 'underline',
    marginTop: theme.spacing[1],
  },
});
