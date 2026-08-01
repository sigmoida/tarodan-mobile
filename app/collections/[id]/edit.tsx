import { View } from 'react-native';
import { Spinner, EmptyState, theme } from '@/ui';
import { router, Stack } from 'expo-router';

import { styles } from './_lib/collectionEditStyles';
import { useCollectionEdit } from './_hooks/useCollectionEdit';
import { CollectionEditBody } from './_components/CollectionEditBody';

const { colors } = theme;

const headerScreenOptions = {
  headerShown: true,
  title: 'Koleksiyonu Düzenle',
  headerStyle: { backgroundColor: colors.primary[600]! },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: 'bold' as const },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
};

/**
 * Collection edit — THIN screen. The `useCollectionEdit` controller owns the
 * query, RHF form, and update/delete/remove-item mutations; this file renders
 * the loading / not-found / not-owner gates and delegates the body.
 */
export default function EditCollectionScreen() {
  const f = useCollectionEdit();

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
          title="Koleksiyon bulunamadı"
          actionLabel="Geri Dön"
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
          title="Bu koleksiyonu düzenleme yetkiniz yok"
          actionLabel="Geri Dön"
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
