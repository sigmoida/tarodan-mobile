import { useState } from 'react';
import { router } from 'expo-router';
import { toast } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { getRestrictionMessage, GuestAction } from '@/utils/guestRestrictions';

/**
 * Profile actions controller — logout, the entry to account deletion, and the
 * guest restriction toast/prompt state. Lifted verbatim from ProfileScreen.
 */
export function useProfileActions() {
  const { logout } = useAuthStore();
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptType, setPromptType] = useState<
    'favorites' | 'message' | 'purchase' | 'trade' | 'collections'
  >('favorites');

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  /**
   * Hesap silme ayrı ekranda (web `DangerZoneSection` gibi yazarak onay; engeller,
   * yerel çıkış ve yönlendirme `app/settings/delete-account`).
   */
  const handleDeleteAccount = () => {
    router.push('/settings/delete-account');
  };

  const handleGuestAction = (action: GuestAction) => {
    const config = getRestrictionMessage(action);
    toast(config.message);

    if (action === 'favorites' || action === 'wishlist') setPromptType('favorites');
    else if (action === 'message') setPromptType('message');
    else if (action === 'trade') setPromptType('trade');
    else if (action === 'collections') setPromptType('collections');

    setTimeout(() => setShowPrompt(true), 500);
  };

  return {
    showPrompt,
    setShowPrompt,
    promptType,
    handleLogout,
    handleDeleteAccount,
    handleGuestAction,
  };
}
