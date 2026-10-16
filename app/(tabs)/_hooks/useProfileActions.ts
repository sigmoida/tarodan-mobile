import { useState } from 'react';
import { toast } from '@/ui';
import { getRestrictionMessage, GuestAction } from '@/utils/guestRestrictions';

/**
 * Profile actions controller — the guest restriction toast/prompt state. Çıkış Ayarlar ekranında
 * (`app/settings/_hooks/useSettingsScreen.ts`, tek kopya); hesabı sil Güvenlik ekranında.
 */
export function useProfileActions() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptType, setPromptType] = useState<
    'favorites' | 'message' | 'purchase' | 'trade' | 'collections'
  >('favorites');

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
    handleGuestAction,
  };
}
