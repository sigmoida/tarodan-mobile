import { View, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { GlassIconButton, Icon, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import type { LikedCollection } from '../_lib/types';
import type { LikedCollectionsController } from '../_hooks/useLikedCollections';

const { colors, iconSize } = theme;

/**
 * Tek beğenilen koleksiyon kartı — kapak (sağ üstte cam daire içinde dolu kırmızı kalp =
 * beğenildi; basınca beğeni kalkar), ad, sahibi, "12 araç · ♥ 9" (kalp ürün kartıyla aynı danger-500).
 */
export function LikedCollectionCard({
  collection,
  f,
  style,
}: {
  collection: LikedCollection;
  f: LikedCollectionsController;
  /** Grid cell size (`gridCellStyle`) from the screen. */
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const likeCount = collection.likeCount || 0;
  return (
    <Pressable
      testID={`liked-collection-${collection.id}`}
      style={[styles.collectionCard, style]}
      onPress={() => router.push(`/collections/${collection.id}`)}
    >
      <View>
        <AppImage
          source={f.getImageUrl(collection)}
          recyclingKey={String(collection.id)}
          style={styles.collectionImage}
          resizeMode="cover"
        />
        <View style={styles.unlikeButton}>
          <GlassIconButton
            testID={`liked-collection-unlike-${collection.id}`}
            icon="heart"
            iconVariant="solid"
            iconColor={colors.danger[500]}
            accessibilityLabel={t('collection.unlike')}
            onPress={() => f.handleUnlike(collection.id)}
          />
        </View>
      </View>
      <View style={styles.collectionInfo}>
        <Text variant="body" weight="semibold" tone="heading" numberOfLines={1}>
          {collection.name}
        </Text>
        {collection.userName ? (
          <Text variant="bodySm" tone="muted" numberOfLines={1}>
            {collection.userName}
          </Text>
        ) : null}
        <View style={styles.collectionMetaRow}>
          <Text variant="bodySm" tone="muted" numberOfLines={1}>
            {t('collection.vehicleCountSuffix', { count: collection.itemCount || 0 })}
          </Text>
          <View
            style={styles.likeMeta}
            accessible
            accessibilityLabel={t('collection.likeCountSuffix', { count: likeCount })}
          >
            <Icon name="heart" variant="solid" size={iconSize.sm} color={colors.danger[500]} />
            <Text variant="bodySm" tone="muted">
              {likeCount}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
