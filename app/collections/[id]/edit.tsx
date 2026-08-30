import { View } from 'react-native';
import { Spinner, EmptyState, theme } from '@/ui';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { styles } from './_lib/collectionEditStyles';
import { useCollectionEdit } from './_hooks/useCollectionEdit';
import { CollectionEditBody } from './_components/CollectionEditBody';

const { colors } = theme;

/**
 * Collection edit — THIN screen. The `useCollectionEdit` controller owns the
 * query, RHF form, and update/delete/remove-item mutations; this file renders
 * the loading / not-found / not-owner gates and delegates the body.
 */
export default function EditCollectionScreen() {
  const { t } = useTranslation();
  const f = useCollectionEdit();

  const headerScreenOptions = {
    headerShown: true,
    title: t('collection.editCollectionTitle'),
    headerStyle: { backgroundColor: colors.primary[600]! },
    headerTintColor: colors.white,
    headerTitleStyle: { fontWeight: 'bold' as const },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' as const,
  };

  if (f.isLoading) {
    return (
      <>
        <Stack.Screen options={headerScreenOptions} />
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      </>
    );
  }

  if (!f.collection) {
    return (
      <>
        <Stack.Screen options={headerScreenOptions} />
        <EmptyState
          fullscreen
          icon="albums-outline"
          title={t('collection.collectionNotFound')}
          actionLabel={t('common.goBack')}
          onAction={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        />
      </>
    );
  }

  // Check ownership
  if (f.collection && f.user && f.collection.userId !== f.user.id) {
    return (
      <>
        <Stack.Screen options={headerScreenOptions} />
        <EmptyState
          fullscreen
          icon="lock-closed-outline"
          title={t('collection.noEditPermission')}
          actionLabel={t('common.goBack')}
          onAction={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={headerScreenOptions} />
      <CollectionEditBody f={f} />
    </>
  );
}
