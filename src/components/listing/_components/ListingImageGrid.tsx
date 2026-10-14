import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTranslation } from 'react-i18next';
import { useLatestRef } from '@/hooks/useLatestRef';
import {
  Icon,
  IconButton,
  Pill,
  Spinner,
  androidRipple,
  iconButtonBoxSize,
  rippleClip,
  showPressedStyle,
  theme,
} from '@/ui';

import type { ListingImage } from '../_lib/images';
import { gridHeight, moveSlots, slotAtPoint, slotRect } from '../_lib/imageGrid';

const { colors, spacing, radiusRole, typography, duration } = theme;

/** Karolar arası boşluk (web `gap-2`). */
const GAP = spacing[2];
/** Basılı tutma süresi — sonra sürükleme başlar; öncesinde parmak kayarsa form kayar. */
const LONG_PRESS_MS = 300;

/** Köşe düğmeleri (IconButton xs, web ile aynı 24pt) karonun köşesinden bu kadar içeride. */
const CORNER_INSET = spacing[1];
const CORNER_BOX = iconButtonBoxSize('xs');
/**
 * 44pt dokunma alanı: karonun DIŞINA taşmaz (Android'de ebeveyn dışı hitSlop dokunuş almaz),
 * kalan pay karonun içine doğru. Dört köşe 2 × 44 = 88pt ister; 360pt Android'de hücre ≈ 95pt.
 */
const INWARD = theme.minTouchTarget - CORNER_BOX - CORNER_INSET;
const SLOP = {
  topRight: { top: CORNER_INSET, right: CORNER_INSET, bottom: INWARD, left: INWARD },
  bottomLeft: { top: INWARD, right: INWARD, bottom: CORNER_INSET, left: CORNER_INSET },
  bottomRight: { top: INWARD, right: CORNER_INSET, bottom: CORNER_INSET, left: INWARD },
};

export interface ListingImageGridProps {
  images: ListingImage[];
  /** Karoya dokunma: eylem menüsü (kapak yap / taşı / çevir / kaldır) — erişilebilir yol. */
  onOpenMenu: (id: string) => void;
  onRemove: (id: string) => void;
  onRotate: (id: string) => void;
  onMakeCover: (id: string) => void;
  /** Sürükle-bırak: kalem KİMLİĞİ + bırakılan yuva; kaynak konumu üst güncel listeden çözer. */
  onMove: (id: string, to: number) => void;
  /** Sürükleme başladı/bitti — form ScrollView'ı bu sürede kaymaz. */
  onDragActiveChange: (active: boolean) => void;
}

interface DragState {
  slots: SharedValue<Record<string, number>>;
  width: SharedValue<number>;
  count: SharedValue<number>;
  draggingId: SharedValue<string | null>;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  startSlot: SharedValue<number>;
  originX: SharedValue<number>;
  originY: SharedValue<number>;
  startSize: SharedValue<number>;
}

const slotMap = (images: ReadonlyArray<ListingImage>) =>
  Object.fromEntries(images.map((img, i) => [img.id, i] as const));

/**
 * Web `ImagePreviewGrid` (telefon genişliği): 3 sütun, kapak karosu 2×2. Sıralama: karoyu basılı
 * tut + sürükle (gesture-handler Pan, `activateAfterLongPress`; yerleşim UI thread'inde
 * reanimated ile). Dokunma eylem menüsünü açar — ekran okuyucu ve küçük ekran yolu.
 */
export function ListingImageGrid({
  images,
  onOpenMenu,
  onRemove,
  onRotate,
  onMakeCover,
  onMove,
  onDragActiveChange,
}: ListingImageGridProps) {
  const [width, setWidth] = useState(0);
  const slotsSV = useSharedValue<Record<string, number>>(slotMap(images));
  const widthSV = useSharedValue(0);
  const countSV = useSharedValue(images.length);
  const draggingId = useSharedValue<string | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const startSlot = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const startSize = useSharedValue(0);
  // Sabit referans: memo'lu karolar her üst render'da yeniden çizilmesin.
  const drag = useMemo<DragState>(
    () => ({
      slots: slotsSV,
      width: widthSV,
      count: countSV,
      draggingId,
      dragX,
      dragY,
      startSlot,
      originX,
      originY,
      startSize,
    }),
    [slotsSV, widthSV, countSV, draggingId, dragX, dragY, startSlot, originX, originY, startSize],
  );
  const { slots, count } = drag;

  // Sıra props'tan gelir (tek kaynak `useListingForm.images`); bırakınca üst state güncellenir
  // ve harita aynı sıraya yeniden kurulur (sıçrama yok).
  // Sürükleme SÜRERKEN harita yeniden kurulmaz (sürüklenen karonun yuvası sıfırlanırdı); yalnız
  // sayı güncellenir. Bırakışta sıra değişirse bu effect yeniden koşar, değişmezse `handleDragEnd`
  // haritayı güncel listeden kurar — ekran sırası her zaman payload sırasına eşit.
  const order = images.map((img) => img.id).join('|');
  const imagesRef = useLatestRef(images);
  useEffect(() => {
    count.value = images.length;
    if (draggingId.value === null) slots.value = slotMap(images);
    // `order` sıra değişimini temsil eder; `images` referansı her çevirmede değişir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, slots, count, draggingId]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      drag.width.value = w;
      setWidth(w);
    },
    [drag.width],
  );

  /** Bırakıştan hemen sonra gelen dokunuş (bazı cihazlarda) menüyü açmasın. */
  const draggedAtRef = useRef(0);
  const handleDragStart = useCallback(() => {
    draggedAtRef.current = Date.now();
    onDragActiveChange(true);
  }, [onDragActiveChange]);
  const handleDragEnd = useCallback(
    (id: string, to: number) => {
      draggedAtRef.current = Date.now();
      onDragActiveChange(false);
      const list = imagesRef.current;
      const from = list.findIndex((img) => img.id === id);
      if (from >= 0 && from !== to && to < list.length) onMove(id, to);
      else slots.value = slotMap(list);
    },
    [onDragActiveChange, onMove, imagesRef, slots],
  );
  /**
   * Sürüklenen karo bitiş bildirimi gelmeden söküldü (ikinci parmakla ✕, bölüm söküldü):
   * `onFinalize` gelmeyebilir — kilit ve sürükleme durumu burada bırakılır.
   */
  const handleDragAbort = useCallback(() => {
    draggedAtRef.current = Date.now();
    onDragActiveChange(false);
  }, [onDragActiveChange]);

  // Izgara sökülürken sürükleme yarıda kaldıysa form kaydırması kilitli kalmasın.
  const dragActiveChangeRef = useLatestRef(onDragActiveChange);
  useEffect(
    () => () => {
      if (draggingId.value !== null) {
        draggingId.value = null;
        dragActiveChangeRef.current(false);
      }
    },
    [draggingId, dragActiveChangeRef],
  );
  const handleOpenMenu = useCallback(
    (id: string) => {
      if (Date.now() - draggedAtRef.current < 400) return;
      onOpenMenu(id);
    },
    [onOpenMenu],
  );

  const height = width > 0 ? gridHeight(images.length, width, GAP) : 0;
  const sortable = images.length > 1;

  return (
    <View style={[styles.grid, { height }]} onLayout={onLayout} testID="listing-image-grid">
      {width > 0
        ? images.map((image, index) => (
            <ImageTile
              key={image.id}
              image={image}
              index={index}
              isCover={index === 0}
              sortable={sortable}
              drag={drag}
              onOpenMenu={handleOpenMenu}
              onRemove={onRemove}
              onRotate={onRotate}
              onMakeCover={onMakeCover}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragAbort={handleDragAbort}
            />
          ))
        : null}
    </View>
  );
}

interface TileProps {
  image: ListingImage;
  index: number;
  isCover: boolean;
  sortable: boolean;
  drag: DragState;
  onOpenMenu: (id: string) => void;
  onRemove: (id: string) => void;
  onRotate: (id: string) => void;
  onMakeCover: (id: string) => void;
  onDragStart: () => void;
  onDragEnd: (id: string, to: number) => void;
  onDragAbort: () => void;
}

const ImageTile = memo(function ImageTile({
  image,
  index,
  isCover,
  sortable,
  drag,
  onOpenMenu,
  onRemove,
  onRotate,
  onMakeCover,
  onDragStart,
  onDragEnd,
  onDragAbort,
}: TileProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { id } = image;
  const busy = image.status !== 'ready';
  const label = { index: index + 1 };

  // İlk karede yerine OTURUR (sol üstten kayarak gelmesin); sonraki yuva değişimleri animasyonlu.
  const mounted = useSharedValue(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      mounted.value = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [mounted]);

  // Bu karo sürüklenirken söküldüyse durum burada sıfırlanır (bkz. `handleDragAbort`).
  const dragAbortRef = useLatestRef(onDragAbort);
  useEffect(
    () => () => {
      if (drag.draggingId.value === id) {
        drag.draggingId.value = null;
        dragAbortRef.current();
      }
    },
    [drag.draggingId, id, dragAbortRef],
  );

  const animMs = reduceMotion ? 0 : duration.normal;
  const { slots, width: widthSV, count, draggingId, dragX, dragY, startSlot, originX, originY, startSize } = drag;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(`listing-image-drag-${index}`)
        .enabled(sortable && !busy)
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart(() => {
          'worklet';
          if (draggingId.value !== null) return;
          const slot = slots.value[id] ?? 0;
          const r = slotRect(slot, widthSV.value, GAP);
          startSlot.value = slot;
          originX.value = r.x;
          originY.value = r.y;
          startSize.value = r.size;
          dragX.value = r.x;
          dragY.value = r.y;
          draggingId.value = id;
          scheduleOnRN(onDragStart);
        })
        .onUpdate((e) => {
          'worklet';
          if (draggingId.value !== id) return;
          dragX.value = originX.value + e.translationX;
          dragY.value = originY.value + e.translationY;
          const cx = originX.value + startSize.value / 2 + e.translationX;
          const cy = originY.value + startSize.value / 2 + e.translationY;
          const target = slotAtPoint(cx, cy, count.value, widthSV.value, GAP);
          const current = slots.value[id] ?? 0;
          if (target !== current) slots.value = moveSlots(slots.value, id, current, target);
        })
        .onFinalize(() => {
          'worklet';
          if (draggingId.value !== id) return;
          draggingId.value = null;
          scheduleOnRN(onDragEnd, id, slots.value[id] ?? startSlot.value);
        }),
    [
      index, sortable, busy, id, slots, widthSV, count, draggingId, dragX, dragY,
      startSlot, originX, originY, startSize, onDragStart, onDragEnd,
    ],
  );

  const tileStyle = useAnimatedStyle(() => {
    const slot = slots.value[id] ?? index;
    const r = slotRect(slot, widthSV.value, GAP);
    const animate = mounted.value && animMs > 0;
    const to = (v: number) => (animate ? withTiming(v, { duration: animMs }) : v);
    if (draggingId.value === id) {
      return {
        width: to(r.size),
        height: to(r.size),
        transform: [{ translateX: dragX.value }, { translateY: dragY.value }, { scale: to(1.04) }],
        zIndex: 10,
        opacity: 0.9,
      };
    }
    return {
      width: to(r.size),
      height: to(r.size),
      transform: [{ translateX: to(r.x) }, { translateY: to(r.y) }, { scale: to(1) }],
      zIndex: 0,
      opacity: 1,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.tile, tileStyle]}
        testID={`listing-image-tile-${index}`}
      >
        <Pressable
          testID={`listing-image-open-${index}`}
          accessibilityRole="button"
          accessibilityLabel={
            isCover
              ? `${t('product.imageUpload.imageAlt', label)}, ${t('product.imageUpload.cover')}`
              : t('product.imageUpload.imageAlt', label)
          }
          accessibilityHint={t('product.imageUpload.reorderImage', label)}
          accessibilityState={{ busy }}
          onPress={() => onOpenMenu(id)}
          android_ripple={androidRipple()}
          style={({ pressed }) => [styles.fill, rippleClip(), showPressedStyle(pressed) && styles.pressed]}
        >
          {/* Sunucu URL'si (yükleme anında API'nin döndürdüğü); `AppImage` yerine RN Image (eski şeritle aynı). */}
          <Image source={{ uri: image.uri }} style={[styles.fill, busy && styles.busyImage]} />
        </Pressable>

        {isCover ? (
          <Pill
            size="sm"
            background={colors.primary[600]}
            color={colors.text.inverted}
            weight={typography.fontWeight.semibold}
            icon={<Icon name="star" variant="solid" size={typography.fontSize.xs} color={colors.text.inverted} />}
            style={styles.badge}
            pointerEvents="none"
            testID="listing-image-cover-badge"
          >
            {t('product.imageUpload.cover')}
          </Pill>
        ) : (
          <Pill
            size="sm"
            background={colors.overlay.white90}
            borderColor={colors.border.DEFAULT}
            color={colors.text.muted}
            weight={typography.fontWeight.medium}
            style={styles.badge}
            pointerEvents="none"
            testID={`listing-image-order-${index}`}
          >
            {String(index + 1)}
          </Pill>
        )}

        {busy ? (
          <View style={styles.busy} pointerEvents="none">
            <Spinner />
          </View>
        ) : null}

        <IconButton
          icon="x-mark"
          size="xs"
          color={colors.text.muted}
          accessibilityLabel={t('product.imageUpload.removeImage', label)}
          hitSlop={SLOP.topRight}
          onPress={() => onRemove(id)}
          style={{ ...styles.corner, ...styles.topRight }}
          testID={`listing-image-remove-${index}`}
        />
        {!busy ? (
          <IconButton
            icon="arrow-uturn-right"
            size="xs"
            color={colors.text.muted}
            accessibilityLabel={t('product.imageUpload.rotateImage', label)}
            hitSlop={SLOP.bottomLeft}
            onPress={() => onRotate(id)}
            style={{ ...styles.corner, ...styles.bottomLeft }}
            testID={`listing-image-rotate-${index}`}
          />
        ) : null}
        {!isCover && !busy ? (
          <IconButton
            icon="star"
            size="xs"
            color={colors.text.muted}
            accessibilityLabel={t('product.imageUpload.makeCoverImage', label)}
            hitSlop={SLOP.bottomRight}
            onPress={() => onMakeCover(id)}
            style={{ ...styles.corner, ...styles.bottomRight }}
            testID={`listing-image-cover-${index}`}
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  grid: {
    marginTop: spacing[3],
  },
  tile: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.alt,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  pressed: { opacity: 0.85 },
  busyImage: { opacity: 0.6 },
  busy: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: spacing[1.5],
    left: spacing[1.5],
  },
  corner: {
    position: 'absolute',
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.overlay.white90,
    ...theme.shadow.soft,
  },
  topRight: { top: CORNER_INSET, right: CORNER_INSET },
  bottomLeft: { bottom: CORNER_INSET, left: CORNER_INSET },
  bottomRight: { bottom: CORNER_INSET, right: CORNER_INSET },
});
