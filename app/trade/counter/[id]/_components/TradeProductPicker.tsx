import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState, SectionCard, Text, theme, Icon } from '@/ui';

import { formatPrice } from '@/utils/format';
import { transformImageUrl } from '@/utils/imageUrl';
import { styles } from '../_lib/styles';
import { itemId, type TradeItem } from '../_lib/types';

const { colors } = theme;

/** A titled grid of tradeable products with multi-select toggle. */
export function TradeProductPicker({
  title,
  subtitle,
  products,
  selected,
  toggle,
}: {
  title: string;
  subtitle: string;
  products: any[];
  selected: TradeItem[];
  toggle: (p: any) => void;
}) {
  const { t } = useTranslation();
  return (
    <SectionCard title={title}>
      <Text variant="caption" tone="muted">{subtitle}</Text>
      {products.length === 0 ? (
        <EmptyState placement="inline" icon="arrows-right-left" title={t('trade.noEligibleProducts')} subtitle={t('emptyState.tradeEligibleHint')} />
      ) : (
        <View style={styles.grid}>
          {products.map(p => {
            const isSelected = !!selected.find(x => itemId(x) === p.id);
            const img = p.images?.[0]?.cardUrl || p.images?.[0]?.url || p.images?.[0];
            return (
              <Pressable
                key={p.id}
                style={({ pressed }) => [
                  styles.gridItem,
                  isSelected && styles.gridItemSelected,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => toggle(p)}
              >
                <View style={styles.gridImgWrap}>
                  <Image source={{ uri: transformImageUrl(img) }} style={styles.gridImg} />
                  {isSelected ? (
                    <View style={styles.selectedOverlay}>
                      <View style={styles.checkBadge}>
                        <Icon name="check" size={theme.iconSize.sm} color={colors.white} />
                      </View>
                    </View>
                  ) : null}
                </View>
                <Text variant="bodySm" weight="semibold" tone="heading" numberOfLines={2}>{p.title}</Text>
                <Text variant="bodySm" weight="bold" style={{ color: theme.priceColor.card }}>
                  {formatPrice(p.price)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </SectionCard>
  );
}
