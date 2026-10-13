import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { appAlert } from '@/ui';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { getRestrictionMessage, GuestAction } from '@/utils/guestRestrictions';
import { describeDeleteAccountError } from '../_lib/deleteAccountError';

/**
 * Profile actions controller — logout, account deletion, and the guest
 * restriction snackbar/prompt state. Lifted verbatim from ProfileScreen.
 */
export function useProfileActions() {
  const { t } = useTranslation();
  const { logout } = useAuthStore();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptType, setPromptType] = useState<
    'favorites' | 'message' | 'purchase' | 'trade' | 'collections'
  >('favorites');

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = () => {
    appAlert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('seller.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            try {
              await userApi.deleteAccount();
              await logout();
              router.replace('/(auth)/login');
            } catch (e) {
              // B-2.6: engel listesi gösterilir; aktif ilan engelinde ilanlarım
              // ekranına net bir yol verilir (yalnız navigasyon — ilanları
              // kapatmak üyenin kararı).
              const failure = describeDeleteAccountError(e, t('profile.deleteAccountFailed'));
              appAlert(
                failure.blocked ? t('profile.cannotDeleteAccount') : t('common.error'),
                failure.message,
                failure.hasActiveListings
                  ? [
                      { text: t('common.close'), style: 'cancel' },
                      {
                        text: t('profile.deleteBlockedManageListings'),
                        onPress: () => router.push('/settings/my-listings'),
                      },
                    ]
                  : undefined,
              );
            }
          },
        },
      ],
    );
  };

  const handleGuestAction = (action: GuestAction) => {
    const config = getRestrictionMessage(action);
    setSnackbarMessage(config.message);
    setSnackbarVisible(true);

    if (action === 'favorites' || action === 'wishlist') setPromptType('favorites');
    else if (action === 'message') setPromptType('message');
    else if (action === 'trade') setPromptType('trade');
    else if (action === 'collections') setPromptType('collections');

    setTimeout(() => setShowPrompt(true), 500);
  };

  return {
    snackbarVisible,
    setSnackbarVisible,
    snackbarMessage,
    showPrompt,
    setShowPrompt,
    promptType,
    handleLogout,
    handleDeleteAccount,
    handleGuestAction,
  };
}
