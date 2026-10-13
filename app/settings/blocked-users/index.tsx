import { FlatList } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Text, pageListContentStyle } from '@/ui';

import { AuthGatePage } from '@/components/common/AuthGatePage';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { PageShell } from '@/components/common/PageShell';
import { useBlockUser } from '@/hooks/useBlockUser';
import { useBlockedUsers } from './_hooks/useBlockedUsers';
import { BlockedUserRow } from './_components/BlockedUserRow';
import { styles } from './_lib/styles';

/**
 * Profil → Engellenen Kullanıcılar (Apple App Review 1.2: engellenenler listesi
 * + engel kaldırma). Web `profile/blocked` ile aynı içerik.
 */
export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const f = useBlockedUsers();
  const { requestUnblock, pending } = useBlockUser();
  const title = t('profile.blockedPage.title');

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
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
      right={<Text style={styles.headerCount}>{f.blocked.length}</Text>}
      loading={f.isLoading}
      loadingFallback={<RowListSkeleton />}
    >
      <FlatList
        data={f.blocked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={pageListContentStyle}
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
