import React from 'react';
import { Pressable, View } from 'react-native';
import { Input, SectionCard, Text, theme, Icon } from '@/ui';
import { DocAccordionItem } from '@/components/content/DocBlocks';

import { styles } from '../_lib/styles';
import type { HelpController } from '../_hooks/useHelp';

const { colors, iconSize } = theme;

/** Arama ve SSS kategori/soru akordeonu — her biri web gibi SectionCard. */
export function HelpFaq({ f }: { f: HelpController }) {
  return (
    <>
      <SectionCard title={f.t('helpFaq.searchTitle')}>
        <Input
          placeholder={f.t('helpFaq.searchPlaceholder')}
          value={f.searchQuery}
          onChangeText={f.handleSearch}
          leftIconName="magnifying-glass"
        />
      </SectionCard>

      <SectionCard title={f.t('faq.title')}>
        {f.filteredFAQs.map((category) => {
          const open = f.expandedCategory === category.id;
          return (
            <View key={category.id} style={styles.faqCategory}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={styles.categoryHeader}
                onPress={() => f.setExpandedCategory(open ? null : category.id)}
              >
                <Text variant="h3" style={styles.categoryTitle}>
                  {category.title}
                </Text>
                <Icon
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={iconSize.md}
                  color={colors.text.muted}
                />
              </Pressable>

              {/* Alt maddeler: kategoriden ayırt edilsin diye girintili, zeminli ve sol vurgulu panel. */}
              {open ? (
                <View style={styles.questionList}>
                  {category.questions.map((item, index) => {
                    const key = `${category.id}-${index}`;
                    return (
                      <DocAccordionItem
                        key={key}
                        question={item.q}
                        answer={item.a}
                        expanded={f.expandedQuestion === key}
                        onToggle={() => f.setExpandedQuestion(f.expandedQuestion === key ? null : key)}
                      />
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </SectionCard>
    </>
  );
}
