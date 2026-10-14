import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
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
 * kalmasın. Kutu `@/ui` `Checkbox` (CLAUDE.md §1). Metindeki sözleşme adı bağlantıdır (iç içe
 * `Text` onPress): ona basmak sözleşmeyi açar, onayı değiştirmez. Onayın kendisi
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
  // Web ile aynı metin: `<contract>…</contract>` kısmı sözleşmeye giden bağlantı (kutuyu işaretlemez).
  const raw = t('checkout.distanceSalesConsent');
  const m = /^(.*)<contract>(.*)<\/contract>(.*)$/s.exec(raw);
  const openContract = () => router.push('/distance-sales');
  const label = m ? (
    <>
      {m[1]}
      <Text variant="bodySm" style={styles.link} onPress={openContract} accessibilityRole="link" testID="distance-sales-link">
        {m[2]}
      </Text>
      {m[3]}
    </>
  ) : (
    raw
  );
  return (
    <View style={style}>
      <Checkbox testID={testID} checked={checked} onChange={() => onToggle()} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    color: colors.primary[600],
    textDecorationLine: 'underline',
  },
});
