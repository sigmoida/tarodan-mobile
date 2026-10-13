import React, { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActionSheet, IconButton, TopBarAction, type ActionSheetAction, type IconButtonProps } from '@/ui';

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
 * Menü `ActionSheet`'tir (appAlert düğmeleriyle menü yapılmaz); her satırın eylemi sheet
 * TAMAMEN kapandıktan sonra çalışır — şikayet modalı / engel onayı (appAlert) bu yüzden
 * zamanlayıcı hack'i olmadan güvenle açılır (CLAUDE.md §12, `runAfterClose`).
 * Ekran `sheets`'i (menü + şikayet modalı) bir kez render eder.
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

  const [menuOpen, setMenuOpen] = useState(false);
  const open = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);

  const actions: ActionSheetAction[] = [
    ...(extraActions ?? []).map((a) => ({
      label: a.label,
      destructive: a.destructive,
      onPress: a.onPress,
    })),
    ...(showReportUser
      ? [
          {
            key: 'report-user',
            label: reportUserLabel ?? t('profile.report'),
            onPress: () => {
              if (!requireAuth()) return;
              setReportVisible(true);
            },
          },
        ]
      : []),
    isBlocked
      ? { key: 'unblock', label: t('profile.unblock'), onPress: () => requestUnblock(userId, userName) }
      : {
          key: 'block',
          label: blockLabel ?? t('profile.block'),
          destructive: true,
          onPress: () => requestBlock(userId, userName),
        },
  ];

  const sheets = (
    <>
      <ActionSheet
        isOpen={menuOpen}
        onClose={closeMenu}
        title={userName}
        actions={actions}
        cancelLabel={t('common.cancel')}
        testID="user-actions-sheet"
      />
      <ReportModal
        visible={reportVisible}
        onDismiss={() => setReportVisible(false)}
        type={'user' as ReportTargetType}
        targetId={userId}
        targetName={userName}
      />
    </>
  );

  return { open, pending, isBlocked, sheets };
}

export interface UserActionsButtonProps extends UserActionsProps {
  size?: IconButtonProps['size'];
  color?: string;
  variant?: IconButtonProps['variant'];
  testID?: string;
  /** Üst bar sağ aksiyonu olarak cam daire (`TopBarAction`) çiz; `size`/`color`/`variant` yok sayılır. */
  glass?: boolean;
}

/**
 * Hazır tetikleyici: "…" ikon düğmesi + eylem menüsü + şikayet modalı. Kendi düğmesi olan
 * ekranlar (ör. ilan detayı üst barı) bunun yerine `useUserActionsSheet`
 * kullanır.
 */
export default function UserActionsButton({
  size = 'md',
  color,
  variant,
  testID,
  glass,
  ...props
}: UserActionsButtonProps) {
  const { t } = useTranslation();
  const sheet = useUserActionsSheet(props);
  if (glass) {
    return (
      <>
        <TopBarAction
          testID={testID}
          icon="ellipsis-vertical"
          accessibilityLabel={t('common.more')}
          disabled={sheet.pending}
          onPress={sheet.open}
        />
        {sheet.sheets}
      </>
    );
  }
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
      {sheet.sheets}
    </>
  );
}
