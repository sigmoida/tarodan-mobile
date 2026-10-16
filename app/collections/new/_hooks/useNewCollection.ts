import { useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { api, collectionsApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { buildCollectionSchema, type CollectionForm } from '../_lib/schema';
import { buildCollectionTemplates, type CollectionTemplate } from '../_lib/templates';
import { coverFileFor, pickCollectionCover, uploadCollectionCover } from '../../_lib/cover';
import type { LocalImageFile } from '@/lib/media';

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
  /** Seçilen kapağın dosya bilgisi (tür/boyut) — hazırlama için; önizleme `coverImage`. */
  const pickedCoverRef = useRef<LocalImageFile | null>(null);
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
        await uploadCollectionCover(res.data.id, coverFileFor(coverImage, pickedCoverRef.current));
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
      toast.error(apiErrorMessage(error, t('collection.createCollectionFailed')));
    },
  });

  const pickCoverImage = async () => {
    const picked = await pickCollectionCover();
    if (picked) {
      pickedCoverRef.current = picked;
      setCoverImage(picked.uri);
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
