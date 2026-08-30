import { z } from 'zod';
import type { TFunction } from 'i18next';

/**
 * Fabrika biçimi: zod mesajları şema kurulurken çözülüyor, modül seviyesinde
 * kurulsa metin ilk yüklenen dilde donardı (bkz. `@/utils/validation` başı).
 */
export const buildCollectionSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(3, t('collection.nameMinLength')).max(100),
    description: z.string().max(500, t('collection.descriptionMaxLength')).optional(),
    isPublic: z.boolean(),
  });

export type CollectionForm = z.infer<ReturnType<typeof buildCollectionSchema>>;
