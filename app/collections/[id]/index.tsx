import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TopBarAction } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import ReportModal from '@/components/ReportModal';
import { useCollectionDetail } from './_hooks/useCollectionDetail';
import { useCollectionReport } from './_hooks/useCollectionReport';
import { CollectionDetailBody } from './_components/CollectionDetailBody';

/**
 * Koleksiyon detayı — PageShell (üst barda yalnız geri + paylaş/beğen/şikayet; uzun koleksiyon adı üç
 * düğmenin yanında kesildiği için başlık sayfa içinde) içinde başlık kartı ve öğe ızgarası.
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
      right={
        f.collection ? (
          <>
            <TopBarAction icon="share" accessibilityLabel={t('collection.share')} onPress={f.handleShare} />
            {!f.isOwner ? (
              <>
                <TopBarAction
                  icon="heart"
                  iconVariant={f.isLiked ? 'solid' : 'outline'}
                  accessibilityLabel={t('collection.likes')}
                  onPress={f.handleLike}
                />
                <TopBarAction
                  icon="flag"
                  accessibilityLabel={t('collection.report')}
                  onPress={report.open}
                />
              </>
            ) : null}
          </>
        ) : undefined
      }
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
      {f.collection ? <CollectionDetailBody f={f} /> : null}
    </PageShell>
  );
}
