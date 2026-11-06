import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { collectionsApi, mediaApi } from '@/lib/api';
import { isServerOrNetworkFailure } from '@/lib/api/reauthError';
import { withPreparedImage, type LocalImageFile } from '@/lib/media';
import { qk, useAppMutation } from '@/lib/query';
import { captureException } from '@/services/sentry';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useZodForm } from '@/ui/form';
import { buildCustomItemSchema, EMPTY_CUSTOM_ITEM, toCustomItemBody, type CustomItemValues } from '../_lib/customItemSchema';
import { pickCollectionItemImage } from '../_lib/image';

interface Submission {
  values: CustomItemValues;
  image: LocalImageFile | null;
}

/**
 * Custom collection item controller (web `CustomItemForm`): the zod form, the picked image, and the
 * add mutation. On submit the image is prepared and uploaded (`POST /media/upload?folder=collections`),
 * then the item is created with the returned URL (`customImageUrl`), the detail and "my collections"
 * queries refresh, and the screen goes back. The upload happens on submit, not on pick, so a
 * cancelled form leaves nothing behind.
 */
export function useAddCustomItem() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const collectionId = String(id);

  const schema = useMemo(() => buildCustomItemSchema(t), [t]);
  const form = useZodForm(schema, { defaultValues: EMPTY_CUSTOM_ITEM });
  const [image, setImage] = useState<LocalImageFile | null>(null);
  // The URL of an image that is already uploaded: a retry after a failed add (offline, 5xx) must not
  // upload the same picture twice.
  const uploaded = useRef<{ file: LocalImageFile; url: string } | null>(null);

  const add = useAppMutation(
    async ({ values, image: file }: Submission) => {
      let imageUrl: string | undefined;
      if (file) {
        if (uploaded.current?.file !== file) {
          // `strict`: the picture is public; an unprepared original (EXIF, location) is never uploaded.
          const response = await withPreparedImage(file, (prepared) => mediaApi.uploadCollectionImage(prepared), {
            strict: true,
          });
          const url = response.data?.url;
          if (typeof url !== 'string' || !url) throw new Error(t('collection.productsAddFailed'));
          uploaded.current = { file, url };
        }
        imageUrl = uploaded.current.url;
      }
      return collectionsApi.addItem(collectionId, toCustomItemBody(values, imageUrl));
    },
    {
      invalidates: [qk.collections.detail(collectionId), qk.collections.mine, qk.collections.all],
      // One item: the sentence, like web (`product.addedToCollection`).
      success: t('product.addedToCollection'),
      // The server's message (moderation rejection, invalid image) when it sends one.
      error: t('collection.productsAddFailed'),
      onSuccess: goBackOrHome,
      onError: (error) => {
        // The API refused the request (a 4xx): the stored URL may be the reason, so upload again.
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (typeof status === 'number' && status < 500) uploaded.current = null;
        if (isServerOrNetworkFailure(error)) {
          captureException(error, { level: 'error', tags: { flow: 'collection.customItem' }, extra: { collectionId } });
        }
      },
    },
  );

  const pickImage = useCallback(async () => {
    const picked = await pickCollectionItemImage();
    if (picked) setImage(picked);
  }, []);
  const clearImage = useCallback(() => setImage(null), []);

  const submit = form.handleSubmit((values) => {
    if (add.isPending) return;
    add.mutate({ values, image });
  });

  return { form, image, pickImage, clearImage, submit, isPending: add.isPending };
}

export type AddCustomItemController = ReturnType<typeof useAddCustomItem>;
