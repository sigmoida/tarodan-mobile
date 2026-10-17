import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { ProgressBar, SectionCard, Text, theme } from '@/ui';

const { colors, spacing } = theme;

export interface ListingQuotaCardProps {
  /** Kart başlığı (SectionCard vurgu çubuğu + kalın başlık). */
  title: string;
  /** Kota satırı ("İlan Hakkı: 3 / 5"). */
  summary: string;
  /** Özet satırının rengi (durum tonu); verilmezse gövde rengi. */
  summaryColor?: string;
  /** İkincil satır ("Kalan: 2"). */
  detail?: string;
  /** 0..1 doluluk; `null` = sınırsız kota, çubuk çizilmez. */
  progress: number | null;
  /** Çubuk rengi — tek kural `quotaProgressColor`. */
  progressColor?: string;
  /** Başlık satırının sağı (ör. `UpgradeCta` içinde "Premium'a Geç"); sığmazsa alt satıra iner. */
  action?: React.ReactNode;
  testID?: string;
}

/**
 * İlan kotası kartı — ilan formu (yeni ilan) ve "İlanlarım" aynı görünümü paylaşsın diye TEK
 * bileşen: `SectionCard` + özet + `ProgressBar`. Veri ve metin çağıranda.
 */
export const ListingQuotaCard = memo(function ListingQuotaCard({
  title,
  summary,
  summaryColor,
  detail,
  progress,
  progressColor,
  action,
  testID,
}: ListingQuotaCardProps) {
  return (
    <SectionCard title={title} action={action} testID={testID}>
      <Text variant="label" color={summaryColor}>
        {summary}
      </Text>
      {detail ? (
        <Text variant="caption" tone="subtle" style={styles.detail}>
          {detail}
        </Text>
      ) : null}
      {progress != null ? (
        <ProgressBar progress={progress} color={progressColor} style={styles.bar} />
      ) : null}
    </SectionCard>
  );
});

/**
 * Kota çubuğu rengi (my-listings `progressColor` ile aynı kural): dolduysa danger, son iki
 * hakta warning, aksi halde marka rengi. `max === -1` sınırsız.
 */
export function quotaProgressColor(current: number, max: number): string {
  if (max === -1) return colors.primary[600];
  if (current >= max) return colors.danger[600];
  if (current >= max - 2) return colors.warning[600];
  return colors.primary[600];
}

const styles = StyleSheet.create({
  detail: {
    marginTop: spacing[0.5],
  },
  bar: {
    marginTop: spacing[2.5],
  },
});
