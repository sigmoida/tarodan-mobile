import { useMemo, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { appAlert, toast } from '@/ui';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { useAuthStore } from '@/stores/authStore';
import { buildCollectionEditSchema, type CollectionForm, type Collection } from '../_lib/collectionEditSchema';
import { useCollectionCover } from '../../_hooks/useCollectionCover';

/**
 * Collection edit controller — owns the collection query, RHF form (zod), the
 * update/delete/remove-item mutations, cover-image picker; feedback is toast.
 * Lifted verbatim from the monolithic EditCollectionScreen.
 */
export function useCollectionEdit() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { coverImage, setCoverImage, pickCoverImage, uploadCover } = useCollectionCover();

  // Fetch collection
  const { data: collection, isLoading } = useQuery<Collection>({
    queryKey: ['collection', id],
    queryFn: async () => {
      const response = await api.get(`/collections/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

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
      setCoverImage(collection.coverImageUrl);
    }
  }, [collection, reset, setCoverImage]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CollectionForm) => {
      // Metin alanları JSON ile (API @Body() UpdateCollectionDto bekler, FileInterceptor yok)
      await api.patch(`/collections/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['collection', id] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['my-collections'] });
      toast.success(t('collection.collectionUpdated'));
    },
    onError: (error: any) => {
      toast.error(apiErrorMessage(error, t('collection.updateFailed')));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/collections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['my-collections'] });
      toast.success(t('collection.collectionDeleted'));
      setTimeout(() => router.replace('/collections'), 1500);
    },
    onError: (error: any) => {
      toast.error(apiErrorMessage(error, t('collection.deleteFailed')));
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/collections/${id}/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', id] });
      toast.success(t('collection.productRemoved'));
    },
    onError: (error: any) => {
      toast.error(apiErrorMessage(error, t('collection.removeFailed')));
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

  const handleRemoveItem = (itemId: string, productTitle: string) => {
    appAlert(
      t('collection.removeItemTitle'),
      t('collection.removeItemConfirm', { title: productTitle }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.remove'), style: 'destructive', onPress: () => removeItemMutation.mutate(itemId) },
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
    handleDelete,
    handleRemoveItem,
    onSubmit,
  };
}

export type CollectionEditController = ReturnType<typeof useCollectionEdit>;
