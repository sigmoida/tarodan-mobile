import { View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ScreenHeader, Spinner, Text, theme } from '@/ui';

import { useBlockUser } from '@/hooks/useBlockUser';
import { useBlockedUsers } from './_hooks/useBlockedUsers';
import { BlockedUserRow } from './_components/BlockedUserRow';
import { styles } from './_lib/styles';

const { colors } = theme;

/**
 * Profil → Engellenen Kullanıcılar (Apple App Review 1.2: engellenenler listesi
 * + engel kaldırma). Web `profile/blocked` ile aynı içerik.
 */
export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const f = useBlockedUsers();
  const { requestUnblock, pending } = useBlockUser();

  if (!f.isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="ban-outline" size={64} color={colors.primary[600]!} />
        <Text variant="h3" style={styles.title}>
          {t('profile.blockedPage.title')}
        </Text>
        <Text variant="body" style={styles.subtitle}>
          {t('profile.blockedPage.emptyDesc')}
        </Text>
        <Button
          variant="primary"
          title={t('common.login')}
          onPress={() => router.push('/(auth)/login')}
          style={{ alignSelf: 'center' }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('profile.blockedPage.title')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
        right={<Text style={styles.headerCount}>{f.blocked.length}</Text>}
      />

      {f.isLoading ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      ) : (
        <FlatList
          data={f.blocked}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="ban-outline"
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
      )}
    </View>
  );
}
