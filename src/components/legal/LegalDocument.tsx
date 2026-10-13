import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card, ScreenHeader, Text, theme } from '@/ui';
import type { LegalBlock, LegalPart, LegalSection, Translate } from '@/lib/legal/types';

const { colors, spacing, radius } = theme;

/**
 * Hukuki metinlerin ortak native iskeleti — web `components/legal/LegalDocument`
 * karşılığı: numaralı maddeler, madde içinde paragraf/liste/alan/not. Yapı tek
 * yerde, içerik `@/lib/legal/*` (web `_lib`'lerinin birebir kopyası). Metin web
 * ile aynı katalog anahtarlarından gelir; mobil kendi hukuki metnini yazmaz.
 */
export function LegalDocument({
  title,
  description,
  parts,
  footer,
  testID,
}: {
  title: string;
  description?: string;
  parts: LegalPart[];
  /** Metnin sonundaki yürürlük/erişim notu. */
  footer?: string;
  testID?: string;
}) {
  return (
    <View style={styles.container} testID={testID}>
      <ScreenHeader
        title={title}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {description ? (
          <Text variant="bodySm" tone="muted">
            {description}
          </Text>
        ) : null}
        {parts.map((part) => (
          <Card key={part.title} style={styles.part}>
            <Text variant="h3" accessibilityRole="header">
              {part.title}
            </Text>
            {part.intro ? <Text style={styles.body}>{part.intro}</Text> : null}
            {part.sections.map((section) => (
              <Section key={section.number} section={section} />
            ))}
          </Card>
        ))}
        {footer ? (
          <Text variant="caption" tone="subtle">
            {footer}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** `t`'yi kopyalanan metin fabrikalarının beklediği imzaya çevirir. */
export function useLegalTranslate(): Translate {
  const { t } = useTranslation();
  return (key, values) => t(key, values) as string;
}

function Section({ section }: { section: LegalSection }) {
  return (
    <View style={styles.section}>
      <Text weight="semibold" tone="heading">
        {`${section.number}. ${section.heading}`}
      </Text>
      {section.blocks.map((block, index) => (
        <Block key={`${section.number}-${index}`} block={block} />
      ))}
    </View>
  );
}

function Block({ block }: { block: LegalBlock }) {
  const { t } = useTranslation();

  if (block.type === 'p') return <Text style={styles.body}>{block.text}</Text>;

  if (block.type === 'note') {
    return (
      <View style={styles.note}>
        <Text style={styles.body}>{block.text}</Text>
      </View>
    );
  }

  if (block.type === 'list') {
    return (
      <View style={styles.list}>
        {block.items.map((item) => (
          <Text key={`${item.label ?? ''}${item.text}`} style={[styles.body, styles.listItem]}>
            {item.label ? (
              <Text weight="medium" tone="heading">{`${item.label}: `}</Text>
            ) : null}
            {item.text}
          </Text>
        ))}
      </View>
    );
  }

  if (block.type === 'groups') {
    return (
      <View style={styles.list}>
        {block.groups.map((group) => (
          <View key={group.title} style={styles.list}>
            <Text variant="bodySm" weight="semibold" tone="heading">
              {group.title}
            </Text>
            {group.items.map((item) => (
              <Text key={item} style={[styles.body, styles.listItem]}>
                {item}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {block.intro ? <Text style={styles.body}>{block.intro}</Text> : null}
      {block.items.map((item) => (
        <Text key={item.label} style={styles.body}>
          <Text weight="medium" tone="heading">{`${item.label}: `}</Text>
          {/* Değeri olmayan alan siparişe özeldir (web ile aynı ifade). */}
          <Text tone={item.value ? 'body' : 'muted'}>
            {item.value ?? t('legal.fieldStatedInOrder')}
          </Text>
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.alt },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  part: { gap: spacing[5], backgroundColor: colors.surface.DEFAULT },
  section: { gap: spacing[3] },
  body: { fontSize: 14, lineHeight: 22, color: colors.text.body },
  list: { gap: spacing[2] },
  listItem: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border.DEFAULT,
    paddingLeft: spacing[3],
  },
  note: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.alt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
});
