import React from 'react';
import { View, Pressable } from 'react-native';
import { AppImage } from '@/components/AppImage';
import {
  CheckboxIndicator,
  ListRowCard,
  LoadingIndicator,
  Text,
  androidRipple,
  pressedStyle,
  showPressedStyle,
  theme,
} from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import type { Listing } from '../_lib/types';
import { formatPrice } from '@/utils/format';

/**
 * Tek ilan satırı — foto/başlık/fiyat + sağda seçim kutusu (optimistic Ekle / Çıkar). Kutu, çoklu
 * seçim listeleriyle aynı `CheckboxIndicator` (SelectSheet `multiple`, sepet): 20pt, satırın orta
 * çizgisinde; dokunma alanı `hitSlop` ile ≥ 44pt (görsel sağ boşluk kartın 16pt dolgusu kalır).
 * Sol blok (foto + metin) ürüne gider. Memo'lu: `added` / `busy`
 * ekran tarafından satır için hesaplanıp boolean geçilir, `onToggle` kararlı referanstır → bir
 * satırın durumu değişince diğer satırlar yeniden çizilmez.
 */
/** Standart `md` kutu (20pt) + 44pt dokunma alanına tamamlayan boşluk. */
const CHECKBOX_SIZE = 20;
const TOGGLE_HIT_SLOP = (theme.minTouchTarget - CHECKBOX_SIZE) / 2;

export const ListingPickerRow = React.memo(function ListingPickerRow({
  listing,
  added,
  busy,
  onToggle,
}: {
  listing: Listing;
  added: boolean;
  busy: boolean;
  onToggle: (listing: Listing) => void;
}) {
  const { t } = useTranslation();

  return (
    <ListRowCard>
      <Pressable
        style={styles.rowContent}
        onPress={() => router.push(`/product/${listing.id}`)}
        accessibilityRole="button"
        accessibilityLabel={listing.title}
        accessibilityHint={t('collection.openProductHint')}
      >
        <AppImage source={listing.images} recyclingKey={String(listing.id)} style={styles.thumb} />
        <View style={styles.rowInfo}>
          <Text variant="bodySm" weight="semibold" numberOfLines={2}>
            {listing.title}
          </Text>
          <Text variant="bodySm" weight="bold" tone="primary">
            {formatPrice(listing.price)}
          </Text>
        </View>
      </Pressable>

      <Pressable
        testID={`add-items-toggle-${listing.id}`}
        onPress={() => onToggle(listing)}
        disabled={busy}
        hitSlop={TOGGLE_HIT_SLOP}
        android_ripple={androidRipple({ borderless: true, radius: theme.minTouchTarget / 2 })}
        style={({ pressed }) => [styles.toggle, showPressedStyle(pressed) && pressedStyle]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: added, disabled: busy, busy }}
        accessibilityLabel={`${t('collection.addToCollection')}: ${listing.title}`}
      >
        {/* Bekleyen istek: kutu yerine aynı yuvada küçük gösterge — yok sayılan dokunuş anlaşılır. */}
        {busy ? (
          <View style={styles.toggleSlot}>
            <LoadingIndicator size="sm" accessibilityLabel={t('common.loading')} />
          </View>
        ) : (
          <CheckboxIndicator checked={added} size={CHECKBOX_SIZE} />
        )}
      </Pressable>
    </ListRowCard>
  );
});
