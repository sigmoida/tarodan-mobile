import React, { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { appAlert, IconButton, type IconButtonProps } from '@/ui';

import ReportModal, { type ReportTargetType } from './ReportModal';
import { useBlockStatus, useBlockUser } from '@/hooks/useBlockUser';
import { useAuthStore } from '@/stores/authStore';

/** Sheet'e eklenebilecek ek satır (şikayet satırlarının ÜSTÜNDE görünür). */
export interface UserActionsExtraAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface UserActionsProps {
  /** Hedef kullanıcı (satıcı / karşı taraf). */
  userId: string;
  userName: string;
  /** Kullanıcıyı şikayet satırı gizlensin mi (ör. ilan detayında ilanı şikayet ediliyor). */
  showReportUser?: boolean;
  /** Kullanıcı şikayeti satırının etiketi. */
  reportUserLabel?: string;
  /** Engelle satırının etiketi (ör. ilan detayında "Satıcıyı Engelle"). */
  blockLabel?: string;
  /** Engel konduktan sonra (ör. DM ekranından çıkmak). */
  onBlocked?: () => void;
  /** Snackbar'ı olan ekranlar kendi bildirimini geçer. */
  notify?: (message: string, type: 'success' | 'error') => void;
  extraActions?: UserActionsExtraAction[];
}

/**
 * Kullanıcıya dönük ortak eylem sheet'i: Şikayet Et / Engelle / Engeli Kaldır.
 * Satıcı profili, ilan detayı ve DM başlığı aynı davranışı kullanır — web
 * `UserActionsMenu` ile birebir aynı yüzeyler (Apple App Review 1.2 şartı).
 *
 * Sheet, `appAlert` üzerine kurulur; şikayet modalı iOS'ta alert kapanışını
 * beklemek zorunda (bkz. CLAUDE.md §12 modal/alert notu).
 */
export function useUserActionsSheet({
  userId,
  userName,
  showReportUser = true,
  reportUserLabel,
  blockLabel,
  onBlocked,
  notify,
  extraActions,
}: UserActionsProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [reportVisible, setReportVisible] = useState(false);
  const { isBlocked } = useBlockStatus(userId);

  const requireAuth = () => {
    if (isAuthenticated) return true;
    router.push('/(auth)/login');
    return false;
  };

  const { requestBlock, requestUnblock, pending } = useBlockUser({
    requireAuth,
    onBlocked,
    notify,
  });

  const open = () => {
    const buttons = [
      ...(extraActions ?? []).map((a) => ({
        text: a.label,
        style: a.destructive ? ('destructive' as const) : undefined,
        onPress: a.onPress,
      })),
      ...(showReportUser
        ? [
            {
              text: reportUserLabel ?? t('profile.report'),
              onPress: () => {
                if (!requireAuth()) return;
                // iOS: alert kapanırken açılan native Modal görünmeyebilir.
                setTimeout(() => setReportVisible(true), 300);
              },
            },
          ]
        : []),
      isBlocked
        ? { text: t('profile.unblock'), onPress: () => requestUnblock(userId, userName) }
        : {
            text: blockLabel ?? t('profile.block'),
            style: 'destructive' as const,
            onPress: () => requestBlock(userId, userName),
          },
      { text: t('common.cancel'), style: 'cancel' as const },
    ];
    appAlert(userName, undefined, buttons, { cancelable: true });
  };

  const reportModal = (
    <ReportModal
      visible={reportVisible}
      onDismiss={() => setReportVisible(false)}
      type={'user' as ReportTargetType}
      targetId={userId}
      targetName={userName}
    />
  );

  return { open, pending, isBlocked, reportModal };
}

export interface UserActionsButtonProps extends UserActionsProps {
  size?: IconButtonProps['size'];
  color?: string;
  variant?: IconButtonProps['variant'];
  testID?: string;
}

/**
 * Hazır tetikleyici: "…" ikon düğmesi + şikayet modalı. Kendi düğmesi olan
 * ekranlar (ör. ilan detayı üst barı) bunun yerine `useUserActionsSheet`
 * kullanır.
 */
export default function UserActionsButton({
  size = 'md',
  color,
  variant,
  testID,
  ...props
}: UserActionsButtonProps) {
  const { t } = useTranslation();
  const sheet = useUserActionsSheet(props);
  return (
    <>
      <IconButton
        testID={testID}
        icon="ellipsis-vertical"
        accessibilityLabel={t('common.more')}
        size={size}
        color={color}
        variant={variant}
        disabled={sheet.pending}
        onPress={sheet.open}
      />
      {sheet.reportModal}
    </>
  );
}
