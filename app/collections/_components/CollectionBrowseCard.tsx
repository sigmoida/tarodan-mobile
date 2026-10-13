import { View, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Avatar, Text, theme } from '@/ui';
import { transformImageUrl } from '@/utils/imageUrl';
import { styles } from '../_lib/browseStyles';

const { colors, iconSize } = theme;

/**
 * Koleksiyon kartı (web `CollectionCard`): kare kapak, ad (2 satır), açıklama (1 satır),
 * "N araç" + görüntülenme/beğeni sayaçları ve sahip altlığı. Ürün kartıyla aynı çerçeve.
 */
export function CollectionBrowseCard({ item }: { item: any }) {
  const { t } = useTranslation();
  const cover = item.coverImageUrl ?? item.coverImage;
  const ownerName = item.userName || item.user?.displayName || t('collection.anonymous');
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/collections/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={styles.cover}>
        {cover ? (
          <Image source={{ uri: transformImageUrl(cover) }} style={styles.coverImage} resizeMode="cover" />
        ) : null}
      </View>
      <View style={styles.body}>
        <Text variant="bodySm" weight="medium" numberOfLines={2}>
          {item.name}
        </Text>
        {item.description ? (
          <Text variant="caption" tone="subtle" numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Text variant="caption" tone="subtle" weight="medium">
            {item.itemCount ?? 0} {t('collection.items')}
          </Text>
          <View style={styles.counters}>
            {item.viewCount !== undefined ? (
              <View style={styles.counter}>
                <Ionicons name="eye" size={iconSize.sm} color={colors.primary[500]!} />
                <Text variant="caption" tone="subtle">
                  {item.viewCount}
                </Text>
              </View>
            ) : null}
            {item.likeCount !== undefined ? (
              <View style={styles.counter}>
                <Ionicons name="heart" size={iconSize.sm} color={colors.danger[500]!} />
                <Text variant="caption" tone="subtle">
                  {item.likeCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.owner}>
        <Avatar size="sm" name={ownerName} />
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {ownerName}
        </Text>
      </View>
    </Pressable>
  );
}
