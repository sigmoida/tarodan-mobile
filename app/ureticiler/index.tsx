import React from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, Input, SkeletonAvatar, SkeletonText, Text, pageListContentStyle, theme, ListRowCard, usePageScrollHandler } from '@/ui';
import { listWindowing } from '@/lib/list/windowing';
import { PageShell } from '@/components/common/PageShell';
import { EntityLogo } from '@/components/catalog/EntityLogo';
import { listingCount } from '@/utils/catalogListings';
import { useManufacturers, type Manufacturer } from './_hooks/useManufacturers';

const { colors, spacing } = theme;
const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];

const renderManufacturer = ({ item }: { item: Manufacturer }) => <ManufacturerRow item={item} />;
const manufacturerKey = (item: Manufacturer) => item.id;

const ManufacturerRow = React.memo(function ManufacturerRow({ item }: { item: Manufacturer }) {
  const { t } = useTranslation();
  const count = listingCount(item);
  return (
    <ListRowCard onPress={() => router.push(`/ureticiler/${item.slug}` as any)}>
      <EntityLogo logo={item.logo} name={item.name} />
      <View style={styles.body}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" tone="muted">
          {t('payment.itemsCount', { count })}
        </Text>
      </View>
    </ListRowCard>
  );
});

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
        keyExtractor={manufacturerKey}
        renderItem={renderManufacturer}
        {...listWindowing}
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
  body: { flex: 1, minWidth: 0 },
});
