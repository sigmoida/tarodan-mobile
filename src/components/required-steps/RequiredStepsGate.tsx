import { useEffect, type ReactNode } from 'react';
import { BackHandler } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useRequiredSteps } from '@/hooks/useRequiredSteps';
import type { RequiredStep } from '@/lib/requiredSteps';
import { isLegalTextPath } from '@/lib/shared/legalConsent';
import { ConsentGate } from './ConsentGate';
import { RequiredStepVisibleProvider } from './RequiredStepShell';

/**
 * Zorunlu adımların TEK montaj noktası (web `RequiredStepsGate`), kök düzende
 * sağlayıcıların içinde. Girişten sonra ve uygulama her ön plana geldiğinde
 * tamamlanması gereken adımlar `REQUIRED_STEPS` sırasıyla, HER SEFERİNDE
 * YALNIZ BİRİ tam ekran gösterilir.
 *
 * Kapatılamaz: Android geri tuşu kapı açıkken yutulur; tek çıkış adımı
 * tamamlamak ya da oturumu kapatmaktır. Yasal metin sayfaları muaftır ki üye
 * onaylayacağı metni okuyabilsin (geri dönünce kapı yeniden görünür).
 */
export default function RequiredStepsGate() {
  const pathname = usePathname();
  const { active, consents } = useRequiredSteps();
  const logout = useAuthStore((s) => s.logout);

  const visible = active !== null && !isLegalTextPath(pathname);

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  if (active === null) return null;

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  // Record: yeni bir adım `REQUIRED_STEPS`e eklenince görünümü yazılmadan
  // derleme geçmez.
  const views: Record<RequiredStep, () => ReactNode> = {
    consents: () => <ConsentGate pending={consents.pending} onLogout={onLogout} />,
  };

  // Adım görünümü adım aktif olduğu sürece bağlı kalır; yasal metin
  // sayfasında yalnız kabuk gizlenir (işaretler korunur).
  return (
    <RequiredStepVisibleProvider value={visible}>{views[active]()}</RequiredStepVisibleProvider>
  );
}
