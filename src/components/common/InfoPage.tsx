import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PageHeader, SectionCard, Text, theme, Icon, type IconName } from '@/ui';
import { PageShell } from './PageShell';

export interface InfoSection {
  title?: string;
  content?: string;
  /** Web'de başlığın yanında olan işlevsel ikon (ör. güvenlik kalkanı). */
  icon?: IconName;
  /** Gövde yerine özel düğüm (liste vb.). */
  children?: React.ReactNode;
}

/**
 * Bilgi sayfası kabuğu (web `DocPage`): PageShell (başlık üst barda) + PageHeader (yalnız açıklama) + tek
 * SectionCard içinde bölümler — her bölüm lg/600 başlık + gövde metni. Süs ikonu yok; yalnız
 * web'de de başlığın yanında duran işlevsel ikon (`icon`) çizilir.
 */
export function InfoPage({
  title,
  description,
  sections,
  footer,
  testID,
}: {
  /** Üst bar başlığı — içerikte tekrar edilmez. */
  title: string;
  /** Başlık altı kısa açıklama (küçük muted metin). */
  description?: string;
  sections: InfoSection[];
  footer?: React.ReactNode;
  testID?: string;
}) {
  return (
    <PageShell title={title} testID={testID}>
      {description ? <PageHeader description={description} /> : null}
      <SectionCard bodyStyle={styles.sections}>
        {sections.map((s, i) => (
          <View key={s.title ?? i} style={styles.section}>
            {s.title ? (
              <View style={styles.titleRow}>
                {s.icon ? (
                  <Icon name={s.icon} size={theme.iconSize.md} color={theme.colors.success[600]!} />
                ) : null}
                <Text variant="h3" tone="heading">
                  {s.title}
                </Text>
              </View>
            ) : null}
            {s.content ? (
              <Text variant="body" tone="body">
                {s.content}
              </Text>
            ) : null}
            {s.children}
          </View>
        ))}
      </SectionCard>
      {footer}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  sections: { gap: theme.spacing[8] },
  section: { gap: theme.spacing[2] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
});
