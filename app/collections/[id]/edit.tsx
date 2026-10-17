import { StyleSheet, View } from 'react-native';
import { Button, theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useCollectionEdit } from './_hooks/useCollectionEdit';
import { CollectionEditBody } from './_components/CollectionEditBody';

/**
 * Koleksiyon düzenle — PageShell (yükleniyor / bulunamadı / yetki yok durumları) + SectionCard
 * bölümleri. Sabit alt bar `ListingSubmitBar` (düzenleme) düzeninde: üstte birincil
 * "Değişiklikleri Kaydet", altında yıkıcı "Koleksiyonu Sil" (onay `handleDelete`'te).
 * Sorgu, form ve mutasyonlar `useCollectionEdit`'te.
 */
export default function EditCollectionScreen() {
  const { t } = useTranslation();
  const f = useCollectionEdit();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const notOwner = !!f.collection && !!f.user && f.collection.userId !== f.user.id;
  const gate = !f.isLoading && (!f.collection || notOwner);
  // Başarılı silmeden sonra da kilitli kalır: geri gezinme bitene dek ikinci dokunuş olmasın.
  const busy = f.updateMutation.isPending || f.deleteMutation.isPending || f.deleteMutation.isSuccess;

  return (
    <PageShell
      title={t('collection.editCollectionTitle')}
      onBack={goBack}
      loading={f.isLoading}
      empty={gate}
      emptyState={{
        icon: notOwner ? 'lock-closed' : 'rectangle-stack',
        title: notOwner ? t('collection.noEditPermission') : t('collection.collectionNotFound'),
        subtitle: notOwner ? t('emptyState.collectionNoPermissionHint') : t('emptyState.notFoundHint'),
        actionLabel: t('common.goBack'),
        onAction: goBack,
      }}
      footer={
        f.collection && !gate ? (
          <View style={styles.bar}>
            <Button
              testID="collection-save-button"
              size="lg"
              title={t('collection.saveChanges')}
              onPress={f.form.handleSubmit(f.onSubmit)}
              isLoading={f.updateMutation.isPending}
              disabled={busy}
              fullWidth
            />
            <Button
              testID="collection-delete-button"
              variant="danger"
              size="lg"
              title={t('collection.deleteCollection')}
              onPress={f.handleDelete}
              isLoading={f.deleteMutation.isPending}
              disabled={busy}
              fullWidth
            />
          </View>
        ) : undefined
      }
    >
      {f.collection && !gate ? <CollectionEditBody f={f} /> : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  bar: { gap: theme.spacing[3] },
});
