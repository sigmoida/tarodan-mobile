import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Divider, IconButton, Text } from '@/ui';
import type { SavedSearch } from '@/types';
import type { ChipNameOptions } from '@/utils/activeFilterChips';
import { formatLongDate } from '@/utils/format';
import { savedSearchChips } from '../_lib/chips';
import { styles } from '../_lib/styles';

/** One saved search: name, summary chips, saved date, delete and "Run this search" (web `SavedSearchCard`). */
export function SavedSearchCard({
  search,
  names,
  deleting,
  onDelete,
  onRun,
}: {
  search: SavedSearch;
  names: ChipNameOptions;
  deleting: boolean;
  onDelete: (search: SavedSearch) => void;
  onRun: (search: SavedSearch) => void;
}) {
  const { t } = useTranslation();
  const chips = savedSearchChips(search, t, names);
  const savedOn = formatLongDate(search.createdAt, t('common.dateLocale'));
  return (
    <Card variant="bordered" testID="saved-search-card">
      <View style={styles.cardHeader}>
        <Text variant="label" style={styles.searchName} numberOfLines={2}>
          {search.name ?? t('savedSearch.untitled')}
        </Text>
        <IconButton
          testID="saved-search-delete"
          icon="trash"
          variant="danger"
          size="sm"
          isLoading={deleting}
          accessibilityLabel={t('savedSearch.deleteTitle')}
          onPress={() => onDelete(search)}
        />
      </View>

      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip, i) => (
            <Badge key={`${i}:${chip}`} variant="outline" size="sm">
              {chip}
            </Badge>
          ))}
        </View>
      ) : null}

      {savedOn ? (
        <Text variant="caption" tone="muted" style={styles.savedOn}>
          {t('savedSearch.savedOn', { date: savedOn })}
        </Text>
      ) : null}

      <Divider style={styles.divider} />

      <Button
        testID="saved-search-run"
        variant="primary"
        size="sm"
        fullWidth
        title={t('search.runThisSearch')}
        onPress={() => onRun(search)}
      />
    </Card>
  );
}
