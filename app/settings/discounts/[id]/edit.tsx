import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { DiscountsGate } from '../_components/DiscountsGate';
import { DiscountForm } from '../_components/DiscountForm';
import { useDiscount } from '../_hooks/useDiscountsQuery';

/**
 * İndirimi düzenle — düz stack ekranı. Kayıt liste önbelleğinden gelir (derin
 * bağlantıda çekilir); form yalnız kayıt hazırken bağlanır, böylece varsayılan
 * değerler bir kez kurulur ve arka plan yenilemesi taslağı ezmez.
 */
export default function EditDiscountScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { discount, isLoading, isError, refetch } = useDiscount(id);
  const title = t('discount.editTitle');

  const gate = DiscountsGate({ title });
  if (gate) return gate;

  if (!discount) {
    return (
      <PageShell
        title={title}
        loading={isLoading}
        loadingFallback={<RowListSkeleton rows={3} />}
        error={isError || undefined}
        onRetry={refetch}
        empty
        emptyState={{
          icon: 'tag',
          title: t('error.pageNotFound'),
          subtitle: t('emptyState.notFoundHint'),
        }}
      />
    );
  }
  return <DiscountForm key={discount.id} discount={discount} />;
}
