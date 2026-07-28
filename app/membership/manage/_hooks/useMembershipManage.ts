import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useRefresh } from '@/hooks/useRefresh';
import { membershipApi } from '@/lib/api';
import { captureException } from '@/services/sentry';
import { TIER_NAMES, BILLING_PERIOD_NAMES, type MembershipMe } from '../_lib/types';

/**
 * Membership-manage controller — owns GET /membership/me, the cancel and
 * auto-renew mutations, derived tier flags, handlers and the snackbar. Lifted
 * verbatim from the monolithic screen (§12).
 */
export function useMembershipManage() {
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

  const tier = (data?.tier?.type ?? data?.tierType ?? 'free').toLowerCase();
  const tierName = data?.tier?.name ?? data?.tierName ?? TIER_NAMES[tier] ?? 'Ücretsiz Üyelik';
  const isPaid = tier !== 'free';
  const isCancelled = (data?.status ?? '').toLowerCase() === 'cancelled';
  const autoRenew = !!data?.autoRenew;

  // Dönem sonuna planlanmış paket değişikliği (varsa). İkisi de boşsa kart çizilmez.
  const scheduledTier = data?.scheduledTierType?.toLowerCase() ?? null;
  const hasScheduledChange = !!scheduledTier;
  const scheduledLabel = hasScheduledChange
    ? [
        TIER_NAMES[scheduledTier!] ?? scheduledTier!,
        data?.scheduledBillingPeriod
          ? `(${BILLING_PERIOD_NAMES[data.scheduledBillingPeriod.toLowerCase()] ?? data.scheduledBillingPeriod})`
          : '',
      ]
        .filter(Boolean)
        .join(' ')
    : null;

  const cancelMutation = useMutation({
    mutationFn: () => membershipApi.cancel(),
    onSuccess: () => {
      setSnackbar({ visible: true, message: 'Üyelik iptal talebi alındı.' });
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      refetch();
    },
    onError: (error: any) => {
      captureException(error, { level: 'error', tags: { flow: 'membership.cancel' } });
      const msg = error?.response?.data?.message || 'İptal işlemi başarısız.';
      setSnackbar({ visible: true, message: typeof msg === 'string' ? msg : 'İptal işlemi başarısız.' });
    },
  });

  const autoRenewMutation = useMutation({
    mutationFn: (next: boolean) => membershipApi.setAutoRenew(next),
    onSuccess: (_res, next) => {
      setSnackbar({
        visible: true,
        message: next ? 'Otomatik yenileme açıldı.' : 'Otomatik yenileme kapatıldı.',
      });
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      refetch();
    },
    onError: (error: any) => {
      captureException(error, { level: 'error', tags: { flow: 'membership.autoRenew' } });
      const msg = error?.response?.data?.message || 'İşlem başarısız.';
      setSnackbar({ visible: true, message: typeof msg === 'string' ? msg : 'İşlem başarısız.' });
    },
  });

  const cancelScheduledChangeMutation = useMutation({
    mutationFn: () => membershipApi.cancelScheduledChange(),
    onSuccess: () => {
      setSnackbar({ visible: true, message: 'Planlı paket değişikliği iptal edildi.' });
      queryClient.invalidateQueries({ queryKey: ['membership'] });
      refetch();
    },
    onError: (error: any) => {
      captureException(error, { level: 'error', tags: { flow: 'membership.cancelScheduledChange' } });
      const msg = error?.response?.data?.message || 'İşlem başarısız.';
      setSnackbar({ visible: true, message: typeof msg === 'string' ? msg : 'İşlem başarısız.' });
    },
  });

  const handleCancelScheduledChange = () => {
    appAlert(
      'Planlı Değişikliği İptal Et',
      `Dönem sonunda ${scheduledLabel ?? 'yeni'} plana geçiş iptal edilsin mi? Mevcut planınız devam eder.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Değişikliği İptal Et',
          style: 'destructive',
          onPress: () => cancelScheduledChangeMutation.mutate(),
        },
      ],
    );
  };

  const handleCancel = () => {
    appAlert(
      'Üyeliği İptal Et',
      'Üyeliğinizi iptal etmek istediğinize emin misiniz? Mevcut dönem sonuna kadar özelliklerinizi kullanmaya devam edebilirsiniz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'İptal Et', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ],
    );
  };

  const handleToggleAutoRenew = () => {
    autoRenewMutation.mutate(!autoRenew);
  };

  return {
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
