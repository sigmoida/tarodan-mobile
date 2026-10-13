import { View, Image, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Avatar, Text, theme, Icon } from '@/ui';
import { transformImageUrl } from '@/utils/imageUrl';

const { colors, iconSize, spacing, radiusRole } = theme;

/**
 * Koleksiyon kartı (web `CollectionCard`): kare kapak, ad (2 satır), açıklama (1 satır),
 * "N araç" + görüntülenme/beğeni sayaçları ve sahip altlığı. Ürün kartıyla aynı çerçeve.
 */
export function CollectionCard({ item }: { item: any }) {
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
                <Icon name="eye" variant="solid" size={iconSize.sm} color={colors.primary[500]!} />
                <Text variant="caption" tone="subtle">
                  {item.viewCount}
                </Text>
              </View>
            ) : null}
            {item.likeCount !== undefined ? (
              <View style={styles.counter}>
                <Icon name="heart" variant="solid" size={iconSize.sm} color={colors.danger[500]!} />
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

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radiusRole.productCard,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  pressed: { opacity: 0.85 },
  cover: { aspectRatio: 1, backgroundColor: colors.surface.alt },
  coverImage: { width: '100%', height: '100%' },
  body: { flex: 1, padding: spacing[2.5], gap: spacing[0.5] },
  meta: {
    marginTop: 'auto',
    paddingTop: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counters: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
  },
});
