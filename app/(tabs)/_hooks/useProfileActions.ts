import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { appAlert, type AlertDialogButton } from '@/ui';
import { productsApi, userApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { getRestrictionMessage, GuestAction } from '@/utils/guestRestrictions';
import {
  deleteAccountPaths,
  describeDeleteAccountError,
  type ListingStatusCounts,
} from '../_lib/deleteAccountError';

/**
 * Profile actions controller — logout, account deletion, and the guest
 * restriction snackbar/prompt state. Lifted verbatim from ProfileScreen.
 */
export function useProfileActions() {
  const { t } = useTranslation();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
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

  /**
   * İlan engelinin hangi durumdan geldiğini (aktif / onay bekleyen / rezerve)
   * İlanlarım'ın sayaçlarından öğren. Anahtar ve gövde biçimi İlanlarım'la
   * aynı (`useMyListings`: `qk.products.myListingsStats`, ham axios yanıtı)
   * — önbellek paylaşılır. Alınamazsa `null` (yol yine verilir).
   */
  const fetchListingCounts = async (): Promise<ListingStatusCounts | null> => {
    try {
      const resp = await queryClient.fetchQuery({
        queryKey: qk.products.myListingsStats,
        queryFn: () => productsApi.getMyStats(),
        staleTime: 0,
      });
      const c = (resp?.data as { counts?: Partial<ListingStatusCounts> } | undefined)?.counts;
      return c ? { active: c.active ?? 0, pending: c.pending ?? 0, reserved: c.reserved ?? 0 } : null;
    } catch {
      return null;
    }
  };

  // B-2.6: engel listesi gösterilir (web gibi); ek olarak yalnız gerçekten
  // izlenebilecek yollar verilir — kapatılabilir ilan varsa İlanlarım, rezerve
  // ilan (satışa bağlı, kapatılamaz) varsa durum açıklanır ve Satışlarım,
  // bekleyen siparişte Siparişlerim. Yalnız navigasyon.
  const showDeleteBlocked = async (e: unknown) => {
    const failure = describeDeleteAccountError(e, t('profile.deleteAccountFailed'));
    const counts = failure.blockingListings > 0 ? await fetchListingCounts() : null;
    const paths = deleteAccountPaths(failure, counts);
    const message = paths.reservedListings
      ? `${failure.message}\n\n${t('profile.deleteBlockedReservedNote', { count: paths.reservedListings })}`
      : failure.message;
    const actions: AlertDialogButton[] = [];
    if (paths.manageListings) {
      actions.push({
        text: t('profile.deleteBlockedManageListings'),
        onPress: () => router.push('/settings/my-listings'),
      });
    }
    if (paths.sales) {
      actions.push({ text: t('mobile.quickMySales'), onPress: () => router.push('/sales') });
    }
    if (paths.orders) {
      actions.push({ text: t('nav.myOrders'), onPress: () => router.push('/orders') });
    }
    appAlert(
      failure.blocked ? t('profile.cannotDeleteAccount') : t('common.error'),
      message,
      actions.length ? [{ text: t('common.close'), style: 'cancel' }, ...actions] : undefined,
    );
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
              await showDeleteBlocked(e);
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
