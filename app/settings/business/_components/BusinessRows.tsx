import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text, theme, Icon, Card } from '@/ui';

import { resolveImageUrl } from '@/utils/imageUrl';
import { styles } from '../_lib/styles';
import type { ProductStats, CollectionStats } from '../_lib/types';
import { formatPrice } from '@/utils/format';

// Stat Card Component (ikonsuz: değer + etiket)
export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="bordered" style={styles.statCard}>
      <Text variant="h2">{value.toLocaleString()}</Text>
      <Text variant="caption">{label}</Text>
    </Card>
  );
}

function RankBadge({ index }: { index: number }) {
  return (
    <View style={styles.productRank}>
      <Text variant="caption" weight="bold" tone="heading">
        {index + 1}
      </Text>
    </View>
  );
}

/** Görüntülenme / beğeni sayıları — web kart meta satırındaki gibi küçük ikonlu (işlevsel ayrım). */
function StatsColumn({ views, likes, highlight }: { views: number; likes: number; highlight?: 'views' | 'likes' }) {
  return (
    <View style={styles.productStats}>
      <View style={styles.productStatItem}>
        <Icon name="eye" size={theme.iconSize.sm} color={theme.colors.text.muted} />
        <Text variant="caption" tone={highlight === 'views' ? 'info' : 'muted'}>
          {views.toLocaleString()}
        </Text>
      </View>
      <View style={styles.productStatItem}>
        <Icon name="heart" size={theme.iconSize.sm} color={theme.colors.text.muted} />
        <Text variant="caption" tone={highlight === 'likes' ? 'danger' : 'muted'}>
          {likes.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

// Product Row Component
export function ProductRow({ product, index, metric }: { product: ProductStats; index: number; metric: 'views' | 'likes' }) {
  return (
    <Pressable style={styles.productRow} onPress={() => router.push(`/product/${product.id}`)}>
      <RankBadge index={index} />
      {product.image ? (
        <Image source={{ uri: resolveImageUrl(product.image) }} style={styles.productImage} />
      ) : (
        <View style={styles.productImage} />
      )}
      <View style={styles.productInfo}>
        <Text variant="label" numberOfLines={1}>
          {product.title}
        </Text>
        <Text variant="caption" tone="primary">
          {formatPrice(product.price)}
        </Text>
      </View>
      <StatsColumn views={product.viewCount ?? 0} likes={product.likeCount ?? 0} highlight={metric} />
    </Pressable>
  );
}

// Collection Row Component
export function CollectionRow({ collection, index }: { collection: CollectionStats; index: number }) {
  return (
    <Pressable style={styles.productRow} onPress={() => router.push(`/collections/${collection.id}`)}>
      <RankBadge index={index} />
      {collection.coverImage ? (
        <Image source={{ uri: resolveImageUrl(collection.coverImage) }} style={styles.productImage} />
      ) : (
        <View style={styles.productImage} />
      )}
      <View style={styles.productInfo}>
        <Text variant="label" numberOfLines={1}>
          {collection.name}
        </Text>
        <Text variant="caption" tone="primary">
          {collection.itemCount} ürün
        </Text>
      </View>
      <StatsColumn views={collection.viewCount} likes={collection.likeCount} />
    </Pressable>
  );
}
