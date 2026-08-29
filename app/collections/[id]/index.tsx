import { View } from 'react-native';
import { Spinner, Text, EmptyState } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { styles } from './_lib/collectionStyles';
import { useCollectionDetail } from './_hooks/useCollectionDetail';
import { CollectionDetailBody } from './_components/CollectionDetailBody';

/**
 * Collection detail — THIN screen. The `useCollectionDetail` controller owns the
 * query, optimistic like, share, and owner/premium flags; this file renders the
 * loading/not-found gates and delegates the body.
 */
export default function CollectionDetailScreen() {
  const { t } = useTranslation();
  const f = useCollectionDetail();

  if (f.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="lg" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!f.collection) {
    return (
      <EmptyState
        fullscreen
        icon="albums-outline"
        title={t('collection.collectionNotFound')}
        actionLabel={t('common.goBack')}
        onAction={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
    );
  }

  return <CollectionDetailBody f={f} />;
}
