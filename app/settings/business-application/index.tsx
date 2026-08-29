import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, ScreenHeader, ScreenLoader, Alert, Button, ErrorState, theme } from '@/ui';
import { useBusinessApplication, type BusinessApplicationTab } from './_hooks/useBusinessApplication';
import { useDocumentUpload } from './_hooks/useDocumentUpload';
import { DetailsTab } from './_sections/DetailsTab';
import { StakeholdersTab } from './_sections/StakeholdersTab';
import { DocumentsTab } from './_sections/DocumentsTab';

/**
 * Kurumsal başvuru tamamlama — THIN ekran. Üç sekme; her sekme kendi
 * bölümünde self-gate eder. Veri/mutation `_hooks/useBusinessApplication`'da.
 */
export default function BusinessApplicationScreen() {
  const { t } = useTranslation();
  const f = useBusinessApplication();
  const upload = useDocumentUpload();

  const TABS: { key: BusinessApplicationTab; label: string }[] = [
    { key: 'details', label: t('businessApplication.tabDetails') },
    { key: 'stakeholders', label: t('businessApplication.tabStakeholders') },
    { key: 'documents', label: t('businessApplication.tabDocuments') },
  ];

  if (f.isLoading) return <ScreenLoader />;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings' as never));

  if (f.loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface.DEFAULT }}>
        <ScreenHeader title={t('businessApplication.headerTitle')} onBack={goBack} />
        <View testID="application-error" style={{ flex: 1 }}>
          <ErrorState
            fullscreen
            title={t('businessApplication.loadErrorTitle')}
            message={t('common.genericError')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface.DEFAULT }}>
      <ScreenHeader title={t('businessApplication.headerTitle')} onBack={goBack} />

      {!f.isMissing && (
        <View style={{ flexDirection: 'row', paddingHorizontal: theme.spacing[4], gap: theme.spacing[2] }}>
          {TABS.map((tabItem) => (
            <Pressable
              key={tabItem.key}
              testID={`tab-${tabItem.key}`}
              onPress={() => f.setTab(tabItem.key)}
              style={{
                paddingVertical: theme.spacing[2],
                paddingHorizontal: theme.spacing[4],
                borderRadius: theme.radius.md,
                backgroundColor: f.tab === tabItem.key ? theme.colors.primary[50] : 'transparent',
              }}
            >
              <Text
                variant="body"
                color={f.tab === tabItem.key ? theme.colors.primary[600] : theme.colors.text.muted}
                style={{ fontWeight: f.tab === tabItem.key ? '600' : '400' }}
              >
                {tabItem.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[4] }}
        keyboardShouldPersistTaps="handled"
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
            <DetailsTab f={f} />
            <StakeholdersTab f={f} upload={upload} />
            <DocumentsTab f={f} upload={upload} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
