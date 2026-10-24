import { useCallback } from 'react';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, TopBarLabel, pageListContentStyle, usePageScrollHandler, usePageContentStyle, useRowGrid } from '@/ui';

import { listWindowing } from '@/lib/list/windowing';
import type { BlockedUser } from '@/lib/api';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { PageShell } from '@/components/common/PageShell';
import { useBlockUser } from '@/hooks/useBlockUser';
import { useBlockedUsers } from './_hooks/useBlockedUsers';
import { BlockedUserRow } from './_components/BlockedUserRow';

const blockedKey = (item: BlockedUser) => item.id;

/**
 * Profil → Engellenen Kullanıcılar (Apple App Review 1.2: engellenenler listesi
 * + engel kaldırma). Web `profile/blocked` ile aynı içerik.
 */
export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const f = useBlockedUsers();
  const { requestUnblock, pending } = useBlockUser();
  const title = t('profile.blockedPage.title');
  const page = usePageScrollHandler();
  // Large screens: edge to edge with the tablet gutter (src/ui/CLAUDE.md › Large screens).
  const listContentStyle = usePageContentStyle(pageListContentStyle);
  // Large screens: the rows become a card grid (src/ui/CLAUDE.md › Large screens).
  const grid = useRowGrid();
  const renderBlocked = useCallback(
    ({ item, index }: { item: BlockedUser; index: number }) =>
      grid.cell(index, <BlockedUserRow item={item} busy={pending} onUnblock={requestUnblock} />),
    [pending, requestUnblock, grid],
  );

  if (!f.isAuthenticated) {
    return (
      <AuthGatePage
        title={title}
        icon="no-symbol"
        subtitle={t('profile.blockedPage.emptyDesc')}
      />
    );
  }

  return (
    <PageShell
      title={title}
      mode="list"
      scroll={page}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
      // No count while the list failed to load: "0" would contradict the error state below.
      right={f.loadFailed ? undefined : <TopBarLabel>{f.blocked.length}</TopBarLabel>}
      loading={f.isLoading}
      loadingFallback={<RowListSkeleton />}
    >
      <Animated.FlatList
        key={grid.listKey}
        numColumns={grid.numColumns}
        {...page.listProps}
        data={f.blocked}
        keyExtractor={blockedKey}
        {...listWindowing}
        contentContainerStyle={page.contentStyle(listContentStyle)}
        ListEmptyComponent={
          f.loadFailed ? (
            <ErrorState
              placement="list"
              title={t('profile.blockedPage.loadFailed')}
              onRetry={() => void f.refetch()}
            />
          ) : (
            <EmptyState
              placement="list"
              icon="no-symbol"
              title={t('profile.blockedPage.empty')}
              subtitle={t('profile.blockedPage.emptyDesc')}
            />
          )
        }
        renderItem={renderBlocked}
      />
    </PageShell>
  );
}
