import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../lib/theme';
import { RawText } from './Text';

export interface PageHeaderProps {
  title?: React.ReactNode;
  /** Başlığın yanında (ör. okunmamış adet rozeti) — SectionCard `badge` ile aynı. */
  badge?: React.ReactNode;
  /** Başlık altı kısa açıklama (web `text-sm text-muted`). */
  description?: React.ReactNode;
  /** Sağ/alt aksiyonlar (oluştur düğmesi, sıralama, durum rozeti…). Telefonda başlığın altında. */
  actions?: React.ReactNode;
  /** Başlığın üstünde (ör. kırıntı yolu). */
  breadcrumb?: React.ReactNode;
  /** Verilirse vurgu çubuğu yerine geri (chevron) çizilir — web `onBack`. */
  onBack?: () => void;
  backLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const { colors, spacing, typography, radius, iconSize } = theme;

/**
 * Web `PageHeader`'ın native karşılığı — liste ve detay sayfalarının içerikteki başlık bandı:
 * 4×24 primary-500 vurgu çubuğu + h1 (text-2xl bold), opsiyonel açıklama ve aksiyonlar.
 * Telefon görünümünde (web `flex-col`) aksiyonlar başlığın altına iner.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  badge,
  description,
  actions,
  breadcrumb,
  onBack,
  backLabel,
  style,
  testID,
}) => {
  const { t } = useTranslation();
  const hasRow = title != null || description != null || actions != null;
  return (
    <View style={[styles.container, style]} testID={testID}>
      {breadcrumb}
      {hasRow && (
        <View style={styles.column}>
          <View style={styles.titleBlock}>
            {title != null && (
              <View style={styles.titleRow}>
                {onBack ? (
                  <Pressable
                    onPress={onBack}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={backLabel ?? t('common.back')}
                    style={styles.back}
                  >
                    <Ionicons name="chevron-back" size={iconSize.lg} color={colors.text.muted} />
                  </Pressable>
                ) : (
                  <View style={styles.accent} testID="page-header-accent" />
                )}
                {typeof title === 'string' || typeof title === 'number' ? (
                  <RawText style={styles.title} numberOfLines={1} accessibilityRole="header">
                    {title}
                  </RawText>
                ) : (
                  title
                )}
                {badge}
              </View>
            )}
            {description != null &&
              (typeof description === 'string' ? (
                <RawText style={styles.description}>{description}</RawText>
              ) : (
                description
              ))}
          </View>
          {actions != null && <View style={styles.actions}>{actions}</View>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  column: {
    gap: spacing[3],
  },
  titleBlock: {
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  accent: {
    width: spacing[1],
    height: spacing[6],
    borderRadius: radius.sm,
    backgroundColor: colors.primary[500],
  },
  back: {
    marginLeft: -spacing[1],
    borderRadius: radius.md,
  },
  title: {
    flexShrink: 1,
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.snug,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.heading,
  },
  description: {
    marginTop: spacing[0.5],
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[2],
  },
});
