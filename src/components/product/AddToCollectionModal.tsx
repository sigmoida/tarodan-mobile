import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { theme, Text, Button, Modal, Input, Textarea, Spinner, Switch, useModalMessage, ModalMessage, ButtonRow } from '@/ui';
import { collectionsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { transformImageUrl } from '../../utils/imageUrl';

const { colors } = theme;

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

/**
 * "Koleksiyona Ekle" modal'ı.
 * - Kullanıcının koleksiyonlarını çeker (collectionsApi.getMyCollections).
 * - Birini seçince `collectionsApi.addItem(collectionId, { productId })`.
 * - "Yeni Koleksiyon Oluştur" seçeneği de var.
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
  const msg = useModalMessage();

  useEffect(() => {
    msg.clear();
  }, [visible]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPublic, setNewPublic] = useState(true);

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

  // Koleksiyon ekleme/oluşturma sonrası TÜM koleksiyon görünümlerini tazele:
  // liste (qk.collections.mine — artık ayarlar listesi de bu anahtarı kullanıyor,
  // eski ['myCollections'] adası #78'de birleştirildi), profil garajı + sayaç
  // (profile-collections) ve koleksiyon detayı.
  const invalidateCollectionQueries = (collectionId?: string) => {
    queryClient.invalidateQueries({ queryKey: qk.collections.mine });
    queryClient.invalidateQueries({ queryKey: ['profile-collections'] });
    if (collectionId) {
      queryClient.invalidateQueries({ queryKey: qk.collections.detail(collectionId) });
    }
  };

  const addToCollectionMutation = useMutation({
    mutationFn: ({ collectionId }: { collectionId: string }) =>
      collectionsApi.addItem(collectionId, { productId }),
    onSuccess: (_data, variables) => {
      invalidateCollectionQueries(variables.collectionId);
      const found = collections.find((c) => c.id === variables.collectionId);
      onSuccess?.(found?.name ?? 'Koleksiyon');
      onDismiss();
    },
    onError: (e: any) => {
      msg.error(e?.response?.data?.message || t('collection.addItemFailed'));
    },
  });

  const createCollectionMutation = useMutation({
    mutationFn: async () => {
      const response: any = await collectionsApi.create({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        isPublic: newPublic,
      });
      const created = response.data?.data ?? response.data;
      const newId = created?.id;
      if (!newId) throw new Error(t('collection.createNoIdError'));
      // Koleksiyona ürünü ekle
      await collectionsApi.addItem(newId, { productId });
      return { id: newId, name: newName.trim() };
    },
    onSuccess: (result) => {
      invalidateCollectionQueries(result.id);
      onSuccess?.(result.name);
      handleClose();
    },
    onError: (e: any) => {
      msg.error(e?.response?.data?.message || t('collection.createCollectionFailed'));
    },
  });

  const handleClose = () => {
    msg.clear();
    setCreating(false);
    setNewName('');
    setNewDescription('');
    setNewPublic(true);
    onDismiss();
  };

  const handleCreateSubmit = () => {
    msg.clear();
    if (!newName.trim()) {
      msg.error(t('collection.nameRequiredShort'));
      return;
    }
    createCollectionMutation.mutate();
  };

  return (
    <Modal isOpen={visible} onClose={handleClose} title={creating ? t('collection.newCollectionTitle') : t('collection.addToCollection')}>
      {creating ? (
        <View>
          <Input
            label={t('collection.collectionNameLabel')}
            value={newName}
            onChangeText={setNewName}
            maxLength={60}
            containerStyle={styles.input}
          />
          <Textarea
            label={t('collection.descriptionOptionalLabel')}
            value={newDescription}
            onChangeText={setNewDescription}
            rows={3}
            maxLength={300}
            containerStyle={styles.input}
          />
          <View style={styles.toggleRow}>
            <Text variant="bodySm" style={styles.toggleText}>
              {newPublic ? t('collection.publicToggleLabel') : t('collection.privateToggleLabel')}
            </Text>
            <Switch value={newPublic} onValueChange={setNewPublic} />
          </View>
        </View>
      ) : (
        <View style={styles.scrollArea}>
          {myCollectionsQuery.isLoading ? (
            <View style={styles.loading}>
              <Spinner size="lg" />
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Pressable style={styles.createNewRow} onPress={() => setCreating(true)} accessibilityRole="button">
                <Text variant="bodySm" weight="bold" tone="primary">
                  {t('collection.createNewCollection')}
                </Text>
              </Pressable>

              {collections.length === 0 ? (
                <View style={styles.empty}>
                  <Text variant="bodySm" tone="muted" align="center">
                    {t('collection.noCollectionsCreateFirst')}
                  </Text>
                </View>
              ) : (
                collections.map((c) => (
                  <Pressable
                    key={c.id}
                    style={styles.collectionRow}
                    onPress={() => addToCollectionMutation.mutate({ collectionId: c.id })}
                    disabled={addToCollectionMutation.isPending}
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
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

      <ButtonRow style={{ marginTop: theme.spacing[3] }}>
        {creating ? (
          <>
            <Button
              variant="ghost"
              title={t('common.back')}
              onPress={() => setCreating(false)}
              disabled={createCollectionMutation.isPending}
            />
            <Button
              variant="primary"
              title={t('collection.createAndAdd')}
              onPress={handleCreateSubmit}
              isLoading={createCollectionMutation.isPending}
              disabled={!newName.trim() || createCollectionMutation.isPending}
            />
          </>
        ) : (
          <Button variant="ghost" title={t('common.close')} onPress={handleClose} />
        )}
      </ButtonRow>
      <ModalMessage state={msg.state} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollArea: { maxHeight: 380 },
  loading: { paddingVertical: theme.spacing[8], alignItems: 'center' },
  empty: { alignItems: 'center', padding: theme.spacing[6] },
  flex: { flex: 1 },
  createNewRow: {
    minHeight: theme.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    backgroundColor: colors.primary[50]!,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
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
  input: { marginBottom: theme.spacing[3] },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
  },
  toggleText: { flex: 1 },
});
