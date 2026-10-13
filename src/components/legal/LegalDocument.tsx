import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text, theme } from '@/ui';
import { ContentPage } from '@/components/content/ContentPage';
import { DocNote } from '@/components/content/DocBlocks';
import type { LegalBlock, LegalPart, LegalSection, Translate } from '@/lib/legal/types';

const { colors, spacing, typography } = theme;

/**
 * Hukuki metinlerin ortak native iskeleti — web `components/legal/LegalDocument`
 * karşılığı: `DocPage` (üst bar + başlık/açıklama bandı) + her bölüm için SectionCard,
 * kartın içinde numaralı maddeler (paragraf/liste/alan/not). Yapı tek yerde, içerik
 * `@/lib/legal/*` (web `_lib`'lerinin birebir kopyası). Metin web ile aynı katalog
 * anahtarlarından gelir; mobil kendi hukuki metnini yazmaz — burada yalnız SUNUM var.
 */
export function LegalDocument({
  title,
  description,
  parts,
  notice,
  footer,
  testID,
}: {
  title: string;
  description?: string;
  /** Açıklamanın altında vurgulu kutu (ör. metnin uygulamaya nasıl uygulandığı). */
  notice?: string;
  parts: LegalPart[];
  /** Metnin sonundaki yürürlük/erişim notu. */
  footer?: string;
  testID?: string;
}) {
  return (
    <ContentPage title={title} description={description} testID={testID}>
      {notice ? (
        <View testID={testID ? `${testID}-notice` : undefined}>
          <DocNote>{notice}</DocNote>
        </View>
      ) : null}
      {parts.map((part) => (
        <SectionCard key={part.title} title={part.title}>
          <View style={styles.part}>
            {part.intro ? <Text style={styles.body}>{part.intro}</Text> : null}
            {part.blocks?.map((block, index) => (
              <Block key={`${part.title}-${index}`} block={block} />
            ))}
            {part.sections.map((section) => (
              <Section key={section.number} section={section} />
            ))}
          </View>
        </SectionCard>
      ))}
      {footer ? (
        <Text variant="caption" tone="subtle">
          {footer}
        </Text>
      ) : null}
    </ContentPage>
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
      <View style={styles.sectionBody}>
        {section.blocks.map((block, index) => (
          <Block key={`${section.number}-${index}`} block={block} />
        ))}
      </View>
    </View>
  );
}

function Block({ block }: { block: LegalBlock }) {
  const { t } = useTranslation();

  if (block.type === 'p') return <Text style={styles.body}>{block.text}</Text>;

  if (block.type === 'note') {
    return <DocNote>{block.text}</DocNote>;
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
      <View style={styles.groups}>
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
  /** Web `space-y-7`. */
  part: { gap: spacing[6] + spacing[1] },
  section: { gap: spacing[2] },
  /** Web `space-y-3`. */
  sectionBody: { gap: spacing[3] },
  body: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    color: colors.text.body,
  },
  list: { gap: spacing[2] },
  groups: { gap: spacing[4] },
  listItem: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border.DEFAULT,
    paddingLeft: spacing[3],
  },
});
