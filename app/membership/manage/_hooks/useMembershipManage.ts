import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useRefresh } from '@/hooks/useRefresh';
import { membershipApi } from '@/lib/api';
import { captureException } from '@/services/sentry';
import { buildTierNames, buildBillingPeriodNames, type MembershipMe } from '../_lib/types';

/**
 * Membership-manage controller — owns GET /membership/me, the cancel and
 * auto-renew mutations, derived tier flags, handlers and the snackbar. Lifted
 * verbatim from the monolithic screen (§12).
 */
export function useMembershipManage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const { data, isLoading, refetch } = useQuery<MembershipMe | null>({
    queryKey: ['membership', 'me'],
    queryFn: async () => {
      const response = await membershipApi.getCurrentMembership();
      return response.data?.data ?? response.data ?? null;
    },
  });

  const { refreshing, onRefresh } = useRefresh(refetch);

  const tierNames = buildTierNames(t);
  const billingPeriodNames = buildBillingPeriodNames(t);

  const tier = (data?.tier?.type ?? data?.tierType ?? 'free').toLowerCase();
  const tierName = data?.tier?.name ?? data?.tierName ?? tierNames[tier] ?? t('membership.freeMembership');
  const isPaid = tier !== 'free';
  const isCancelled = (data?.status ?? '').toLowerCase() === 'cancelled';
  const autoRenew = !!data?.autoRenew;

  // Dönem sonuna planlanmış paket değişikliği (varsa). İkisi de boşsa kart çizilmez.
  const scheduledTier = data?.scheduledTierType?.toLowerCase() ?? null;
  const hasScheduledChange = !!scheduledTier;
  const scheduledLabel = hasScheduledChange
    ? [
        tierNames[scheduledTier!] ?? scheduledTier!,
        data?.scheduledBillingPeriod
          ? `(${billingPeriodNames[data.scheduledBillingPeriod.toLowerCase()] ?? data.scheduledBillingPeriod})`
          : '',
      ]
        .filter(Boolean)
        .join(' ')
    : null;

  const cancelMutation = useMutation({
    mutationFn: () => membershipApi.cancel(),
    onSuccess: () => {
      setSnackbar({ visible: true, message: t('membership.manageCancelSuccess') });
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      refetch();
    },
    onError: (error: any) => {
      captureException(error, { level: 'error', tags: { flow: 'membership.cancel' } });
      const msg = error?.response?.data?.message || t('membership.manageCancelError');
      setSnackbar({ visible: true, message: typeof msg === 'string' ? msg : t('membership.manageCancelError') });
    },
  });

  const autoRenewMutation = useMutation({
    mutationFn: (next: boolean) => membershipApi.setAutoRenew(next),
    onSuccess: (_res, next) => {
      setSnackbar({
        visible: true,
        message: next ? t('membership.autoRenewOn') : t('membership.autoRenewOff'),
      });
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      refetch();
    },
    onError: (error: any) => {
      captureException(error, { level: 'error', tags: { flow: 'membership.autoRenew' } });
      const msg = error?.response?.data?.message || t('listing.actionFailed');
      setSnackbar({ visible: true, message: typeof msg === 'string' ? msg : t('listing.actionFailed') });
    },
  });

  const cancelScheduledChangeMutation = useMutation({
    mutationFn: () => membershipApi.cancelScheduledChange(),
    onSuccess: () => {
      setSnackbar({ visible: true, message: t('membership.manageScheduledCancelSuccess') });
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      refetch();
    },
    onError: (error: any) => {
      captureException(error, { level: 'error', tags: { flow: 'membership.cancelScheduledChange' } });
      const msg = error?.response?.data?.message || t('listing.actionFailed');
      setSnackbar({ visible: true, message: typeof msg === 'string' ? msg : t('listing.actionFailed') });
    },
  });

  const handleCancelScheduledChange = () => {
    appAlert(
      t('membership.manageCancelScheduledTitle'),
      t('membership.manageCancelScheduledBody', { tierLabel: scheduledLabel ?? t('common.new') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('membership.manageCancelScheduledButton'),
          style: 'destructive',
          onPress: () => cancelScheduledChangeMutation.mutate(),
        },
      ],
    );
  };

  const handleCancel = () => {
    appAlert(
      t('membership.cancelMembership'),
      t('membership.cancelConfirmDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('membership.cancel'), style: 'destructive', onPress: () => cancelMutation.mutate() },
      ],
    );
  };

  const handleToggleAutoRenew = () => {
    autoRenewMutation.mutate(!autoRenew);
  };

  return {
    t,
    data,
    isLoading,
    refreshing,
    onRefresh,
    tierName,
    isPaid,
    isCancelled,
    autoRenew,
    hasScheduledChange,
    scheduledLabel,
    cancelMutation,
    autoRenewMutation,
    cancelScheduledChangeMutation,
    handleCancelScheduledChange,
    handleCancel,
    handleToggleAutoRenew,
    snackbar,
    setSnackbar,
  };
}

export type MembershipManageController = ReturnType<typeof useMembershipManage>;
