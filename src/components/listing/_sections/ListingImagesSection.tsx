import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ActionSheet,
  Alert,
  SectionCard,
  Spinner,
  Text,
  androidRipple,
  rippleClip,
  showPressedStyle,
  theme,
  type ActionSheetAction,
} from '@/ui';
import { useStableCallback } from '@/hooks/useStableCallback';

import type { ListingFormController } from '../_hooks/useListingForm';
import { ListingImageGrid } from '../_components/ListingImageGrid';

const { colors, spacing, radiusRole } = theme;

type SectionProps = { f: ListingFormController };

/**
 * Fotoğraflar: ekleme kutusu (kontenjan doluysa bilgi kutusu) + web gibi ızgara (kapak 2×2).
 * İlk görsel kapak; karoda ✕ kaldır, ↻ 90° çevir, ☆ kapak yap. Basılı tut + sürükle sıralar;
 * karoya dokunmak aynı eylemleri menüde (ActionSheet) açar — ekran okuyucu ve küçük ekran yolu.
 */
export function ListingImagesSection({ f }: SectionProps) {
  const { t } = useTranslation();
  const maxImages = f.limits?.maxImagesPerListing || 5;
  const onPick = useStableCallback(f.pickImages);
  const onRemove = useStableCallback(f.removeImage);
  const onRotate = useStableCallback((id: string) => void f.rotateImage(id));
  const onMakeCover = useStableCallback(f.makeCoverImage);
  const onMove = useStableCallback(f.moveImage);
  const onShift = useStableCallback(f.shiftImage);
  const onDragActiveChange = useStableCallback(f.setImageDragActive);
  // Menü kimliği kapanışta KORUNUR: kapanış animasyonu sürerken satırlar boşalmasın.
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useStableCallback((id: string) => {
    setMenuId(id);
    setMenuOpen(true);
  });

  const menuIndex = menuId ? f.images.findIndex((img) => img.id === menuId) : -1;
  const menuImage = menuIndex >= 0 ? f.images[menuIndex] : undefined;
  const actions = useMemo<ActionSheetAction[]>(() => {
    if (!menuImage) return [];
    const last = f.images.length - 1;
    const busy = menuImage.status !== 'ready';
    const list: ActionSheetAction[] = [];
    if (menuIndex > 0) {
      list.push({
        key: 'cover',
        label: t('product.imageUpload.makeCover'),
        disabled: busy,
        onPress: () => onMakeCover(menuImage.id),
        testID: 'listing-image-menu-cover',
      });
      list.push({
        key: 'left',
        label: t('product.imageUpload.moveLeft'),
        onPress: () => onShift(menuImage.id, -1),
        testID: 'listing-image-menu-left',
      });
    }
    if (menuIndex < last) {
      list.push({
        key: 'right',
        label: t('product.imageUpload.moveRight'),
        onPress: () => onShift(menuImage.id, 1),
        testID: 'listing-image-menu-right',
      });
    }
    list.push({
      key: 'rotate',
      label: t('product.imageUpload.rotate'),
      disabled: busy,
      onPress: () => onRotate(menuImage.id),
      testID: 'listing-image-menu-rotate',
    });
    list.push({
      key: 'remove',
      label: t('common.remove'),
      destructive: true,
      onPress: () => onRemove(menuImage.id),
      testID: 'listing-image-menu-remove',
    });
    return list;
  }, [menuImage, menuIndex, f.images.length, t, onMakeCover, onShift, onRotate, onRemove]);

  return (
    <SectionCard title={t('product.images')}>
      {f.imageKeys.length < maxImages ? (
        <Pressable
          testID="listing-image-add"
          accessibilityRole="button"
          accessibilityState={{ disabled: f.uploadingImages, busy: f.uploadingImages }}
          onPress={onPick}
          android_ripple={androidRipple()}
          disabled={f.uploadingImages}
          style={({ pressed }) => [styles.addBox, rippleClip(), showPressedStyle(pressed) && styles.addBoxPressed]}
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

      {f.images.length > 0 ? (
        <>
          {f.images.length > 1 ? (
            <Text variant="caption" tone="subtle" style={styles.hint}>
              {t('product.imageUpload.orderHintTouch')}
            </Text>
          ) : null}
          <ListingImageGrid
            images={f.images}
            onOpenMenu={openMenu}
            onRemove={onRemove}
            onRotate={onRotate}
            onMakeCover={onMakeCover}
            onMove={onMove}
            onDragActiveChange={onDragActiveChange}
          />
        </>
      ) : null}

      <ActionSheet
        isOpen={menuOpen && !!menuImage}
        onClose={() => setMenuOpen(false)}
        title={menuIndex >= 0 ? t('product.imageUpload.imageAlt', { index: menuIndex + 1 }) : undefined}
        actions={actions}
        testID="listing-image-menu"
      />
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
  hint: {
    marginTop: spacing[3],
  },
});
