import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, EmptyState, TopBarLabel, useRowGrid, type GridColumnSpec } from '@/ui';
import { useSavedSearches } from './_hooks/useSavedSearches';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { SavedSearchCard } from './_components/SavedSearchCard';
import { styles } from './_lib/styles';

/** Saved search cards per row: one on phones, two side by side on every tablet width. */
const SAVED_SEARCH_COLUMNS: GridColumnSpec = { compact: 1, medium: 2, expanded: 2, large: 2 };

/**
 * Saved searches (web `profile/saved-searches`): the server list with the tier limit, Run and Delete.
 * The limit alert is neutral, no upgrade button (digital sales are off on the stores, ADR 0003).
 * Tablets: the cards stand in two columns (`SAVED_SEARCH_COLUMNS`).
 */
export default function SavedSearchesScreen() {
  const { t } = useTranslation();
  const f = useSavedSearches();
  const grid = useRowGrid(SAVED_SEARCH_COLUMNS);

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
      {f.searches.length === 0 ? (
        <EmptyState
          icon="magnifying-glass"
          title={t('search.savedEmptyTitle')}
          subtitle={t('search.savedEmptyDescription')}
          actionLabel={t('search.searchListings')}
          onAction={() => router.push('/search')}
        />
      ) : (
        <View style={grid.numColumns > 1 ? styles.grid : styles.list} testID="saved-search-list">
          {f.searches.map((search, index) =>
            React.cloneElement(
              grid.cell(
                index,
                <SavedSearchCard
                  search={search}
                  names={{ colors: f.colors }}
                  deleting={f.pendingId === search.id}
                  onDelete={f.handleDelete}
                  onRun={f.runSearch}
                />,
              ),
              { key: search.id },
            ),
          )}
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
