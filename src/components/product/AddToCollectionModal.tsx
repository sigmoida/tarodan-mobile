import React, { useCallback } from 'react';
import { FlatList, Image, Platform, Pressable, StyleSheet, View, type ListRenderItem } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  theme,
  Text,
  Button,
  EmptyState,
  ErrorState,
  Spinner,
  BottomSheet,
  useBottomSheet,
  toast,
} from '@/ui';
import { collectionsApi, errorText } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { transformImageUrl } from '../../utils/imageUrl';

const { colors, spacing } = theme;

interface AddToCollectionModalProps {
  visible: boolean;
  onDismiss: () => void;
  productId: string;
  onSuccess?: (collectionName: string) => void;
}

interface CollectionItem {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  itemCount?: number;
  isPublic?: boolean;
}

/** Bu sayıdan çok koleksiyonda sheet "large" (uzun sanal liste); azında içerik kadar. */
const LARGE_SHEET_MIN_ITEMS = 5;

/**
 * "Koleksiyona Ekle" — `BottomSheet`: kullanıcının koleksiyonları sanal listede (FlatList),
 * satıra basınca sheet kapanır ve ürün ekleme ARDINDAN çalışır (sonuç toast). "Yeni koleksiyon"
 * ayrı ekrana gider (`/collections/new?addProductId=…`): oluşturulunca ürün oraya eklenip
 * kullanıcı ürün sayfasına döner. Çok alanlı form sheet'te değil, kendi ekranında.
 *
 * Web `apps/web/src/app/listings/[id]/page.tsx:461-477` referans alındı.
 */
export default function AddToCollectionModal({
  visible,
  onDismiss,
  productId,
  onSuccess,
}: AddToCollectionModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canCreateCollections = useAuthStore((s) => Boolean(s.limits?.canCreateCollections));
  const userId = useAuthStore((s) => s.user?.id);

  const myCollectionsQuery = useQuery({
    queryKey: qk.collections.mine,
    queryFn: async () => {
      const response = await collectionsApi.getMyCollections();
      // /collections/me => { collections: [...], total, page, pageSize }
      // (profile.tsx / collections/index.tsx ile aynı şekil okunmalı)
      const body = response.data as any;
      const list: CollectionItem[] =
        body?.collections ?? body?.data ?? (Array.isArray(body) ? body : []);
      return Array.isArray(list) ? list : [];
    },
    enabled: visible,
  });
  const collections = myCollectionsQuery.data ?? [];

  // Ekleme sonrası TÜM koleksiyon görünümlerini tazele: liste (qk.collections.mine), profil
  // garajı + sayaç (profile-collections) ve koleksiyon detayı.
  const invalidateCollectionQueries = (collectionId: string) => {
    queryClient.invalidateQueries({ queryKey: qk.collections.mine });
    if (userId) queryClient.invalidateQueries({ queryKey: qk.collections.profile(userId) });
    queryClient.invalidateQueries({ queryKey: qk.collections.detail(collectionId) });
  };

  const addToCollectionMutation = useMutation({
    mutationFn: ({ collectionId }: { collectionId: string; name: string }) =>
      collectionsApi.addItem(collectionId, { productId }),
    onSuccess: (_data, variables) => {
      invalidateCollectionQueries(variables.collectionId);
      onSuccess?.(variables.name);
    },
    onError: (e) => {
      toast.error(errorText(e, t('collection.addItemFailed')));
    },
  });

  // Satır eylemi sheet TAMAMEN kapandıktan sonra çalışır (`runAfterClose`): sonuç toast'ı
  // açık native Modal'ın altında kalmaz.
  const { mutate: addToCollection } = addToCollectionMutation;
  const onSelect = useCallback(
    (c: CollectionItem) => addToCollection({ collectionId: c.id, name: c.name }),
    [addToCollection],
  );

  const renderItem = useCallback<ListRenderItem<CollectionItem>>(
    ({ item }) => <CollectionRow collection={item} onSelect={onSelect} />,
    [onSelect],
  );

  return (
    <BottomSheet
      isOpen={visible}
      onClose={onDismiss}
      title={t('collection.addToCollection')}
      size={collections.length >= LARGE_SHEET_MIN_ITEMS ? 'large' : 'fit'}
      scrollable={false}
      flushBody
      footer={canCreateCollections ? <NewCollectionButton productId={productId} /> : undefined}
      testID="add-to-collection-sheet"
    >
      {myCollectionsQuery.isLoading ? (
        <View style={styles.loading}>
          <Spinner size="lg" />
        </View>
      ) : myCollectionsQuery.isError ? (
        <ErrorState
          placement="inline"
          title={t('collection.loadFailed')}
          onRetry={() => myCollectionsQuery.refetch()}
          testID="add-to-collection-error"
        />
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          ListEmptyComponent={
            <EmptyState
              placement="inline"
              icon="rectangle-stack"
              title={t('collection.noCollections')}
              subtitle={t('emptyState.createCollectionHint')}
              testID="add-to-collection-empty"
            />
          }
          testID="add-to-collection-list"
        />
      )}
    </BottomSheet>
  );
}

function CollectionRowInner({
  collection: c,
  onSelect,
}: {
  collection: CollectionItem;
  onSelect: (c: CollectionItem) => void;
}) {
  const { t } = useTranslation();
  const { runAfterClose } = useBottomSheet();
  return (
    <Pressable
      testID={`add-to-collection-row-${c.id}`}
      style={({ pressed }) => [styles.collectionRow, pressed && Platform.OS === 'ios' && styles.rowPressed]}
      android_ripple={Platform.OS === 'android' ? { color: colors.overlay.black10 } : undefined}
      onPress={() => runAfterClose(() => onSelect(c))}
      accessibilityRole="button"
    >
      <View style={styles.cover}>
        {c.coverImageUrl ? (
          <Image source={{ uri: transformImageUrl(c.coverImageUrl) }} style={styles.coverImage} />
        ) : (
          <Text variant="body" weight="bold" tone="primary">
            {c.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.flex}>
        <Text variant="bodySm" weight="semibold" numberOfLines={1}>
          {c.name}
        </Text>
        <Text variant="caption" tone="muted">
          {t('collection.itemCountSuffix', { count: c.itemCount ?? 0 })} ·{' '}
          {c.isPublic ? t('collection.publicShort') : t('collection.privateShort')}
        </Text>
      </View>
    </Pressable>
  );
}

const CollectionRow = React.memo(CollectionRowInner);

/** "Yeni koleksiyon": sheet kapandıktan sonra mevcut oluşturma ekranına (ürün param ile taşınır). */
function NewCollectionButton({ productId }: { productId: string }) {
  const { t } = useTranslation();
  const { runAfterClose } = useBottomSheet();
  return (
    <Button
      variant="outline"
      fullWidth
      title={t('collection.createNewCollection')}
      onPress={() =>
        runAfterClose(() => router.push({ pathname: '/collections/new', params: { addProductId: productId } }))
      }
      testID="add-to-collection-new"
    />
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing[8], alignItems: 'center' },
  flex: { flex: 1 },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: theme.minTouchTarget,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  rowPressed: { backgroundColor: colors.surface.alt },
  cover: {
    width: theme.controlHeight.md,
    height: theme.controlHeight.md,
    borderRadius: theme.radiusRole.card,
    backgroundColor: colors.surface.alt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
});
