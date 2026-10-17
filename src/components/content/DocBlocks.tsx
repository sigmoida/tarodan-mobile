import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, theme, Icon } from '@/ui';

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

/** Bölüm içi alt başlık (adım başlığı gibi): semibold, heading rengi. */
export const DocSubheading: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <Text variant="bodySm" weight="semibold" tone="heading" style={styles.subheading}>
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

/**
 * İçerik kartı (web adım/garanti/SSS kartı): `rounded border border-border-subtle bg-surface p-5`,
 * üstte isteğe bağlı küçük etiket (`eyebrow`, ör. adım numarası), başlık (semibold) + açıklama.
 * `leading` verilirse başlığın solunda (ör. durum ikonu).
 */
export const DocCard: React.FC<{
  title: string;
  children?: React.ReactNode;
  eyebrow?: string;
  leading?: React.ReactNode;
}> = ({ title, children, eyebrow, leading }) => (
  <View style={styles.card}>
    {leading ? <View style={styles.cardLeading}>{leading}</View> : null}
    <View style={styles.cardBody}>
      {eyebrow ? (
        <Text variant="overline" tone="subtle">
          {eyebrow}
        </Text>
      ) : null}
      <Text weight="semibold" tone="heading">
        {title}
      </Text>
      {typeof children === 'string' ? (
        <Text variant="bodySm" tone="muted">
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  </View>
);

/** Kart yığını (web `space-y-4`). */
export const DocCards: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <View style={styles.cards}>{children}</View>
);

/**
 * Açılır soru satırı (SSS/yardım): web'de cevaplar açık; telefonda uzun listeyi kısa tutmak için
 * dokununca açılır. Soru `semibold` + sağda aç/kapa oku (işlev ikonu); satırlar `border-b` ile
 * ayrılır. Cevap web `text-sm leading-relaxed text-body`.
 */
export const DocAccordionItem: React.FC<{
  question: string;
  answer: string;
  expanded: boolean;
  onToggle: () => void;
  testID?: string;
}> = ({ question, answer, expanded, onToggle, testID }) => (
  <View style={styles.accordionItem}>
    <Pressable
      onPress={onToggle}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      style={styles.accordionHeader}
    >
      <Text weight="semibold" tone="heading" style={styles.accordionQuestion}>
        {question}
      </Text>
      <Icon
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={iconSize.md}
        color={colors.text.muted}
      />
    </Pressable>
    {expanded ? (
      <Text variant="bodySm" style={styles.accordionAnswer}>
        {answer}
      </Text>
    ) : null}
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
    <Icon name="chevron-right" size={iconSize.sm} color={colors.primary[500]} />
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
  subheading: {
    marginTop: spacing[2],
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
  card: {
    flexDirection: 'row',
    gap: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radiusRole.productCard,
    padding: spacing[5],
  },
  cardLeading: {
    paddingTop: spacing[0.5],
  },
  cardBody: {
    flex: 1,
    gap: spacing[1.5],
  },
  cards: {
    gap: spacing[4],
  },
  accordionItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    minHeight: theme.minTouchTarget,
    paddingVertical: spacing[3],
  },
  accordionQuestion: {
    flex: 1,
  },
  accordionAnswer: {
    paddingBottom: spacing[3],
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
