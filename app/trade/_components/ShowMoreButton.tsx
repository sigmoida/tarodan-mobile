import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, theme } from '@/ui';

const styles = StyleSheet.create({
  button: { alignSelf: 'center', marginTop: theme.spacing[1] },
});

/**
 * "Show more" under a paged trade picker (web: the `common.loadMore` button). The pickers sit
 * inside the wizard's scroll view, so an explicit button replaces the end-reached pattern of
 * stand-alone lists. Renders nothing once every page is loaded.
 */
export function ShowMoreButton({
  hasMore,
  isLoadingMore,
  onPress,
  testID,
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  if (!hasMore) return null;
  return (
    <Button
      variant="secondary"
      size="md"
      title={t('common.loadMore')}
      onPress={onPress}
      isLoading={isLoadingMore}
      disabled={isLoadingMore}
      style={styles.button}
      testID={testID}
    />
  );
}
