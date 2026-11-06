import { z } from 'zod';
import type { TFunction } from 'i18next';
import type { AddCollectionCustomItemBody } from '@/lib/api';

/** The API limits of a custom item (`AddCollectionItemDto`; web `CUSTOM_ITEM_LIMITS`). */
export const CUSTOM_ITEM_LIMITS = {
  titleMax: 200,
  descriptionMax: 1000,
  yearMin: 1900,
  yearMax: 2100,
} as const;

const L = CUSTOM_ITEM_LIMITS;

/**
 * Custom (non-listing) collection item form, same fields and limits as web `customItemSchema`.
 * Only the title is required. `year` stays a string (a text field) and is turned into a number when
 * the body is built; it is empty or a whole year in the API range. The picked image is not a form
 * field: it is uploaded on submit and its URL goes into the body.
 *
 * Factory form: the messages resolve when the schema is built, not at import (`@/utils/validation`).
 */
export const buildCustomItemSchema = (t: TFunction) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(1, t('validation.required'))
      .max(L.titleMax, t('validation.maxLength', { max: L.titleMax })),
    description: z
      .string()
      .trim()
      .max(L.descriptionMax, t('validation.maxLength', { max: L.descriptionMax }))
      .optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z
      .string()
      .trim()
      .optional()
      .superRefine((value, ctx) => {
        if (!value) return;
        const year = Number(value);
        // Digits only: `Number` would also take "1967.", "1e3" or "0x7B2".
        const message = !/^\d+$/.test(value)
          ? t('validation.enterValidValue')
          : year < L.yearMin
            ? t('validation.minValue', { min: L.yearMin })
            : year > L.yearMax
              ? t('validation.maxValue', { max: L.yearMax })
              : null;
        if (message) ctx.addIssue({ code: 'custom', message });
      }),
    scale: z.string().optional(),
    manufacturer: z.string().optional(),
    material: z.string().optional(),
  });

export type CustomItemInput = z.input<ReturnType<typeof buildCustomItemSchema>>;
export type CustomItemValues = z.output<ReturnType<typeof buildCustomItemSchema>>;

export const EMPTY_CUSTOM_ITEM: CustomItemInput = {
  title: '',
  description: '',
  brand: '',
  model: '',
  year: '',
  scale: '',
  manufacturer: '',
  material: '',
};

/** The `POST /collections/:id/items` body of a custom item (web `CustomItemForm` mutation). */
export function toCustomItemBody(values: CustomItemValues, imageUrl?: string): AddCollectionCustomItemBody {
  return {
    // The schema already trimmed the title and the description.
    customTitle: values.title,
    customDescription: values.description || undefined,
    customBrand: values.brand?.trim() || undefined,
    customModel: values.model?.trim() || undefined,
    customYear: values.year ? Number(values.year) : undefined,
    customScale: values.scale || undefined,
    customManufacturer: values.manufacturer?.trim() || undefined,
    customMaterial: values.material || undefined,
    customImageUrl: imageUrl || undefined,
  };
}
