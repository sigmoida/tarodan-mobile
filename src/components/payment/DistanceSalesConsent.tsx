import React from 'react';
import { View, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Checkbox, Text, theme } from '@/ui';

const { colors } = theme;

/**
 * Mesafeli satış sözleşmesi onayı — ödeme düğmesinin ön koşulu (web
 * `components/payment/DistanceSalesConsent` aynası).
 *
 * Sepet checkout'u (3. adım) ve ödeme ekranı aynı onayı ister; metin ve
 * sözleşme bağlantısı tek yerde durur ki biri güncellenip diğeri eskide
 * kalmasın. Kutu `@/ui` `Checkbox` (CLAUDE.md §1). Bağlantı kutunun dokunma
 * alanının DIŞINDA: "Sözleşmeyi oku"ya basmak onayı değiştirmez. Onayın kendisi
 * çağıranın state'idir (checkout sipariş gövdesiyle, ödeme ekranı direct-form
 * gövdesiyle sunucuya yazar).
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
    <View style={style}>
      <Checkbox
        testID={testID}
        checked={checked}
        onChange={() => onToggle()}
        label={t('checkout.distanceSalesConsent')}
      />
      <TouchableOpacity onPress={() => router.push('/distance-sales')} style={styles.linkWrap}>
        <Text variant="caption" style={styles.link}>
          {t('checkout.distanceSalesConsentLink')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Metinle hizalı: Checkbox kutusu (md = 20pt) + aradaki boşluk.
  linkWrap: { marginLeft: theme.spacing[5] + theme.spacing[2], marginTop: theme.spacing[1] },
  link: {
    color: colors.primary[600],
    textDecorationLine: 'underline',
  },
});
