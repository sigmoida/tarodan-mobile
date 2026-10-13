import React from 'react';
import { Image, RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, Input, RawText, SkeletonAvatar, SkeletonText, Text, pageListContentStyle, theme, ListRowCard, usePageScrollHandler } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { resolveImageUrl } from '@/utils/imageUrl';
import { useManufacturers, type Manufacturer } from './_hooks/useManufacturers';

const { colors, spacing, typography, radiusRole } = theme;
const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];

function ManufacturerRow({ item }: { item: Manufacturer }) {
  const { t } = useTranslation();
  const count = item.productCount ?? item._count?.products;
  return (
    <ListRowCard onPress={() => router.push(`/ureticiler/${item.slug}` as any)}>
      <View style={styles.logoWrap}>
        {item.logo ? (
          <Image source={{ uri: resolveImageUrl(item.logo) }} style={styles.logo} resizeMode="contain" />
        ) : (
          <RawText style={styles.logoFallback}>{item.name.charAt(0).toUpperCase()}</RawText>
        )}
      </View>
      <View style={styles.body}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {item.name}
        </Text>
        {typeof count === 'number' ? (
          <Text variant="caption" tone="muted">
            {t('payment.itemsCount', { count })}
          </Text>
        ) : null}
      </View>
    </ListRowCard>
  );
}

/**
 * Üreticiler (web `/manufacturers`): arama + üretici satırları. Eski "Markalar" listesi
 * (`/brands`) buraya yönlenir. Kontrolcü `useManufacturers`.
 */
export default function ManufacturersScreen() {
  const { t } = useTranslation();
  const f = useManufacturers();
  const page = usePageScrollHandler();

  return (
    <PageShell title={t('nav.manufacturers')} mode="list" scroll={page}>
      <Animated.FlatList
        {...page.listProps}
        data={f.isLoading || f.error ? [] : f.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ManufacturerRow item={item} />}
        contentContainerStyle={page.contentStyle(styles.content)}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={f.isRefetching}
            onRefresh={f.refetch}
            progressViewOffset={page.topInset}
            colors={[colors.primary[600]!]}
            tintColor={colors.primary[600]!}
          />
        }
        ListHeaderComponent={
          <Input
            value={f.search}
            onChangeText={f.setSearch}
            placeholder={t('product.searchManufacturers')}
            leftIconName="magnifying-glass"
          />
        }
        ListEmptyComponent={
          f.isLoading ? (
            <View style={styles.skeleton} testID="manufacturers-skeleton">
              {SKELETON_ROWS.map((i) => (
                <ListRowCard key={i}>
                  <SkeletonAvatar />
                  <View style={styles.body}>
                    <SkeletonText lines={2} />
                  </View>
                </ListRowCard>
              ))}
            </View>
          ) : f.error ? (
            <ErrorState onRetry={() => f.refetch()} />
          ) : (
            <EmptyState
              icon="magnifying-glass"
              title={f.hasAny ? t('common.noResults') : t('product.noManufacturersYet')}
              subtitle={f.hasAny ? t('search.tryDifferent') : t('emptyState.manufacturersHint')}
            />
          )
        }
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  content: { ...pageListContentStyle, gap: spacing[2], flexGrow: 1 },
  skeleton: { gap: spacing[2] },
  logoWrap: {
    width: spacing[12],
    height: spacing[12],
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.alt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: spacing[10], height: spacing[10] },
  logoFallback: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  body: { flex: 1, minWidth: 0 },
});
