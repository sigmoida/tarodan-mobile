import React from 'react';
import { View, Pressable } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, IconButton, SectionCard, Switch, Text, Input, Textarea } from '@/ui';

import { styles } from '../_lib/collectionEditStyles';
import type { CollectionEditController } from '../_hooks/useCollectionEdit';

/** Kapak seçici, bilgi/gizlilik formu, öğe listesi (SectionCard'lar). Silme sabit alt barda (`edit.tsx`). */
export function CollectionEditBody({ f }: { f: CollectionEditController }) {
  const { t } = useTranslation();
  const { collection, coverImage, id } = f;
  const { control, formState: { errors }, watch } = f.form;

  // Ekran (edit.tsx) collection yokken bu gövdeyi render etmez; TS için güvence.
  if (!collection) return null;
  const items = collection.items ?? [];

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
        title={t('collection.itemsHeaderTitle', { count: items.length })}
        action={
          <Button
            variant="outline"
            size="sm"
            title={t('common.add')}
            onPress={() => router.push(`/collections/${id}/add-items`)}
          />
        }
      >
        {items.length === 0 ? (
          <EmptyState placement="inline" icon="cube" title={t('collection.noItemsAdded')} subtitle={t('emptyState.collectionItemsHint')} />
        ) : (
          items.map((item, i) => (
            <View key={item.id} style={[styles.item, i > 0 && styles.divided]}>
              <Pressable
                style={styles.itemContent}
                onPress={() => router.push(`/product/${item.productId}`)}
                accessibilityRole="button"
              >
                <AppImage source={item.productImage} recyclingKey={String(item.id)} style={styles.itemImage} />
                <Text variant="bodySm" style={styles.itemTitle} numberOfLines={1}>
                  {item.productTitle}
                </Text>
              </Pressable>
              <IconButton
                icon="x-mark"
                accessibilityLabel={t('collection.removeProduct')}
                size="sm"
                onPress={() => f.handleRemoveItem(item.id, item.productTitle)}
              />
            </View>
          ))
        )}
      </SectionCard>
    </>
  );
}
