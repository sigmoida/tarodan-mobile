import { useMemo, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { useTranslation } from 'react-i18next';
import { appAlert, toast } from '@/ui';
import { collectionsApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { useAuthStore } from '@/stores/authStore';
import { buildCollectionEditSchema, type CollectionForm } from '../_lib/collectionEditSchema';
import { useCollectionQuery } from '../../_hooks/useCollectionQuery';
import { useRemoveCollectionItem } from '../../_hooks/useRemoveCollectionItem';
import { useCollectionCover } from '../../_hooks/useCollectionCover';
import { useSafeTimeout } from '@/hooks/useSafeTimeout';

/**
 * Collection edit controller — owns the collection query, RHF form (zod), the
 * update/delete mutations, the owner's item removal, cover-image picker; feedback is toast.
 */
export function useCollectionEdit() {
  // Silme sonrası gecikmeli yönlendirme ekrandan çıkılınca iptal olur.
  const schedule = useSafeTimeout();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { coverImage, setCoverImage, pickCoverImage, uploadCover } = useCollectionCover();

  // Fetch collection (the detail screen's query: same key, same body)
  const { data: collection, isLoading } = useCollectionQuery(id);
  const { requestRemove } = useRemoveCollectionItem(String(id));

  const schema = useMemo(() => buildCollectionEditSchema(t), [t]);

  const form = useForm<CollectionForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: true,
    },
  });
  const { reset } = form;

  // Update form when collection loads
  useEffect(() => {
    if (collection) {
      reset({
        name: collection.name,
        description: collection.description || '',
        isPublic: collection.isPublic,
      });
      setCoverImage(collection.coverImageUrl ?? null);
    }
  }, [collection, reset, setCoverImage]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CollectionForm) => {
      // Metin alanları JSON ile (API @Body() UpdateCollectionDto bekler, FileInterceptor yok)
      await collectionsApi.update(String(id), {
        name: data.name,
        description: data.description || undefined,
        isPublic: data.isPublic,
      });

      // Kapak değiştiyse ayrı multipart uca yükle (PATCH /collections/:id/cover, alan 'cover')
      if (coverImage && coverImage !== collection?.coverImageUrl) {
        await uploadCover(String(id), coverImage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.collections.detail(String(id)) });
      queryClient.invalidateQueries({ queryKey: qk.collections.all });
      queryClient.invalidateQueries({ queryKey: qk.collections.mine });
      toast.success(t('collection.collectionUpdated'));
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, t('collection.updateFailed')));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => collectionsApi.delete(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.collections.all });
      queryClient.invalidateQueries({ queryKey: qk.collections.mine });
      toast.success(t('collection.collectionDeleted'));
      schedule(() => router.replace('/collections'), 1500);
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, t('collection.deleteFailed')));
    },
  });

  const handleDelete = () => {
    appAlert(
      t('collection.deleteCollection'),
      t('collection.deleteConfirmShort'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const onSubmit = (data: CollectionForm) => {
    updateMutation.mutate(data);
  };

  return {
    id,
    user,
    isLoading,
    collection,
    form,
    coverImage,
    pickCoverImage,
    updateMutation,
    deleteMutation,
    handleDelete,
    requestRemove,
    onSubmit,
  };
}

export type CollectionEditController = ReturnType<typeof useCollectionEdit>;
