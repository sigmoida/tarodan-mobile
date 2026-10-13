import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, ButtonRow, theme } from '@/ui';

import { ListingRemovalModal } from '../ListingRemovalModal';
import type { ListingFormController } from '../_hooks/useListingForm';

type SectionProps = { f: ListingFormController };

const goBack = () => router.back();

/**
 * Vazgeç + Gönder (web `SubmitBar`). `ButtonRow`: eşit genişlik, etiket sarmaz; sığmazsa alt
 * alta tam genişlik. Görsel yüklenirken ve gönderim sürerken kilitli.
 */
export function ListingSubmitBar({ f }: SectionProps) {
  const { t } = useTranslation();
  const locked = f.isSubmitting || f.uploadingImages;
  return (
    <ButtonRow gap={theme.spacing[3]}>
      <Button key="cancel" variant="outline" size="lg" title={t('common.cancel')} onPress={goBack} />
      <Button
        key="submit"
        testID="listing-submit-button"
        size="lg"
        title={
          f.uploadingImages
            ? t('product.saveWhileUploading')
            : f.isEdit
              ? t('product.saveChanges')
              : t('product.createListing')
        }
        onPress={f.handleSubmit}
        isLoading={f.isSubmitting}
        disabled={locked}
      />
    </ButtonRow>
  );
}

/** İlanı sil (yalnız düzenleme) — web gibi `danger` düğmesi; onay/neden `ListingRemovalModal`'da. */
export function ListingDeleteButton({ f }: SectionProps) {
  const { t } = useTranslation();
  if (!f.isEdit) return null;
  return (
    <Button
      variant="danger"
      size="lg"
      fullWidth
      title={t('product.deleteListing')}
      onPress={f.handleDelete}
      disabled={f.isSubmitting}
    />
  );
}

/** Silme nedeni penceresi (yalnız düzenleme) — `PageShell` `overlay`'inde, gövdeden bağımsız. */
export function ListingRemovalOverlay({ f }: SectionProps) {
  if (!f.isEdit) return null;
  return (
    <ListingRemovalModal
      action="delete"
      visible={f.removalOpen}
      listingTitle={f.title}
      onClose={f.closeRemoval}
      onSubmit={f.deleteWithReason}
    />
  );
}
