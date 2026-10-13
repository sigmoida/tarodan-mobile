import React from 'react';
import { Pressable, View } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, SectionCard, Text, theme, Icon } from '@/ui';
import { formatCount } from '@/utils/format';
import { homeStyles as styles } from '../_lib/homeStyles';

const { colors, iconSize } = theme;

const displayName = (u: any, fallback: string): string => u?.publicName || u?.displayName || fallback;

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="bodySm" weight="bold">
        {value}
      </Text>
      <Text variant="overline" tone="muted" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

/** Ürün/koleksiyon küçük görselleri (web: telefonda 4 sütun, en çok 5). */
function Thumbs({ items }: { items: Array<{ key: string; uri: string; onPress: () => void }> }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.thumbGrid}>
      {items.map((it) => (
        <Pressable key={it.key} onPress={it.onPress} style={styles.thumb} accessibilityRole="button">
          <AppImage source={it.uri} style={styles.fill} resizeMode="cover" />
        </Pressable>
      ))}
    </View>
  );
}

function VerifiedName({ name, verified }: { name: string; verified?: boolean }) {
  return (
    <View style={styles.nameRow}>
      <Text variant="bodySm" weight="bold" numberOfLines={1} style={styles.flexShrink}>
        {name}
      </Text>
      {verified ? <Icon name="check-circle" variant="solid" size={iconSize.sm} color={colors.success[500]!} /> : null}
    </View>
  );
}

/** "Haftanın Koleksiyoneri" (web `Spotlights`): koleksiyoner, 3 sayaç, görseller ve koleksiyon bağlantısı. */
function CollectorSpotlight({ collector }: { collector: any }) {
  const { t } = useTranslation();
  const name = displayName(collector.user, t('home.collector'));
  const items: any[] = (collector.items ?? []).slice(0, 5);
  return (
    <SectionCard title={t('home.collectorOfWeek')} testID="home-collector">
      <View style={styles.spotlightHead}>
        <Avatar size="lg" name={name} source={collector.user?.avatarUrl} />
        <View style={styles.flex}>
          <VerifiedName name={name} verified={collector.user?.isVerified} />
          <Text variant="caption" tone="primary" weight="medium">
            {collector.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {collector.description || `${collector.itemCount || 0} ${t('home.items')}`}
          </Text>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat value={formatCount(collector.viewCount)} label={t('home.statViews')} />
        <Stat value={formatCount(collector.likeCount)} label={t('home.statLikes')} />
        <Stat value={collector.itemCount || 0} label={t('home.statItems')} />
      </View>
      <Thumbs
        items={items.map((it) => ({
          key: it.id,
          uri: it.productImage,
          onPress: () => it.productId && router.push(`/product/${it.productId}`),
        }))}
      />
      <Button
        title={t('home.viewCollection')}
        onPress={() => router.push(`/collections/${collector.id}` as any)}
        fullWidth
      />
    </SectionCard>
  );
}

/** "Haftanın Şirketi" (web `Spotlights`): şirket, 4 sayaç, ürün görselleri ve mağaza bağlantısı. */
function BusinessSpotlight({ business }: { business: any }) {
  const { t } = useTranslation();
  const name = displayName(business, business.companyName || t('home.collector'));
  const stats = business.stats ?? {};
  const products: any[] = (business.products ?? []).slice(0, 5);
  return (
    <SectionCard title={t('home.companyOfWeek')} testID="home-business">
      <View style={styles.spotlightHead}>
        <Avatar size="lg" name={name} source={business.avatarUrl} />
        <View style={styles.flex}>
          <VerifiedName name={name} verified={business.isVerified} />
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {business.bio || t('home.companyBioFallback')}
          </Text>
          {stats.averageRating > 0 ? (
            <View style={styles.ratingRow}>
              <Icon name="star" variant="solid" size={iconSize.sm} color={colors.warning[400]!} />
              <Text variant="caption" weight="semibold">
                {Number(stats.averageRating).toFixed(1)}
              </Text>
              <Text variant="caption" tone="muted">
                ({stats.totalRatings || 0})
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.stats}>
        <Stat value={stats.totalProducts || 0} label={t('home.statProducts')} />
        <Stat value={stats.totalSales || 0} label={t('common.sales')} />
        <Stat value={formatCount(stats.totalViews)} label={t('home.statViews')} />
        <Stat value={formatCount(stats.totalLikes)} label={t('home.statLikes')} />
      </View>
      <Thumbs
        items={products.map((p) => ({
          key: p.id,
          uri: p.image,
          onPress: () => router.push(`/product/${p.id}`),
        }))}
      />
      <Button title={t('home.viewStore')} onPress={() => router.push(`/seller/${business.id}` as any)} fullWidth />
    </SectionCard>
  );
}

/** Haftanın Koleksiyoneri + Haftanın Şirketi; ikisi de yoksa hiçbir şey çizilmez. */
export function Spotlights({ collector, business }: { collector: any | null; business: any | null }) {
  if (!collector && !business) return null;
  return (
    <>
      {collector ? <CollectorSpotlight collector={collector} /> : null}
      {business ? <BusinessSpotlight business={business} /> : null}
    </>
  );
}
