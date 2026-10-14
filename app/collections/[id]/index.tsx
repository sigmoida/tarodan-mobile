import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import ReportModal from '@/components/ReportModal';
import { useCollectionDetail } from './_hooks/useCollectionDetail';
import { useCollectionReport } from './_hooks/useCollectionReport';
import { CollectionDetailBody } from './_components/CollectionDetailBody';

/**
 * Koleksiyon detayı — PageShell (üst barda YALNIZ geri; ad ve paylaş/beğen/şikayet web
 * `CollectionHeaderCard` gibi sayfa içinde, başlık kartında) içinde başlık kartı ve öğe ızgarası.
 * Üç cam düğme üst barın sağ yuvasına (en çok %36 genişlik) sığmıyor, paylaş düğmesi yuvanın
 * dışına taşıp dokunuşları kaçırıyordu.
 * `useCollectionDetail` sorgu, iyimser beğeni, paylaşım ve sahip/premium bayraklarının sahibi.
 */
export default function CollectionDetailScreen() {
  const { t } = useTranslation();
  const f = useCollectionDetail();
  const report = useCollectionReport();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  return (
    <PageShell
      title=""
      onBack={goBack}
      loading={f.isLoading}
      empty={!f.isLoading && !f.collection}
      emptyState={{
        icon: 'rectangle-stack',
        title: t('collection.collectionNotFound'),
        subtitle: t('emptyState.notFoundHint'),
        actionLabel: t('common.goBack'),
        onAction: goBack,
      }}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      overlay={
        f.collection ? (
          <ReportModal
            visible={report.visible}
            onDismiss={report.close}
            type="collection"
            targetId={String(f.id)}
            targetName={f.collection.name}
          />
        ) : undefined
      }
    >
      {f.collection ? <CollectionDetailBody f={f} onReport={report.open} /> : null}
    </PageShell>
  );
}
