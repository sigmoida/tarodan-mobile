import { View, Pressable } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { Button, Text } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import type { LikedCollection } from '../_lib/types';
import type { LikedCollectionsController } from '../_hooks/useLikedCollections';

/** Tek beğenilen koleksiyon kartı — web kart dili: kapak, ad, sahibi, sayılar, beğeniyi kaldır. */
export function LikedCollectionCard({
  collection,
  f,
}: {
  collection: LikedCollection;
  f: LikedCollectionsController;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      style={styles.collectionCard}
      onPress={() => router.push(`/collections/${collection.id}`)}
    >
      <AppImage source={f.getImageUrl(collection)} recyclingKey={String(collection.id)} style={styles.collectionImage} resizeMode="cover" />
      <View style={styles.collectionInfo}>
        <Text variant="label" numberOfLines={1}>{collection.name}</Text>
        {collection.userName ? (
          <Text variant="caption" numberOfLines={1}>{collection.userName}</Text>
        ) : null}
        <View style={styles.collectionMetaRow}>
          <Text variant="caption">{t('collection.vehicleCountSuffix', { count: collection.itemCount || 0 })}</Text>
          <Text variant="caption">{collection.likeCount || 0} {t('collection.likes')}</Text>
        </View>
        <Button
          variant="outline"
          size="sm"
          title={t('common.remove')}
          onPress={() => f.handleUnlike(collection.id)}
        />
      </View>
    </Pressable>
  );
}
