import { Button } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useCollectionEdit } from './_hooks/useCollectionEdit';
import { CollectionEditBody } from './_components/CollectionEditBody';

/**
 * Koleksiyon düzenle — PageShell (yükleniyor / bulunamadı / yetki yok durumları) + SectionCard
 * bölümleri; "Değişiklikleri Kaydet" sabit alt barda. Sorgu, form ve mutasyonlar `useCollectionEdit`'te.
 */
export default function EditCollectionScreen() {
  const { t } = useTranslation();
  const f = useCollectionEdit();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const notOwner = !!f.collection && !!f.user && f.collection.userId !== f.user.id;
  const gate = !f.isLoading && (!f.collection || notOwner);

  return (
    <PageShell
      title={t('collection.editCollectionTitle')}
      onBack={goBack}
      loading={f.isLoading}
      empty={gate}
      emptyState={{
        icon: notOwner ? 'lock-closed-outline' : 'albums-outline',
        title: notOwner ? t('collection.noEditPermission') : t('collection.collectionNotFound'),
        actionLabel: t('common.goBack'),
        onAction: goBack,
      }}
      footer={
        f.collection && !gate ? (
          <Button
            title={t('collection.saveChanges')}
            onPress={f.form.handleSubmit(f.onSubmit)}
            isLoading={f.updateMutation.isPending}
            disabled={f.updateMutation.isPending}
            fullWidth
          />
        ) : undefined
      }
    >
      {f.collection && !gate ? <CollectionEditBody f={f} /> : null}
    </PageShell>
  );
}
