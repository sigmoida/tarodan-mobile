import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, TopBarLabel, pageListContentStyle, usePageScrollHandler } from '@/ui';

import { AuthGatePage } from '@/components/common/AuthGatePage';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { PageShell } from '@/components/common/PageShell';
import { useBlockUser } from '@/hooks/useBlockUser';
import { useBlockedUsers } from './_hooks/useBlockedUsers';
import { BlockedUserRow } from './_components/BlockedUserRow';

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
      right={<TopBarLabel>{f.blocked.length}</TopBarLabel>}
      loading={f.isLoading}
      loadingFallback={<RowListSkeleton />}
    >
      <Animated.FlatList
        {...page.listProps}
        data={f.blocked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={page.contentStyle(pageListContentStyle)}
        ListEmptyComponent={
          <EmptyState
            icon="no-symbol"
            title={f.isError ? t('profile.blockedPage.loadFailed') : t('profile.blockedPage.empty')}
            subtitle={t('profile.blockedPage.emptyDesc')}
          />
        }
        renderItem={({ item }) => (
          <BlockedUserRow
            item={item}
            busy={pending}
            onUnblock={(userId, name) => requestUnblock(userId, name)}
          />
        )}
      />
    </PageShell>
  );
}
