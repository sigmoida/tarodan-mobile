import { useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { buildProfileMenuGroups, selectSettingsSections } from '@/lib/menu/profileMenu';
import { useMenuContext } from '@/lib/menu/useMenuContext';

/**
 * Ayarlar ekranı kontrolcüsü: menü grupları (Hesap · Ödeme ve Banka · Üyelik · Tercihler · Yardım &
 * Destek · Bilgi & Yasal; misafirde yalnız dil, yardım, bilgi/yasal) + çıkış. Hesabı silme girişi
 * Güvenlik ekranında (`settings/security`).
 */
export function useSettingsScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const ctx = useMenuContext();
  const groups = useMemo(
    () => selectSettingsSections(buildProfileMenuGroups(t, ctx), { isGuest: !isAuthenticated }),
    [t, ctx, isAuthenticated],
  );
  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [logout]);
  return { isAuthenticated, groups, handleLogout };
}
