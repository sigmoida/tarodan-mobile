import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/ui';
import { styles } from '../_lib/collectionStyles';
import type { CollectionItemCard } from '../_lib/collectionItemCard';

/**
 * Status badges in a collection card's top-left slot (web `ItemBadges`): "Koleksiyon" on a custom
 * item, "Satıldı" on a sold listing. Self-gates; the caller passes it only when one applies
 * (`hasCollectionItemBadges`), since a filled slot hides the card's own badge stack.
 */
export function CollectionItemBadges({ card }: { card: CollectionItemCard }) {
  const { t } = useTranslation();
  if (!hasCollectionItemBadges(card)) return null;
  return (
    <View style={styles.itemBadges} pointerEvents="none">
      {card.isCustom ? (
        <Badge variant="default" appearance="solid" size="xs">
          {t('collection.collection')}
        </Badge>
      ) : null}
      {card.isSold ? (
        <Badge variant="danger" appearance="solid" size="xs">
          {t('product.statusSold')}
        </Badge>
      ) : null}
    </View>
  );
}

/** Web `hasItemBadges`: a custom item or a sold listing fills the top-left slot. */
export function hasCollectionItemBadges(card: CollectionItemCard): boolean {
  return card.isCustom || card.isSold;
}
