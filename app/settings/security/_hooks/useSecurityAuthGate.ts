import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Güvenlik ekranları yalnız oturum açıkken anlamlı: oturum yoksa girişe yönlendirir ve `false`
 * döner (ekran `null` çizer). Yönlendirme effect'te — render içinde `router.replace` "Cannot update
 * a component while rendering another" uyarısına yol açıyordu.
 */
export function useSecurityAuthGate(): boolean {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated) router.replace('/(auth)/login');
  }, [isAuthenticated]);
  return isAuthenticated;
}
