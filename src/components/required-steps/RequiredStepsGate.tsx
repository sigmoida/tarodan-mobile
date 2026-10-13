import { useEffect, type ReactNode } from 'react';
import { BackHandler } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useRequiredSteps } from '@/hooks/useRequiredSteps';
import type { RequiredStep } from '@/lib/requiredSteps';
import { isLegalTextPath } from '@/lib/shared/legalConsent';
import { ConsentGate } from './ConsentGate';
import { LegalIdentityGate } from './LegalIdentityGate';

/**
 * Zorunlu adımların TEK montaj noktası (web `RequiredStepsGate`), kök düzende
 * sağlayıcıların içinde. Girişten sonra ve uygulama her ön plana geldiğinde
 * tamamlanması gereken adımlar `REQUIRED_STEPS` sırasıyla, HER SEFERİNDE
 * YALNIZ BİRİ tam ekran gösterilir.
 *
 * Kapatılamaz: onay adımında Android geri tuşu yutulur, tek çıkış onaylamak
 * ya da oturumu kapatmaktır. İhtiyaç anında açılan kimlik adımının alternatif
 * çıkışı "Vazgeç"tir (işlem iptal); geri tuşu da onu yapar. Yasal metin
 * sayfaları muaftır ki üye okuyacağı metne ulaşabilsin (geri dönünce kapı
 * yeniden görünür).
 */
export default function RequiredStepsGate() {
  const pathname = usePathname();
  const { active, consents, legalIdentity } = useRequiredSteps();
  const logout = useAuthStore((s) => s.logout);

  const visible = active !== null && !isLegalTextPath(pathname);

  const cancelIdentity = legalIdentity.cancel;
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (active === 'legalIdentity') cancelIdentity();
      return true;
    });
    return () => sub.remove();
  }, [visible, active, cancelIdentity]);

  if (!visible || active === null) return null;

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  // Record: yeni bir adım `REQUIRED_STEPS`e eklenince görünümü yazılmadan
  // derleme geçmez.
  const views: Record<RequiredStep, () => ReactNode> = {
    consents: () => (
      <ConsentGate pending={consents.pending} accept={consents.accept} onLogout={onLogout} />
    ),
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

  return <>{views[active]()}</>;
}
