import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';
import { PageShell } from '@/components/common/PageShell';
import { router } from 'expo-router';
import { useOrderGroup } from './_hooks/useOrderGroup';
import { GroupHeader, GroupOrderRow, GroupPackageCard } from './_components/GroupSections';

/** Sipariş grubu (çok ürünlü sepet) — PageShell + SectionCard dizisi; iptal modalı `overlay`'de. */
export default function OrderGroupDetailScreen() {
  const { t } = useTranslation();
  const f = useOrderGroup();

  return (
    <PageShell
      title={t('order.orderDetails')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      loading={f.isLoading}
      error={!f.isLoading && (f.error || !f.group)}
      errorMessage={t('order.groupLoadFailed')}
      onRetry={() => f.refetch()}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      overlay={
        <CancelOrderModal
          isOpen={f.cancel.visible}
          onClose={f.cancel.close}
          onConfirm={f.cancel.confirm}
          willRefund={f.cancel.willRefund}
          pending={f.cancel.isPending}
        />
      }
    >
      {f.group ? (
        <>
          <GroupHeader group={f.group} />
          {f.group.orders.map((order) => (
            <GroupOrderRow key={order.id} order={order} multi={f.group!.orders.length > 1} />
          ))}
          {/*
            Satıcı-bazlı kargo kırılımı (B10) — yalnız 2+ paketli (çok satıcılı)
            grupta. Tek paketli grupta üstteki sipariş satırı zaten aynı kargo
            bilgisini taşıyor, ayrı kart tekrar olurdu (CLAUDE.md › Principles).
          */}
          {f.shippingPackages.length > 1 &&
            f.shippingPackages.map((pkg) => <GroupPackageCard key={pkg.id} pkg={pkg} />)}
          {/*
            Sepetin tamamını iptal — web'de 2026-08-12'den beri var. Kapı
            `cancel.available`: tek kalem bile kargoya verilmişse sunucu
            reddediyor, butonu göstermek kullanıcıyı o hataya yürütürdü.
          */}
          {f.cancel.available ? (
            <Button
              testID="group-cancel-button"
              variant="danger"
              fullWidth
              title={t('order.cancelOrder')}
              onPress={f.cancel.open}
              disabled={f.cancel.isPending}
            />
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}
