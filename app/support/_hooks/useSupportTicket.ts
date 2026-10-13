import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { supportApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { captureException } from '@/services/sentry';
import type { TicketDetail } from '../_lib/types';

/**
 * Destek talebi detayı — sorgu, yanıt mutasyonu (hata → diyalog) ve çekip yenileme. Önceki
 * ekrandan AYNEN taşındı (yalnız sorgu anahtarları merkezi kayıttan, değerler aynı).
 */
export function useSupportTicket() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [reply, setReply] = useState('');

  const { data: ticket, isLoading, refetch } = useQuery({
    queryKey: qk.support.detail(id),
    queryFn: async () => {
      // getTicketById tek bir ticket DTO döndürür → res.data ticket.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await supportApi.getTicket(id as string);
      return (res?.data ?? res) as TicketDetail;
    },
    enabled: isAuthenticated && !!id,
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => supportApi.addMessage(id as string, { content }),
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: qk.support.tickets });
      refetch();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e: any) => {
      captureException(e, { level: 'error', tags: { flow: 'support.ticket.reply' } });
      appAlert(t('common.error'), e?.response?.data?.message || t('support.replyFailed'));
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && id) refetch();
    }, [isAuthenticated, id, refetch]),
  );

  return { ticket, isLoading, refreshing, onRefresh, reply, setReply, replyMutation };
}
