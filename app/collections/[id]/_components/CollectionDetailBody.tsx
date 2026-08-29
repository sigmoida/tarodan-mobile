import React from 'react';
import { View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Chip, Divider, Text, theme } from '@/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedRefreshControl } from '@/components/common';
import { transformImageUrl } from '@/utils/imageUrl';
import { styles } from '../_lib/collectionStyles';
import type { CollectionDetailController } from '../_hooks/useCollectionDetail';

const { colors } = theme;

/** Cover image, header buttons, collection info, items grid, and guest notice. */
export function CollectionDetailBody({ f }: { f: CollectionDetailController }) {
  const { t } = useTranslation();
  const { collection, items, id } = f;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Header Image */}
      <Image
        source={{ uri: transformImageUrl(collection.coverImageUrl ?? collection.coverImage) }}
        style={styles.coverImage}
        resizeMode="cover"
      />

      {/* Header Buttons */}
      <View style={[styles.headerButtons, { top: Math.max(insets.top, theme.spacing[3]) }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {f.isOwner && (
            <TouchableOpacity style={styles.headerButton} onPress={() => router.push(`/collections/${id}/edit`)}>
              <Ionicons name="create-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerButton} onPress={f.handleShare}>
            <Ionicons name="share-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={f.handleLike}>
            <Ionicons
              name={f.isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={f.isLiked ? colors.danger[600]! : colors.white}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<ThemedRefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} />}
      >
        {/* Collection Info */}
        <View style={styles.infoSection}>
          <Text style={styles.collectionName}>{collection.name}</Text>

          {/* Owner */}
          <TouchableOpacity
            style={styles.ownerRow}
            disabled={!collection.userId}
            onPress={() => collection.userId && router.push(`/seller/${collection.userId}`)}
          >
            <Avatar size="md" name={collection.userName || 'U'} />
            <View style={styles.ownerInfo}>
              <View style={styles.ownerNameRow}>
                <Text style={styles.ownerName}>{collection.userName}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="images-outline" size={20} color={colors.text.muted} />
              <Text style={styles.statValue}>{collection.itemCount}</Text>
              <Text style={styles.statLabel}>{t('collection.statModel')}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={20} color={colors.text.muted} />
              <Text style={styles.statValue}>{collection.viewCount}</Text>
              <Text style={styles.statLabel}>{t('collection.statViews')}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={20} color={colors.danger[600]!} />
              <Text style={styles.statValue}>{f.likeCount}</Text>
              <Text style={styles.statLabel}>{t('collection.statLikes')}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="share-social-outline" size={20} color={colors.text.muted} />
              <Text style={styles.statValue}>{collection.shareCount}</Text>
              <Text style={styles.statLabel}>{t('collection.statShares')}</Text>
            </View>
          </View>

          {/* Estimated Value */}
          {collection.estimatedValue && (
            <View style={styles.valueCard}>
              <Ionicons name="diamond-outline" size={24} color={colors.primary[600]!} />
              <View style={styles.valueInfo}>
                <Text style={styles.valueLabel}>{t('collection.estimatedValueLabel')}</Text>
                <Text style={styles.valueAmount}>
                  ₺{collection.estimatedValue.toLocaleString('tr-TR')}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          <Text style={styles.description}>{collection.description}</Text>

          {/* Tags */}
          {collection.tags && collection.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {collection.tags.map((tag: string, index: number) => (
                <Chip key={index} label={tag} />
              ))}
            </View>
          )}

          <Divider />

          {/* Items Section */}
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsTitle}>{t('collection.contentsTitle')}</Text>
            {f.isOwner ? (
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={() => router.push(`/collections/${id}/add-items`)}
              >
                <Ionicons name="add" size={18} color={colors.primary[600]!} />
                <Text style={styles.addItemBtnText}>{t('collection.addProduct')}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.itemsCount}>{t('collection.modelCount', { count: items.length })}</Text>
            )}
          </View>

          {/* Items Grid — API item şekli: { productId, productTitle, productImage, productPrice, productStatus } */}
          {items.length === 0 ? (
            <View style={styles.itemsEmpty}>
              <Ionicons name="cube-outline" size={40} color={colors.text.muted} />
              <Text style={styles.itemsEmptyText}>{t('collection.noProductsYet')}</Text>
              {f.isOwner && (
                <Button
                  variant="primary"
                  title={t('collection.addFirstProduct')}
                  icon="add"
                  onPress={() => router.push(`/collections/${id}/add-items`)}
                  style={{ marginTop: theme.spacing[3], alignSelf: 'center' }}
                />
              )}
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {items.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => item.productId && router.push(`/product/${item.productId}`)}
                >
                  <Image
                    source={{ uri: transformImageUrl(item.productImage ?? item.imageUrl) }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.productTitle ?? item.title ?? t('product.productFallback')}
                    </Text>
                    {(item.productPrice ?? item.price) != null && (
                      <Text style={styles.itemValue}>
                        ₺{Number(item.productPrice ?? item.price).toLocaleString('tr-TR')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Guest Notice — premium/business üyelere ve koleksiyon sahibine gösterme */}
        {!f.isPremiumMember && !f.isOwner && (
          <View style={styles.guestNotice}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.text.muted} />
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>{t('collection.guestNoticeTitle')}</Text>
              <Text style={styles.noticeText}>
                {t('collection.guestNoticeText')}
              </Text>
              <Button
                variant="primary"
                title={t('collection.becomePremiumCta')}
                onPress={() => router.push(f.isAuthenticated ? '/upgrade' : '/(auth)/login')}
                fullWidth
                style={styles.noticeButton}
              />
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
