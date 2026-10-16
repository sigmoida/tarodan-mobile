import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Button, ChipTabs, ErrorState } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { useBusinessApplication, type BusinessApplicationTab } from './_hooks/useBusinessApplication';
import { useDocumentUpload } from './_hooks/useDocumentUpload';
import { DetailsTab } from './_sections/DetailsTab';
import { StakeholdersTab } from './_sections/StakeholdersTab';
import { DocumentsTab } from './_sections/DocumentsTab';
import { BusinessApplicationSkeleton } from './_components/BusinessApplicationSkeleton';

/**
 * Kurumsal başvuru tamamlama — THIN ekran. Üç sekme (ChipTabs); her sekme kendi
 * bölümünde (SectionCard) self-gate eder. Veri/mutation `_hooks/useBusinessApplication`'da.
 */
export default function BusinessApplicationScreen() {
  const { t } = useTranslation();
  const f = useBusinessApplication();
  const upload = useDocumentUpload();
  const title = t('businessApplication.headerTitle');

  const TABS: { key: BusinessApplicationTab; label: string }[] = [
    { key: 'details', label: t('businessApplication.tabDetails') },
    { key: 'stakeholders', label: t('businessApplication.tabStakeholders') },
    { key: 'documents', label: t('businessApplication.tabDocuments') },
  ];

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings' as never));

  if (f.loadError) {
    return (
      <PageShell title={title} onBack={goBack} mode="static" padding={false}>
        <View testID="application-error" style={styles.fill}>
          <ErrorState
            title={t('businessApplication.loadErrorTitle')}
            message={t('common.genericError')}
          />
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={title}
      onBack={goBack}
      loading={f.isLoading}
      loadingFallback={<BusinessApplicationSkeleton />}
    >
      {f.isMissing ? (
        <>
          <Alert variant="warning" title={t('businessApplication.notFoundTitle')}>
            {t('businessApplication.notFoundBody')}
          </Alert>
          <Button
            testID="business-application-missing-back"
            variant="primary"
            title={t('common.goBack')}
            onPress={goBack}
          />
        </>
      ) : (
        <>
          <ChipTabs
            testID="business-application-tabs"
            value={f.tab}
            onChange={f.setTab}
            items={TABS.map((tabItem) => ({
              key: tabItem.key,
              label: tabItem.label,
              testID: `tab-${tabItem.key}`,
            }))}
          />
          <DetailsTab f={f} />
          <StakeholdersTab f={f} upload={upload} />
          <DocumentsTab f={f} upload={upload} />
        </>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
