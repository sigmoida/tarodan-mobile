import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Avatar, SectionCard, SectionCardAction, Skeleton, Text } from '@/ui';
import { getImageUrl } from '@/utils/imageUrl';
import { formatCount } from '@/utils/format';
import { homeStyles as styles } from '../_lib/homeStyles';

const COLLECTION_LIMIT = 6;
const PREVIEW_SLOTS = [0, 1, 2];

function collectorName(user: any, fallback: string): string {
  return user?.publicName || user?.displayName || fallback;
}

/** Web `CollectionCard`: 3 görsellik şerit + koleksiyoner + ad + araç/görüntü sayısı. */
function CollectionCard({ collection }: { collection: any }) {
  const { t } = useTranslation();
  const items: any[] = collection.items?.slice(0, 3) ?? [];
  return (
    <Pressable
      onPress={() => router.push(`/collections/${collection.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={collection.name}
      style={({ pressed }) => [styles.collectionCard, pressed && styles.pressed]}
    >
      <View style={styles.collectionStrip}>
        {PREVIEW_SLOTS.map((i) => (
          <View key={items[i]?.id ?? `empty-${i}`} style={styles.collectionThumb}>
            {items[i] ? (
              <Image
                source={{ uri: getImageUrl(items[i].productImage) }}
                style={styles.fill}
                resizeMode="cover"
              />
            ) : null}
          </View>
        ))}
      </View>
      <View style={styles.collectionBody}>
        <View style={styles.collectorRow}>
          <Avatar size="sm" name={collectorName(collection.user, t('home.collector'))} source={collection.user?.avatarUrl} />
          <Text variant="caption" tone="muted" weight="medium" numberOfLines={1} style={styles.flex}>
            {collectorName(collection.user, t('home.collector'))}
          </Text>
        </View>
        <Text variant="bodySm" weight="bold" numberOfLines={1}>
          {collection.name}
        </Text>
        <Text variant="caption" tone="muted">
          {collection.itemCount || 0} {t('home.items')} · {formatCount(collection.viewCount)} {t('home.views')}
        </Text>
      </View>
    </Pressable>
  );
}

/** "En İyi Koleksiyonlar" (web `TopCollections`): telefonda 2 sütun, en çok 6 koleksiyon. */
export function TopCollections({ items, isLoading }: { items: any[]; isLoading?: boolean }) {
  const { t } = useTranslation();
  if (!isLoading && items.length === 0) return null;
  return (
    <SectionCard
      title={t('home.topCollections')}
      action={<SectionCardAction onPress={() => router.push('/collections')} />}
      testID="home-top-collections"
    >
      <View style={styles.collectionGrid}>
        {isLoading
          ? PREVIEW_SLOTS.slice(0, 2).map((i) => (
              <View key={i} style={styles.collectionCell}>
                <Skeleton height={190} />
              </View>
            ))
          : items.slice(0, COLLECTION_LIMIT).map((c) => (
              <View key={c.id} style={styles.collectionCell}>
                <CollectionCard collection={c} />
              </View>
            ))}
      </View>
    </SectionCard>
  );
}
