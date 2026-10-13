import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, theme } from '@/ui';

const { colors, spacing, radiusRole, iconSize } = theme;

/**
 * İçerik sayfalarının metin yapı taşları — web `prose` / `DocPage` gövdesinin karşılıkları.
 * Süs ikonu yok; yalnız işlev taşıyan ok (bağlantı satırı) var.
 */

/** SectionCard gövdesi: bölümler arası web `space-y-8`. */
export const DocBody: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <View style={styles.body}>{children}</View>
);

/** Bölüm: web `h2 text-lg font-semibold text-heading` + gövde (`space-y`). */
export const DocSection: React.FC<{ title?: string; children?: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    {title ? (
      <Text variant="h3" accessibilityRole="header">
        {title}
      </Text>
    ) : null}
    {children}
  </View>
);

/** Gövde paragrafı: web `text-body`. `small` → `text-sm`. */
export const DocText: React.FC<{
  children?: React.ReactNode;
  small?: boolean;
  tone?: 'body' | 'muted';
}> = ({ children, small, tone = 'body' }) => (
  <Text variant={small ? 'bodySm' : 'body'} tone={tone}>
    {children}
  </Text>
);

/** Madde listesi (web `ul`/`ol`): işaretçi metin karakteri, ikon değil. */
export const DocList: React.FC<{ items: React.ReactNode[]; ordered?: boolean; small?: boolean }> = ({
  items,
  ordered,
  small,
}) => (
  <View style={styles.list}>
    {items.map((item, index) => (
      <View key={index} style={styles.listRow}>
        <Text variant={small ? 'bodySm' : 'body'} tone="muted" style={styles.marker}>
          {ordered ? `${index + 1}.` : '•'}
        </Text>
        <Text variant={small ? 'bodySm' : 'body'} style={styles.listText}>
          {item}
        </Text>
      </View>
    ))}
  </View>
);

/** Vurgulu not kutusu: web `rounded-lg border bg-surface-alt px-4 py-3 text-sm`. */
export const DocNote: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <View style={styles.note}>
    <Text variant="bodySm">{children}</Text>
  </View>
);

/** Bağlantı satırı: web `text-primary-500` + sağ ok (aynı yerde web'de de var). */
export const DocLink: React.FC<{ label: string; onPress: () => void; testID?: string }> = ({
  label,
  onPress,
  testID,
}) => (
  <Pressable
    onPress={onPress}
    testID={testID}
    accessibilityRole="link"
    hitSlop={spacing[3]}
    style={styles.link}
  >
    <Text variant="body" style={styles.linkText}>
      {label}
    </Text>
    <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary[500]} />
  </Pressable>
);

/** Bağlantı satırları (web `mt-8 flex flex-wrap gap-4`). */
export const DocLinks: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <View style={styles.links}>{children}</View>
);

const styles = StyleSheet.create({
  body: {
    gap: spacing[8],
  },
  section: {
    gap: spacing[2],
  },
  list: {
    gap: spacing[2],
  },
  listRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  marker: {
    width: spacing[5],
  },
  listText: {
    flex: 1,
  },
  note: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.alt,
    borderRadius: radiusRole.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
  },
  linkText: {
    color: colors.primary[500],
  },
  links: {
    gap: spacing[3],
    marginTop: spacing[4],
  },
});
