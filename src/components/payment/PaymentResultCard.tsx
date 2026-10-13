import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { SectionCard, Text, theme } from '@/ui';

export type PaymentResultTone = 'success' | 'warning' | 'danger';

const { colors, spacing } = theme;

const toneStyle: Record<
  PaymentResultTone,
  { icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; fg: string }
> = {
  success: { icon: 'checkmark-circle-outline', bg: colors.success[100]!, fg: colors.success[500]! },
  warning: { icon: 'time-outline', bg: colors.warning[100]!, fg: colors.warning[600]! },
  danger: { icon: 'close-circle-outline', bg: colors.danger[100]!, fg: colors.danger[500]! },
};

/**
 * Ödeme / sipariş sonuç kartı — web `PaymentSuccessClient` / `PaymentFailClient` düzeni: ortalanmış
 * tek kart, 80pt durum dairesi (durum ikonu: onay / saat / hata), kalın başlık, açıklama, gövde
 * (detay kartı, ipucu) ve tam genişlikte eylemler. Kutlama süsü yok.
 */
export function PaymentResultCard({
  tone,
  title,
  description,
  children,
  actions,
  testID,
}: {
  tone: PaymentResultTone;
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  testID?: string;
}) {
  const s = toneStyle[tone];
  return (
    <SectionCard testID={testID} bodyStyle={styles.body} style={styles.card}>
      <View style={[styles.circle, { backgroundColor: s.bg }]}>
        <Ionicons name={s.icon} size={theme.iconSize.lg * 2} color={s.fg} />
      </View>
      <Text variant="displaySm" tone="heading" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="body" tone="muted" align="center">
          {description}
        </Text>
      ) : null}
      {children}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </SectionCard>
  );
}

/** Detay satırı: etiket solda (muted), değer sağda (semibold) — web `PaymentDetailsCard` `Row`. */
export function PaymentResultRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text variant="bodySm" tone="muted">
        {label}
      </Text>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text variant="bodySm" weight="semibold">
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing[6] },
  body: { alignItems: 'stretch', gap: spacing[3] },
  circle: {
    alignSelf: 'center',
    width: spacing[20],
    height: spacing[20],
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  actions: { gap: spacing[3], marginTop: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
});
