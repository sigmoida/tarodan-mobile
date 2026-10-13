import { View, Image, Pressable } from 'react-native';
import { Button, Text, ListRowCard } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { resolveImageUrl } from '@/utils/imageUrl';
import { styles } from '../_lib/styles';
import type { Listing } from '../_lib/types';
import type { AddItemsController } from '../_hooks/useAddItems';
import { formatPrice } from '@/utils/format';

/** Tek ilan satırı — foto/başlık/fiyat + Ekle / Çıkar düğmesi (optimistic). */
export function ListingPickerRow({ listing, f }: { listing: Listing; f: AddItemsController }) {
  const { t } = useTranslation();
  const added = !!f.effectiveItemId(listing.id);
  const busy = !!f.pending[listing.id];

  return (
    <ListRowCard>
      <Pressable
        style={styles.rowContent}
        onPress={() => router.push(`/product/${listing.id}`)}
        accessibilityRole="button"
      >
        <Image source={{ uri: resolveImageUrl(listing.images) }} style={styles.thumb} />
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
        onPress={() => f.toggle(listing)}
        isLoading={busy}
        disabled={busy}
        accessibilityLabel={added ? t('collection.removeFromCollection') : t('collection.addToCollection')}
      />
    </ListRowCard>
  );
}
