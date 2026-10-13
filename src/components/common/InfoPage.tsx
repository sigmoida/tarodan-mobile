import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { PageHeader, SectionCard, Text, theme } from '@/ui';
import { PageShell } from './PageShell';

export interface InfoSection {
  title?: string;
  content?: string;
  /** Web'de başlığın yanında olan işlevsel ikon (ör. güvenlik kalkanı). */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Gövde yerine özel düğüm (liste vb.). */
  children?: React.ReactNode;
}

/**
 * Bilgi sayfası kabuğu (web `DocPage`): PageShell + PageHeader (başlık + açıklama) + tek
 * SectionCard içinde bölümler — her bölüm lg/600 başlık + gövde metni. Süs ikonu yok; yalnız
 * web'de de başlığın yanında duran işlevsel ikon (`icon`) çizilir.
 */
export function InfoPage({
  title,
  pageTitle,
  description,
  sections,
  footer,
  testID,
}: {
  /** Üst bar başlığı. */
  title: string;
  /** İçerik başlığı (verilmezse çizilmez). */
  pageTitle?: string;
  description?: string;
  sections: InfoSection[];
  footer?: React.ReactNode;
  testID?: string;
}) {
  return (
    <PageShell title={title} testID={testID}>
      {pageTitle || description ? <PageHeader title={pageTitle} description={description} /> : null}
      <SectionCard bodyStyle={styles.sections}>
        {sections.map((s, i) => (
          <View key={s.title ?? i} style={styles.section}>
            {s.title ? (
              <View style={styles.titleRow}>
                {s.icon ? (
                  <Ionicons name={s.icon} size={theme.iconSize.md} color={theme.colors.success[600]!} />
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
