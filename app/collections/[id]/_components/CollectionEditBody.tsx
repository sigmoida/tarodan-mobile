import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, IconButton, SectionCard, Switch, Text, Input, Textarea } from '@/ui';

import { styles } from '../_lib/collectionEditStyles';
import type { CollectionEditController } from '../_hooks/useCollectionEdit';
import { orderCollectionItems, toCollectionItemCard, type CollectionItemCard } from '../_lib/collectionItemCard';

/** One item row's image and title (a listing row is a link, a custom item row is not). */
function EditItemSummary({ id, card }: { id: string; card: CollectionItemCard }) {
  return (
    <>
      <AppImage source={card.product.imageUrl} recyclingKey={id} style={styles.itemImage} />
      <Text variant="bodySm" style={styles.itemTitle} numberOfLines={1}>
        {card.product.title}
      </Text>
    </>
  );
}

/** Kapak seçici, bilgi/gizlilik formu, öğe listesi (SectionCard'lar). Silme sabit alt barda (`edit.tsx`). */
export function CollectionEditBody({ f }: { f: CollectionEditController }) {
  const { t } = useTranslation();
  const { collection, coverImage, id } = f;
  const { control, formState: { errors }, watch } = f.form;

  // Every item, also a listing the detail screen hides: this list is where the owner can still remove it.
  const fallbackTitle = t('product.productFallback');
  const rows = useMemo(
    () => orderCollectionItems(collection?.items).map((item) => ({ item, card: toCollectionItemCard(item, fallbackTitle) })),
    [collection?.items, fallbackTitle],
  );

  // Ekran (edit.tsx) collection yokken bu gövdeyi render etmez; TS için güvence.
  if (!collection) return null;

  return (
    <>
      <Pressable
        style={styles.cover}
        onPress={f.pickCoverImage}
        accessibilityRole="button"
        accessibilityLabel={coverImage ? t('common.replace') : t('collection.addCoverPhoto')}
      >
        {coverImage ? (
          <>
            <AppImage source={coverImage} variant="detail" allowDeviceUris style={styles.coverImage} />
            <View style={styles.coverOverlay}>
              <Text variant="bodySm" tone="inverted" weight="medium">
                {t('common.replace')}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text variant="bodySm" tone="muted">
              {t('collection.addCoverPhoto')}
            </Text>
          </View>
        )}
      </Pressable>

      <SectionCard title={t('collection.infoSectionTitle')} bodyStyle={styles.fields}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <Input
              label={t('collection.collectionNameLabel')}
              value={value}
              onChangeText={onChange}
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <Textarea label={t('collection.descriptionLabel')} value={value} onChangeText={onChange} rows={3} />
          )}
        />
      </SectionCard>

      <SectionCard title={t('collection.privacySectionTitle')}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text variant="body">{watch('isPublic') ? t('collection.isPublic') : t('collection.isPrivate')}</Text>
            <Text variant="bodySm" tone="muted">
              {watch('isPublic') ? t('collection.publicVisibleToAll') : t('collection.privateVisibleToYou')}
            </Text>
          </View>
          <Controller
            control={control}
            name="isPublic"
            render={({ field: { onChange, value } }) => <Switch value={value} onValueChange={onChange} />}
          />
        </View>
      </SectionCard>

      <SectionCard
        title={t('collection.itemsHeaderTitle', { count: rows.length })}
        action={
          <Button
            variant="outline"
            size="sm"
            title={t('common.add')}
            onPress={() => router.push(`/collections/${id}/add-items`)}
          />
        }
      >
        {rows.length === 0 ? (
          <EmptyState placement="inline" icon="cube" title={t('collection.noItemsAdded')} subtitle={t('emptyState.collectionItemsHint')} />
        ) : (
          rows.map(({ item, card }, i) => (
            <View key={item.id} style={[styles.item, i > 0 && styles.divided]}>
              {/* A custom item (no listing) is not a link, like on the detail screen. */}
              {item.productId ? (
                <Pressable
                  style={styles.itemContent}
                  onPress={() => router.push(`/product/${item.productId}`)}
                  accessibilityRole="button"
                >
                  <EditItemSummary id={item.id} card={card} />
                </Pressable>
              ) : (
                <View style={styles.itemContent} accessible>
                  <EditItemSummary id={item.id} card={card} />
                </View>
              )}
              <IconButton
                icon="x-mark"
                accessibilityLabel={`${t('collection.removeItem')}, ${card.product.title}`}
                size="sm"
                onPress={() => f.requestRemove(item.id)}
              />
            </View>
          ))
        )}
      </SectionCard>
    </>
  );
}
