import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Avatar, Button, EmptyState, GlassIconButton, SectionCard, Text, theme, Icon, gridCellStyle, useGridColumns } from '@/ui';
import { ProductCard } from '@/components/product';
import { useProductCardFavorites } from '@/hooks/useFavoriteToggle';
import UpgradeCta from '@/components/UpgradeCta';
import { styles } from '../_lib/collectionStyles';
import { sortCollectionItems, toCollectionItemCard } from '../_lib/collectionItemCard';
import type { CollectionDetailController } from '../_hooks/useCollectionDetail';
import { CollectionItemBadges, hasCollectionItemBadges } from './CollectionItemBadges';

const { colors, iconSize } = theme;

/**
 * Üst barın sağ grubu (PageShell `right`) — ürün detayıyla aynı düzen ve sıra (cam daireler, 44pt):
 * paylaş herkese; sahibine düzenle (kalem) + ürün ekle (artı); sahibi olmayana beğen (dolu = danger)
 * ve şikayet bayrağı.
 */
export function CollectionTopActions({ f, onReport }: { f: CollectionDetailController; onReport: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.topActions} testID="collection-actions">
      <GlassIconButton
        testID="collection-share-button"
        icon="share"
        accessibilityLabel={t('collection.share')}
        onPress={f.handleShare}
      />
      {f.isOwner ? (
        <>
          <GlassIconButton
            testID="collection-edit-button"
            icon="pencil"
            accessibilityLabel={t('collection.edit')}
            onPress={() => router.push(`/collections/${f.id}/edit`)}
          />
          <GlassIconButton
            testID="collection-add-items-button"
            icon="plus"
            accessibilityLabel={t('collection.addProduct')}
            onPress={() => router.push(`/collections/${f.id}/add-items`)}
          />
        </>
      ) : (
        <>
          <GlassIconButton
            testID="collection-like-button"
            icon="heart"
            iconVariant={f.isLiked ? 'solid' : 'outline'}
            iconColor={f.isLiked ? colors.danger[500] : undefined}
            accessibilityLabel={t('collection.likes')}
            selected={f.isLiked}
            onPress={f.handleLike}
          />
          <GlassIconButton
            testID="collection-report-button"
            icon="flag"
            accessibilityLabel={t('collection.report')}
            onPress={onReport}
          />
        </>
      )}
    </View>
  );
}

/** Başlık kartı (web `CollectionHeaderCard`), içerik kartı (öğeler) ve misafir bilgilendirmesi. */
export function CollectionDetailBody({ f }: { f: CollectionDetailController }) {
  const { t } = useTranslation();
  const { collection, items, id } = f;
  // Kalp yalnız pazaryeri ürünü olan kalemde ve koleksiyon sahibi olmayana (sahibin kalemleri kendi ilanı).
  const favoriteProps = useProductCardFavorites();
  const columns = useGridColumns();
  const cover = collection.coverImageUrl ?? collection.coverImage;
  const fallbackTitle = t('product.productFallback');
  const cards = useMemo(
    () =>
      sortCollectionItems(items).map((item) => {
        const card = toCollectionItemCard(item, fallbackTitle);
        // Built once per item so the memoised card does not re-render on unrelated state.
        const badges = hasCollectionItemBadges(card) ? <CollectionItemBadges card={card} /> : undefined;
        return { key: item.id, card, badges };
      }),
    [items, fallbackTitle],
  );

  return (
    <>
      <View style={styles.header} testID="collection-header">
        <View style={styles.topRow}>
          <View style={styles.cover}>
            {cover ? (
              <AppImage source={cover} variant="detail" style={styles.coverImage} resizeMode="cover" />
            ) : null}
          </View>
          <View style={styles.headInfo}>
            <Text variant="h2" accessibilityRole="header">
              {collection.name}
            </Text>
            {collection.description ? (
              <Text variant="bodySm" tone="muted">
                {collection.description}
              </Text>
            ) : null}
            {/* Sahibi (profiline gider) — paylaş/beğen/şikayet üst barda; çip onların eski yerinde. */}
            <Pressable
              style={styles.ownerChip}
              disabled={!collection.userId}
              onPress={() => collection.userId && router.push(`/seller/${collection.userId}`)}
              accessibilityRole="button"
              testID="collection-owner-chip"
            >
              <Avatar size="sm" name={collection.userName || t('collection.anonymous')} />
              <Text variant="bodySm" weight="medium" numberOfLines={1} style={styles.ownerName}>
                {collection.userName}
              </Text>
            </Pressable>
          </View>
        </View>

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
      </View>

      <SectionCard title={t('collection.contentsTitle')} testID="collection-items">
        {cards.length === 0 ? (
          <EmptyState placement="inline"
            icon="cube"
            title={t('collection.noProductsYet')}
            subtitle={t('emptyState.collectionItemsHint')}
            actionLabel={f.isOwner ? t('collection.addFirstProduct') : undefined}
            onAction={f.isOwner ? () => router.push(`/collections/${id}/add-items`) : undefined}
          />
        ) : (
          <View style={styles.itemsGrid}>
            {cards.map(({ key, card, badges }, index) => (
              <View key={key} style={gridCellStyle(index, columns)}>
                <ProductCard
                  product={card.product}
                  testID={`collection-item-${key}`}
                  showMeta={false}
                  // Web shows no card action on collection items (its card shape has no status).
                  showAction={false}
                  // A custom item is not a listing: no link, no price (web `href={null}`).
                  onPress={card.isListing ? undefined : null}
                  noPriceLabel={card.isCustom ? t('collection.notForSale') : undefined}
                  overlayStart={badges}
                  {...(card.isListing && !f.isOwner ? favoriteProps(card.product) : null)}
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
          <Alert variant="info" title={t('collection.guestNoticeTitle')}>
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
