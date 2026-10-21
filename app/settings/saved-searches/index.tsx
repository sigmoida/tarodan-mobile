import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, EmptyState, PageHeader, TopBarLabel } from '@/ui';
import { useSavedSearches } from './_hooks/useSavedSearches';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { SavedSearchCard } from './_components/SavedSearchCard';
import { styles } from './_lib/styles';

/**
 * Saved searches (web `profile/saved-searches`): the server list with the tier limit, Run and Delete.
 * The limit alert is neutral, no upgrade button (digital sales are off on the stores, ADR 0003).
 */
export default function SavedSearchesScreen() {
  const { t } = useTranslation();
  const f = useSavedSearches();

  if (!f.isAuthenticated) {
    return (
      <AuthGatePage
        title={t('search.savedTitle')}
        icon="magnifying-glass"
        subtitle={t('savedSearch.signInToSave')}
      />
    );
  }

  return (
    <PageShell
      title={t('search.savedTitle')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      right={
        f.showCount ? (
          <TopBarLabel>{t('search.countOfLimit', { count: f.total, limit: f.limit })}</TopBarLabel>
        ) : undefined
      }
      loading={f.isLoading}
      loadingFallback={<RowListSkeleton rows={4} />}
      error={f.loadFailed || undefined}
      errorTitle={t('savedSearch.loadFailed')}
      onRetry={f.retry}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      <PageHeader description={t('search.savedDescription')} />

      {f.searches.length === 0 ? (
        <EmptyState
          icon="magnifying-glass"
          title={t('search.savedEmptyTitle')}
          subtitle={t('search.savedEmptyDescription')}
          actionLabel={t('search.searchListings')}
          onAction={() => router.push('/search')}
        />
      ) : (
        <View style={styles.list}>
          {f.searches.map((search) => (
            <SavedSearchCard
              key={search.id}
              search={search}
              names={{ colors: f.colors }}
              deleting={f.pendingId === search.id}
              onDelete={f.handleDelete}
              onRun={f.runSearch}
            />
          ))}
        </View>
      )}

      {f.atLimit && f.limit !== undefined ? (
        <Alert variant="warning" title={t('savedSearch.limitTitle')} testID="saved-search-limit">
          {t('search.savedLimitReached', { limit: f.limit })}
        </Alert>
      ) : null}
    </PageShell>
  );
}
