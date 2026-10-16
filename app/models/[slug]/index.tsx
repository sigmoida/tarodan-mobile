import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useModelDetail } from './_hooks/useModelDetail';
import { ModelHero, ModelProductsGrid } from './_components/ModelSections';

/** Model detayı — PageShell (yükleniyor / bulunamadı) + kapak başlığı ve modele ait ürünler. */
export default function ModelDetailScreen() {
  const { t } = useTranslation();
  const f = useModelDetail();
  return (
    <PageShell
      title={f.model?.name ?? t('product.model')}
      subtitle={f.model?.brand?.name}
      loading={f.modelQuery.isLoading}
      error={f.modelLoadFailed || undefined}
      onRetry={() => f.modelQuery.refetch()}
      empty={f.notFound}
      emptyState={{
        icon: 'face-frown',
        title: t('models.noResults'),
        subtitle: t('models.notFoundDesc'),
        actionLabel: t('models.backToModels'),
        onAction: () => router.replace('/models' as any),
      }}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      {f.model ? (
        <>
          <ModelHero model={f.model} />
          <ModelProductsGrid f={f} />
        </>
      ) : null}
    </PageShell>
  );
}
