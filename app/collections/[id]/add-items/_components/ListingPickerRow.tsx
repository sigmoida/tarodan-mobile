import React from 'react';
import { View, Pressable } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { Button, Text, ListRowCard } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import type { Listing } from '../_lib/types';
import { formatPrice } from '@/utils/format';

/**
 * Tek ilan satırı — foto/başlık/fiyat + Ekle / Çıkar düğmesi (optimistic). Memo'lu: `added` / `busy`
 * ekran tarafından satır için hesaplanıp boolean geçilir, `onToggle` kararlı referanstır → bir
 * satırın durumu değişince diğer satırlar yeniden çizilmez.
 */
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

      <Button
        size="sm"
        variant={added ? 'primary' : 'outline'}
        icon={added ? 'check' : 'plus'}
        onPress={() => onToggle(listing)}
        isLoading={busy}
        disabled={busy}
        accessibilityLabel={added ? t('collection.removeFromCollection') : t('collection.addToCollection')}
      />
    </ListRowCard>
  );
});
