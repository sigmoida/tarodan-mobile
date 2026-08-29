import React from 'react';
import { View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, Switch, Snackbar, IconButton, Text, Input, Textarea, theme } from '@/ui';

import { resolveImageUrl } from '@/utils/imageUrl';
import { styles } from '../_lib/collectionEditStyles';
import type { CollectionEditController } from '../_hooks/useCollectionEdit';

const { colors } = theme;

/** Cover picker, form (name/description/privacy), items list, and danger zone. */
export function CollectionEditBody({ f }: { f: CollectionEditController }) {
  const { t } = useTranslation();
  const { collection, coverImage, id } = f;
  const { control, handleSubmit, formState: { errors }, watch } = f.form;

  // Ekran (edit.tsx) collection yokken bu gövdeyi render etmez; TS için güvence.
  if (!collection) return null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Cover Image */}
        <TouchableOpacity style={styles.coverImageContainer} onPress={f.pickCoverImage}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverImagePlaceholder}>
              <Ionicons name="image-outline" size={48} color={colors.text.muted} />
              <Text variant="body" style={styles.coverImageText}>{t('collection.addCoverPhoto')}</Text>
            </View>
          )}
          {coverImage && (
            <View style={styles.coverOverlay}>
              <Ionicons name="camera" size={24} color={colors.white} />
              <Text style={styles.coverOverlayText}>{t('common.replace')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="eye" size={20} color={colors.text.muted} />
            <Text variant="body">{t('collection.viewCountSuffix', { count: collection.viewCount })}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={20} color={colors.danger[600]!} />
            <Text variant="body">{t('collection.likeCountSuffix', { count: collection.likeCount })}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="pricetag" size={20} color={colors.primary[600]!} />
            <Text variant="body">{t('collection.itemCountSuffix', { count: collection.items?.length || 0 })}</Text>
          </View>
        </View>

        {/* Collection Details */}
        <View style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>{t('collection.infoSectionTitle')}</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('collection.collectionNameLabel')}
                value={value}
                onChangeText={onChange}
                error={errors.name?.message}
                containerStyle={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <Textarea
                label={t('collection.descriptionLabel')}
                value={value}
                onChangeText={onChange}
                rows={3}
                containerStyle={styles.input}
              />
            )}
          />
        </View>

        {/* Privacy Settings */}
        <View style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>{t('collection.privacySectionTitle')}</Text>

          <View style={styles.privacyOption}>
            <View style={styles.privacyInfo}>
              <Ionicons
                name={watch('isPublic') ? 'globe-outline' : 'lock-closed'}
                size={24}
                color={colors.primary[600]!}
              />
              <View style={styles.privacyText}>
                <Text variant="body">{watch('isPublic') ? t('collection.isPublic') : t('collection.isPrivate')}</Text>
                <Text variant="bodySm" style={styles.privacyDesc}>
                  {watch('isPublic')
                    ? t('collection.publicVisibleToAll')
                    : t('collection.privateVisibleToYou')}
                </Text>
              </View>
            </View>
            <Controller
              control={control}
              name="isPublic"
              render={({ field: { onChange, value } }) => (
                <Switch value={value} onValueChange={onChange} />
              )}
            />
          </View>
        </View>

        {/* Collection Items */}
        <View style={styles.card}>
          <View style={styles.itemsHeader}>
            <Text variant="h3" style={styles.sectionTitle}>
              {t('collection.itemsHeaderTitle', { count: collection.items?.length || 0 })}
            </Text>
            <Button
              variant="outline"
              title={t('common.add')}
              onPress={() => router.push(`/collections/${id}/add-items`)}
              icon="add"
              size="sm"
            />
          </View>

          {collection.items?.length === 0 ? (
            <View style={styles.emptyItems}>
              <Ionicons name="images-outline" size={48} color={colors.gray[500]} />
              <Text variant="body" style={styles.emptyText}>{t('collection.noItemsAdded')}</Text>
            </View>
          ) : (
            collection.items?.map((item) => (
              <View key={item.id} style={styles.collectionItem}>
                <TouchableOpacity
                  style={styles.itemContent}
                  onPress={() => router.push(`/product/${item.productId}`)}
                >
                  <Image source={{ uri: resolveImageUrl(item.productImage) }} style={styles.itemImage} />
                  <Text variant="body" style={styles.itemTitle} numberOfLines={1}>
                    {item.productTitle}
                  </Text>
                </TouchableOpacity>
                <IconButton
                  icon="close"
                  accessibilityLabel={t('collection.removeProduct')}
                  size="sm"
                  onPress={() => f.handleRemoveItem(item.id, item.productTitle)}
                />
              </View>
            ))
          )}
        </View>

        {/* Actions */}
        <Button
          variant="primary"
          title={t('collection.saveChanges')}
          onPress={handleSubmit(f.onSubmit)}
          isLoading={f.updateMutation.isPending}
          disabled={f.updateMutation.isPending}
          icon="checkmark"
          style={styles.saveButton}
        />

        {/* Danger Zone */}
        <View style={styles.dangerCard}>
          <Text variant="h3" style={styles.dangerTitle}>{t('collection.dangerZoneTitle')}</Text>
          <TouchableOpacity onPress={f.handleDelete} style={styles.dangerItem}>
            <Ionicons name="trash" size={24} color={colors.danger[600]!} />
            <View style={{ flex: 1, marginLeft: theme.spacing[3] }}>
              <Text style={styles.dangerItemTitle}>{t('collection.deleteCollection')}</Text>
              <Text style={styles.dangerItemDesc}>{t('collection.irreversibleAction')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={() => f.setSnackbar({ ...f.snackbar, visible: false })}
        duration={3000}
      >
        {f.snackbar.message}
      </Snackbar>
    </View>
  );
}
