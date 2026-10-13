import type { ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useRequiredSteps } from '@/hooks/useRequiredSteps';
import type { RequiredStep } from '@/lib/requiredSteps';
import { isLegalTextPath } from '@/lib/shared/legalConsent';
import { ConsentGate } from './ConsentGate';
import { LegalIdentityGate } from './LegalIdentityGate';
import { LegalIdentitySavedNotice } from './LegalIdentitySavedNotice';
import { RequiredStepVisibleProvider } from './RequiredStepShell';

/**
 * Zorunlu adımların TEK montaj noktası (web `RequiredStepsGate`), kök düzende
 * sağlayıcıların içinde. Girişten sonra ve uygulama her ön plana geldiğinde
 * tamamlanması gereken adımlar `REQUIRED_STEPS` sırasıyla, HER SEFERİNDE
 * YALNIZ BİRİ tam ekran gösterilir.
 *
 * Kapatılamaz: kabuk native tam ekran bir Modal'dır (`FullScreenGate`), açık
 * ekran modallarının ve uyarıların üstünde kalır; Android geri tuşu yutulur.
 * Onay adımında tek çıkış onaylamak ya da oturumu kapatmaktır. İhtiyaç anında
 * açılan kimlik adımının alternatif çıkışı "Vazgeç"tir (işlem iptal); Android
 * geri tuşu da onu yapar. Yasal metin sayfaları muaftır ki üye okuyacağı metne
 * ulaşabilsin (geri dönünce kapı yeniden görünür).
 */
export default function RequiredStepsGate({
  ready = true,
}: {
  /**
   * Kapı gösterilebilir mi? Kök düzen soğuk açılışta AnimatedSplash bitene
   * kadar `false` verir: kapı native Modal olduğundan splash'ın üstüne binerdi.
   * Sorgu bu sırada çalışmaya devam eder, splash bitince kapı beklemeden açılır.
   */
  ready?: boolean;
}) {
  const pathname = usePathname();
  const { active, consents, legalIdentity } = useRequiredSteps();
  const logout = useAuthStore((s) => s.logout);

  const visible = ready && active !== null && !isLegalTextPath(pathname);

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  // Record: yeni bir adım `REQUIRED_STEPS`e eklenince görünümü yazılmadan
  // derleme geçmez.
  const views: Record<RequiredStep, () => ReactNode> = {
    consents: () => <ConsentGate pending={consents.pending} onLogout={onLogout} />,
    // `missing` değişirse (ör. sunucu yeni bir eksik bildirdi) form yeni
    // şemayla baştan kurulur.
    legalIdentity: () =>
      legalIdentity.status ? (
        <LegalIdentityGate
          key={legalIdentity.status.missing.join(',')}
          status={legalIdentity.status}
          onCancel={legalIdentity.cancel}
        />
      ) : null,
  };

  // Adım görünümü adım aktif olduğu sürece bağlı kalır; yasal metin
  // sayfasında yalnız kabuk gizlenir (işaretler korunur).
  // Kimlik kayıt bildirimi her zaman bağlı; tam ekran kapı kapanınca görünür.
  return (
    <>
      {active !== null ? (
        <RequiredStepVisibleProvider value={visible}>{views[active]()}</RequiredStepVisibleProvider>
      ) : null}
      <LegalIdentitySavedNotice />
    </>
  );
}
