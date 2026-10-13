import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, RawText } from '@/ui';

import { resolveImageUrl } from '@/utils/imageUrl';
import { styles } from '../_lib/styles';
import type { ProductStats, CollectionStats } from '../_lib/types';

const { colors } = theme;

// Stat Card Component
export function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={24} color={color} />
      <RawText style={styles.statValue}>{value.toLocaleString()}</RawText>
      <RawText style={styles.statLabel}>{label}</RawText>
    </View>
  );
}

// Product Row Component
export function ProductRow({ product, index, metric }: { product: ProductStats; index: number; metric: 'views' | 'likes' }) {
  return (
    <Pressable style={styles.productRow} onPress={() => router.push(`/product/${product.id}`)}>
      <View style={styles.productRank}>
        <RawText style={styles.productRankText}>{index + 1}</RawText>
      </View>
      {product.image ? (
        <Image source={{ uri: resolveImageUrl(product.image) }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <RawText>📦</RawText>
        </View>
      )}
      <View style={styles.productInfo}>
        <RawText style={styles.productTitle} numberOfLines={1}>{product.title}</RawText>
        <RawText style={styles.productPrice}>₺{(product.price ?? 0).toLocaleString('tr-TR')}</RawText>
      </View>
      <View style={styles.productStats}>
        <View style={styles.productStatItem}>
          <Ionicons name="eye" size={14} color={metric === 'views' ? colors.info[600]! : colors.text.muted} />
          <RawText style={[styles.productStatText, metric === 'views' && { color: colors.info[600]! }]}>
            {(product.viewCount ?? 0).toLocaleString()}
          </RawText>
        </View>
        <View style={styles.productStatItem}>
          <Ionicons name="heart" size={14} color={metric === 'likes' ? colors.danger[600]! : colors.text.muted} />
          <RawText style={[styles.productStatText, metric === 'likes' && { color: colors.danger[600]! }]}>
            {(product.likeCount ?? 0).toLocaleString()}
          </RawText>
        </View>
      </View>
    </Pressable>
  );
}

// Collection Row Component
export function CollectionRow({ collection, index }: { collection: CollectionStats; index: number }) {
  return (
    <Pressable style={styles.productRow} onPress={() => router.push(`/collections/${collection.id}`)}>
      <View style={styles.productRank}>
        <RawText style={styles.productRankText}>{index + 1}</RawText>
      </View>
      {collection.coverImage ? (
        <Image source={{ uri: resolveImageUrl(collection.coverImage) }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <RawText>📚</RawText>
        </View>
      )}
      <View style={styles.productInfo}>
        <RawText style={styles.productTitle} numberOfLines={1}>{collection.name}</RawText>
        <RawText style={styles.productPrice}>{collection.itemCount} ürün</RawText>
      </View>
      <View style={styles.productStats}>
        <View style={styles.productStatItem}>
          <Ionicons name="eye" size={14} color={colors.info[600]!} />
          <RawText style={[styles.productStatText, { color: colors.info[600]! }]}>
            {collection.viewCount.toLocaleString()}
          </RawText>
        </View>
        <View style={styles.productStatItem}>
          <Ionicons name="heart" size={14} color={colors.danger[600]!} />
          <RawText style={[styles.productStatText, { color: colors.danger[600]! }]}>
            {collection.likeCount.toLocaleString()}
          </RawText>
        </View>
      </View>
    </Pressable>
  );
}
