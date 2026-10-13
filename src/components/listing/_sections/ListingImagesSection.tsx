import React, { memo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, IconButton, Pill, SectionCard, Spinner, Text, iconButtonBoxSize, theme } from '@/ui';
import { useStableCallback } from '@/hooks/useStableCallback';

import type { ListingFormController } from '../_hooks/useListingForm';
import { listingRipple } from './fields';

const { colors, spacing, radiusRole, typography } = theme;

type SectionProps = { f: ListingFormController };

/** Küçük resim kenarı (pt) — yatay şeritte 88pt kare. */
const THUMB_SIZE = 88;
/** ✕ düğmesi (IconButton xs) küçük resim köşesinden bu kadar içeride. */
const REMOVE_INSET = spacing[1];
const REMOVE_BOX = iconButtonBoxSize('xs');
/**
 * ✕ dokunma alanı 44×44: üst/sağda yalnız köşe boşluğu kadar (dokunma alanı ebeveyn
 * sınırını aşmasın — Android'de ebeveyn dışına taşan hitSlop dokunuş almaz), kalan
 * alt/solda.
 */
const REMOVE_SLOP = {
  top: REMOVE_INSET,
  right: REMOVE_INSET,
  bottom: theme.minTouchTarget - REMOVE_BOX - REMOVE_INSET,
  left: theme.minTouchTarget - REMOVE_BOX - REMOVE_INSET,
};

interface ThumbProps {
  uri: string;
  index: number;
  isCover: boolean;
  coverLabel: string;
  removeLabel: string;
  onRemove: (index: number) => void;
}

const ImageThumb = memo(function ImageThumb({ uri, index, isCover, coverLabel, removeLabel, onRemove }: ThumbProps) {
  return (
    <View style={styles.thumb}>
      {/* Yerel (file://) ve uzak görsel karışık: `AppImage` cihaz URI'sini kabul etmediği için RN Image. */}
      <Image source={{ uri }} style={styles.thumbImage} />
      {isCover ? (
        <Pill
          size="sm"
          background={colors.primary[600]}
          color={colors.text.inverted}
          weight={typography.fontWeight.bold}
          style={styles.coverBadge}
        >
          {coverLabel}
        </Pill>
      ) : null}
      <IconButton
        icon="x-mark"
        size="xs"
        variant="solid"
        color={colors.text.inverted}
        accessibilityLabel={removeLabel}
        hitSlop={REMOVE_SLOP}
        onPress={() => onRemove(index)}
        style={styles.removeButton}
        testID={`listing-image-remove-${index}`}
      />
    </View>
  );
});

/**
 * Fotoğraflar: ekleme kutusu (kontenjan doluysa bilgi kutusu) + yatay küçük resim şeridi.
 * İlk görsel kapak ("Kapak" rozeti); ✕ görseli kaldırır.
 */
export function ListingImagesSection({ f }: SectionProps) {
  const { t } = useTranslation();
  const maxImages = f.limits?.maxImagesPerListing || 5;
  const onRemove = useStableCallback(f.removeImage);
  const onPick = useStableCallback(f.pickImages);
  const coverLabel = t('listing.coverBadge');

  return (
    <SectionCard title={t('product.images')}>
      {f.imageKeys.length < maxImages ? (
        <Pressable
          testID="listing-image-add"
          accessibilityRole="button"
          accessibilityState={{ disabled: f.uploadingImages, busy: f.uploadingImages }}
          onPress={onPick}
          android_ripple={listingRipple}
          disabled={f.uploadingImages}
          style={({ pressed }) => [styles.addBox, pressed && styles.addBoxPressed]}
        >
          {f.uploadingImages ? (
            <Spinner />
          ) : (
            <Text variant="bodySm" weight="medium" tone="muted">
              {t('listing.tapToUpload')}
            </Text>
          )}
          <Text variant="caption" tone="subtle">
            {t('listing.uploadedCount', { count: f.imageKeys.length, max: maxImages })}
          </Text>
        </Pressable>
      ) : (
        <Alert variant="success">{t('product.maxImagesReached')}</Alert>
      )}

      {f.imageUris.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.strip}
          contentContainerStyle={styles.stripContent}
        >
          {f.imageUris.map((uri, index) => (
            <ImageThumb
              key={`img-${index}`}
              uri={uri}
              index={index}
              isCover={index === 0}
              coverLabel={coverLabel}
              removeLabel={t('product.imageUpload.removeImage', { index: index + 1 })}
              onRemove={onRemove}
            />
          ))}
        </ScrollView>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  addBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[6],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.DEFAULT,
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.DEFAULT,
  },
  addBoxPressed: {
    borderColor: colors.primary[500],
  },
  strip: {
    marginTop: spacing[3],
  },
  stripContent: {
    gap: spacing[2.5],
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  // Konum yalnız burada; boyut/renk/yazı `Pill` tabanından.
  coverBadge: {
    position: 'absolute',
    bottom: spacing[1],
    left: spacing[1],
  },
  removeButton: {
    position: 'absolute',
    top: REMOVE_INSET,
    right: REMOVE_INSET,
    backgroundColor: colors.danger[600],
    borderRadius: theme.radius.full,
  },
});
