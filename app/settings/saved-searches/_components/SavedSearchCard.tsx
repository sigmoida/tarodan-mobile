import { View } from 'react-native';
import { Card, Button, IconButton, Divider, Switch, Text } from '@/ui';
import { useTranslation } from 'react-i18next';
import { styles } from '../_lib/styles';
import { formatDate, getFilterSummary } from '../_lib/helpers';
import type { SavedSearch } from '../_lib/types';
import type { SavedSearchesController } from '../_hooks/useSavedSearches';

/** Tek kayıtlı arama kartı — sorgu/filtre özeti, çalıştır/sil, bildirim anahtarı. */
export function SavedSearchCard({ search, f }: { search: SavedSearch; f: SavedSearchesController }) {
  const { t } = useTranslation();
  return (
    <Card variant="bordered">
      <View style={styles.cardHeader}>
        <Text variant="label" style={styles.searchName} numberOfLines={1}>
          {search.name}
        </Text>
        <IconButton
          icon="trash-outline"
          variant="danger"
          size="sm"
          accessibilityLabel={t('savedSearch.deleteTitle')}
          onPress={() => f.handleDelete(search)}
        />
      </View>

      {search.query && (
        <Text variant="body" style={styles.queryText}>
          "{search.query}"
        </Text>
      )}

      <Text variant="bodySm" tone="muted" style={styles.filtersText}>
        {getFilterSummary(search.filters)}
      </Text>

      <Divider style={styles.divider} />

      <View style={styles.cardFooter}>
        <View style={styles.metaInfo}>
          {search.resultCount !== undefined && (
            <Text variant="caption">{t('savedSearch.resultCountSuffix', { count: search.resultCount })}</Text>
          )}
          <Text variant="caption">{t('savedSearch.createdLabel', { date: formatDate(search.createdAt) })}</Text>
        </View>
        <Button variant="primary" size="sm" title={t('savedSearch.run')} onPress={() => f.runSearch(search)} />
      </View>

      {/* Notification Toggle */}
      <View style={styles.notifyToggle}>
        <Text variant="bodySm" tone={search.notifyEnabled ? 'primary' : 'muted'} style={styles.notifyText}>
          {t('savedSearch.notifyToggleLabel')}
        </Text>
        <Switch
          value={!!search.notifyEnabled}
          onValueChange={(notifyEnabled) =>
            f.toggleNotificationMutation.mutate({ searchId: search.id, notifyEnabled })
          }
        />
      </View>
    </Card>
  );
}
