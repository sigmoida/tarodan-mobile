import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text, ScreenHeader, ScreenLoader, Alert, Button, ErrorState, theme } from '@/ui';
import { useBusinessApplication, type BusinessApplicationTab } from './_hooks/useBusinessApplication';
import { useDocumentUpload } from './_hooks/useDocumentUpload';
import { DetailsTab } from './_sections/DetailsTab';
import { StakeholdersTab } from './_sections/StakeholdersTab';
import { DocumentsTab } from './_sections/DocumentsTab';

const TABS: { key: BusinessApplicationTab; label: string }[] = [
  { key: 'details', label: 'Detaylar' },
  { key: 'stakeholders', label: 'Paydaşlar' },
  { key: 'documents', label: 'Belgeler' },
];

/**
 * Kurumsal başvuru tamamlama — THIN ekran. Üç sekme; her sekme kendi
 * bölümünde self-gate eder. Veri/mutation `_hooks/useBusinessApplication`'da.
 */
export default function BusinessApplicationScreen() {
  const f = useBusinessApplication();
  const upload = useDocumentUpload();

  if (f.isLoading) return <ScreenLoader />;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings' as never));

  if (f.loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface.DEFAULT }}>
        <ScreenHeader title="Kurumsal Başvuru" onBack={goBack} />
        <View testID="application-error" style={{ flex: 1 }}>
          <ErrorState
            fullscreen
            title="Başvuru yüklenemedi"
            message="Bir hata oluştu. Lütfen tekrar deneyin."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface.DEFAULT }}>
      <ScreenHeader title="Kurumsal Başvuru" onBack={goBack} />

      {!f.isMissing && (
        <View style={{ flexDirection: 'row', paddingHorizontal: theme.spacing[4], gap: theme.spacing[2] }}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              testID={`tab-${t.key}`}
              onPress={() => f.setTab(t.key)}
              style={{
                paddingVertical: theme.spacing[2],
                paddingHorizontal: theme.spacing[4],
                borderRadius: theme.radius.md,
                backgroundColor: f.tab === t.key ? theme.colors.primary[50] : 'transparent',
              }}
            >
              <Text
                variant="body"
                color={f.tab === t.key ? theme.colors.primary[600] : theme.colors.text.muted}
                style={{ fontWeight: f.tab === t.key ? '600' : '400' }}
              >
                {t.label}
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
            <Alert variant="warning" title="Başvuru bulunamadı">
              Kurumsal başvurunuz henüz oluşturulmamış. Kurumsal ön başvuruyu tamamladıktan
              sonra bu ekrandan devam edebilirsiniz.
            </Alert>
            <Button
              testID="business-application-missing-back"
              variant="primary"
              title="Geri Dön"
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
