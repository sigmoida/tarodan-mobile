import type { TFunction } from 'i18next';

/**
 * Şablon listesi FABRİKA: modül seviyesinde kurulsa isimler ilk yüklenen
 * dilde donardı (bkz. `@/utils/validation` başı). Çağıran taraf canlı `t`'yi
 * bileşen/hook içinden geçirmeli.
 */
export function buildCollectionTemplates(t: TFunction) {
  return [
    { id: 'ferrari', name: t('collection.templateFerrari'), icon: '🏎️' },
    { id: 'vintage', name: t('collection.templateVintage'), icon: '🚗' },
    { id: 'trucks', name: t('collection.templateTrucks'), icon: '🚚' },
    { id: 'f1', name: t('collection.templateF1'), icon: '🏁' },
    { id: 'muscle', name: t('collection.templateMuscle'), icon: '💪' },
    { id: 'custom', name: t('collection.templateCustom'), icon: '⭐' },
  ] as const;
}

export type CollectionTemplate = ReturnType<typeof buildCollectionTemplates>[number];
