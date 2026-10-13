import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Avatar, Button, EmptyState, SectionCard, Text, theme, Icon } from '@/ui';
import { ProductCard } from '@/components/product';
import { transformImageUrl } from '@/utils/imageUrl';
import UpgradeCta from '@/components/UpgradeCta';
import { styles } from '../_lib/collectionStyles';
import type { CollectionDetailController } from '../_hooks/useCollectionDetail';

const { colors, iconSize } = theme;

/** Koleksiyon öğesi → ürün kartı alanları (API: productId/productTitle/productImage/productPrice/productStatus). */
function toCardProduct(item: any, fallbackTitle: string) {
  return {
    id: String(item.productId ?? item.id),
    title: item.productTitle ?? item.title ?? fallbackTitle,
    price: item.productPrice ?? item.price ?? 0,
    imageUrl: item.productImage ?? item.imageUrl ?? null,
    status: item.productStatus ?? null,
  };
}

/** Başlık kartı (web `CollectionHeaderCard`), içerik kartı (öğeler) ve misafir bilgilendirmesi. */
export function CollectionDetailBody({ f }: { f: CollectionDetailController }) {
  const { t } = useTranslation();
  const { collection, items, id } = f;
  const cover = collection.coverImageUrl ?? collection.coverImage;

  return (
    <>
      <View style={styles.header} testID="collection-header">
        <View style={styles.topRow}>
          <View style={styles.cover}>
            {cover ? (
              <Image source={{ uri: transformImageUrl(cover) }} style={styles.coverImage} resizeMode="cover" />
            ) : null}
          </View>
          <View style={styles.headInfo}>
            <Text variant="h1" accessibilityRole="header">
              {collection.name}
            </Text>
            {collection.description ? (
              <Text variant="bodySm" tone="muted">
                {collection.description}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable
          style={styles.ownerChip}
          disabled={!collection.userId}
          onPress={() => collection.userId && router.push(`/seller/${collection.userId}`)}
          accessibilityRole="button"
        >
          <Avatar size="sm" name={collection.userName || t('collection.anonymous')} />
          <Text variant="bodySm" weight="medium">
            {collection.userName}
          </Text>
        </Pressable>

        <View style={styles.counters}>
          <View style={styles.counter}>
            <Icon name="eye" variant="solid" size={iconSize.sm} color={colors.primary[500]!} />
            <Text variant="bodySm" tone="subtle">
              {collection.viewCount} {t('collection.views')}
            </Text>
          </View>
          <View style={styles.counter}>
            <Icon name="heart" variant="solid" size={iconSize.sm} color={colors.danger[500]!} />
            <Text variant="bodySm" tone="subtle">
              {f.likeCount} {t('collection.likes')}
            </Text>
          </View>
        </View>

        {f.isOwner ? (
          <View style={styles.ownerActions}>
            <Button variant="secondary" title={t('collection.edit')} onPress={() => router.push(`/collections/${id}/edit`)} />
            {items.length > 0 ? (
              <Button title={t('collection.addProduct')} onPress={() => router.push(`/collections/${id}/add-items`)} />
            ) : null}
          </View>
        ) : null}
      </View>

      <SectionCard title={t('collection.contentsTitle')} testID="collection-items">
        {items.length === 0 ? (
          <EmptyState placement="inline"
            icon="cube"
            title={t('collection.noProductsYet')}
            subtitle={t('emptyState.collectionItemsHint')}
            actionLabel={f.isOwner ? t('collection.addFirstProduct') : undefined}
            onAction={f.isOwner ? () => router.push(`/collections/${id}/add-items`) : undefined}
          />
        ) : (
          <View style={styles.itemsGrid}>
            {items.map((item: any) => (
              <View key={item.id} style={styles.itemCell}>
                <ProductCard
                  product={toCardProduct(item, t('product.productFallback'))}
                  showMeta={false}
                  trackClick={!!item.productId}
                  onPress={() => item.productId && router.push(`/product/${item.productId}`)}
                />
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      {/* Misafir bilgilendirmesi — premium/business üyelere ve koleksiyon sahibine gösterme.
          Metin ("Premium üye olarak...") satışa yönelik; bu yüzden yalnız düğme değil, blok
          bütünüyle iOS'ta kapanır (Guideline 3.1.1/3.1.3). */}
      {!f.isPremiumMember && !f.isOwner && (
        <UpgradeCta>
          <Alert variant="default" title={t('collection.guestNoticeTitle')}>
            {t('collection.guestNoticeText')}
          </Alert>
          <Button
            title={t('collection.becomePremiumCta')}
            onPress={() => router.push(f.isAuthenticated ? '/upgrade' : '/(auth)/login')}
            fullWidth
          />
        </UpgradeCta>
      )}
    </>
  );
}
