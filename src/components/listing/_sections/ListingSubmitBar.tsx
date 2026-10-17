import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, ButtonRow, theme } from '@/ui';

import { ListingRemovalModal } from '../ListingRemovalModal';
import type { ListingFormController } from '../_hooks/useListingForm';
import { memoSection, type ListingFormKey } from '../_lib/memoSection';

type SectionProps = { f: ListingFormController };

/** Bu dosyadaki bölümlerin okuduğu controller alanları (memo karşılaştırması; bkz. `memoSection`). */
const KEYS: readonly ListingFormKey[] = [
  'closeRemoval',
  'deleteWithReason',
  'form',
  'handleDelete',
  'handleSubmit',
  'isEdit',
  'isSubmitting',
  'removalOpen',
  'uploadingImages',
];

const goBack = () => router.back();

/**
 * Gönder çubuğu (düzenlemede PageShell'in sabit alt barı, oluşturmada formun sonu): üstte tam genişlik
 * birincil "Değişiklikleri Kaydet" / "İlan Oluştur"; altında ikincil satır — düzenlemede
 * [İlanı Sil][İptal] yan yana (`ButtonRow`, eşit genişlik; sığmazsa alt alta), oluşturmada yalnız
 * İptal. Görsel yüklenirken ve gönderim sürerken kilitli; silmenin onay/nedeni `ListingRemovalModal`'da.
 */
export const ListingSubmitBar = memoSection(function ListingSubmitBar({ f }: SectionProps) {
  const { t } = useTranslation();
  const locked = f.isSubmitting || f.uploadingImages;
  const cancel = (
    <Button key="cancel" variant="outline" size="lg" title={t('common.cancel')} onPress={goBack} />
  );
  return (
    <View style={styles.bar}>
      <Button
        testID="listing-submit-button"
        size="lg"
        fullWidth
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
      {f.isEdit ? (
        <ButtonRow gap={theme.spacing[3]}>
          <Button
            key="delete"
            testID="listing-delete-button"
            variant="danger"
            size="lg"
            title={t('product.deleteListing')}
            onPress={f.handleDelete}
            disabled={f.isSubmitting}
          />
          {cancel}
        </ButtonRow>
      ) : (
        <ButtonRow>{cancel}</ButtonRow>
      )}
    </View>
  );
}, KEYS);

const styles = StyleSheet.create({
  bar: { gap: theme.spacing[3] },
});

/** Silme nedeni penceresi (yalnız düzenleme) — `PageShell` `overlay`'inde, gövdeden bağımsız. */
export const ListingRemovalOverlay = memoSection(function ListingRemovalOverlay({ f }: SectionProps) {
  if (!f.isEdit) return null;
  return (
    <ListingRemovalModal
      action="delete"
      visible={f.removalOpen}
      // Başlık izlenmiyor (bkz. `FormTextField`): pencere açılırken (`removalOpen` değişimi bu
      // bölümü yeniden çizer) formdan güncel değer okunur.
      listingTitle={f.form.getValues('title')}
      onClose={f.closeRemoval}
      onSubmit={f.deleteWithReason}
    />
  );
}, KEYS);
