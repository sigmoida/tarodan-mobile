import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { api, collectionsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { buildCollectionSchema, type CollectionForm } from '../_lib/schema';
import { buildCollectionTemplates, type CollectionTemplate } from '../_lib/templates';

/**
 * New-collection controller — owns the RHF+zod form, cover-image pick, template
 * selection, and the create mutation (JSON create → optional multipart cover
 * upload). Lifted verbatim from the monolithic screen (§12).
 *
 * `addProductId` route param ("Koleksiyona ekle" sheet'inden "Yeni koleksiyon"): oluşturulan
 * koleksiyona o ürün de eklenir ve kullanıcı ürün sayfasına döner (web'deki modal akışı gibi).
 */
export function useNewCollection() {
  const { t } = useTranslation();
  const { isAuthenticated, limits, user } = useAuthStore();
  const { addProductId } = useLocalSearchParams<{ addProductId?: string }>();
  const queryClient = useQueryClient();

  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const canCreateCollections = limits?.canCreateCollections || false;

  const templates = useMemo(() => buildCollectionTemplates(t), [t]);
  const schema = useMemo(() => buildCollectionSchema(t), [t]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CollectionForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CollectionForm) => {
      // Koleksiyonu JSON ile oluştur (API @Body() CreateCollectionDto bekler, FileInterceptor yok)
      const res = await api.post('/collections', {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
      });

      // Kapak görseli varsa dönen id ile ayrı multipart uca yükle (PATCH /collections/:id/cover, alan 'cover')
      if (coverImage) {
        const formData = new FormData();
        formData.append('cover', {
          uri: coverImage,
          type: 'image/jpeg',
          name: 'cover.jpg',
        } as any);
        await api.patch(`/collections/${res.data.id}/cover`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // "Koleksiyona ekle" akışı: ürün yeni koleksiyona eklenir. Başarısızlık koleksiyonu geri
      // almaz (oluştu); kullanıcıya hata söylenir ve koleksiyon sayfasına gidilir.
      let productAdded = true;
      if (addProductId) {
        try {
          await collectionsApi.addItem(res.data.id, { productId: addProductId });
        } catch {
          productAdded = false;
        }
      }

      return { res, productAdded };
    },
    onSuccess: ({ res, productAdded }, variables) => {
      queryClient.invalidateQueries({ queryKey: qk.collections.all });
      queryClient.invalidateQueries({ queryKey: qk.collections.mine });
      queryClient.invalidateQueries({ queryKey: qk.collections.detail(res.data.id) });
      if (user?.id) queryClient.invalidateQueries({ queryKey: qk.collections.profile(user.id) });
      if (addProductId) {
        if (productAdded) {
          toast.success(t('collection.addedToNamedCollection', { name: variables.name }));
          if (router.canGoBack()) router.back();
          else router.replace(`/product/${addProductId}`);
        } else {
          toast.error(t('collection.addItemFailed'));
          router.replace(`/collections/${res.data.id}`);
        }
        return;
      }
      toast.success(t('collection.collectionCreated'));
      setTimeout(() => router.replace(`/collections/${res.data.id}`), 1500);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('collection.createCollectionFailed'));
    },
  });

  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const selectTemplate = (template: CollectionTemplate) => {
    setSelectedTemplate(template.id);
    if (template.id !== 'custom') {
      setValue('name', template.name);
    }
  };

  const onSubmit = (data: CollectionForm) => {
    createMutation.mutate(data);
  };

  return {
    isAuthenticated,
    canCreateCollections,
    templates,
    control,
    errors,
    handleSubmit,
    watch,
    onSubmit,
    createMutation,
    coverImage,
    setCoverImage,
    pickCoverImage,
    selectedTemplate,
    selectTemplate,
  };
}

export type NewCollectionController = ReturnType<typeof useNewCollection>;
