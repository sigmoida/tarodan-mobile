import { Button } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useNewCollection } from './_hooks/useNewCollection';
import { PremiumGate, AuthGate } from './_components/NewCollectionGates';
import { NewCollectionForm } from './_components/NewCollectionForm';

/** Yeni koleksiyon — PageShell + SectionCard form bölümleri, sabit alt barda "Koleksiyon Oluştur". */
export default function NewCollectionScreen() {
  const { t } = useTranslation();
  const f = useNewCollection();

  if (!f.canCreateCollections) return <PremiumGate />;
  if (!f.isAuthenticated) return <AuthGate />;

  return (
    <PageShell
      title={t('collection.newCollectionTitle')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      footer={
        <Button
          title={t('collection.createCollection')}
          onPress={f.handleSubmit(f.onSubmit)}
          isLoading={f.createMutation.isPending}
          disabled={f.createMutation.isPending}
          fullWidth
        />
      }
    >
      <NewCollectionForm f={f} />
    </PageShell>
  );
}
