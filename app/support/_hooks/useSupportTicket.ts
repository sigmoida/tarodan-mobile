import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supportApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { FOCUS_LIST_STALE_MS, useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { captureException } from '@/services/sentry';
import type { TicketDetail } from '../_lib/types';

/**
 * Destek talebi detayı — sorgu, yanıt mutasyonu (hata → toast) ve çekip yenileme. Önceki
 * ekrandan AYNEN taşındı (yalnız sorgu anahtarları merkezi kayıttan, değerler aynı).
 */
export function useSupportTicket() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
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
    // Yanıtlar destek ekibinden gelir: dönüşte bundan eskiyse tazelenir.
    staleTime: FOCUS_LIST_STALE_MS,
  });

  const replyMutation = useAppMutation(
    (content: string) => supportApi.addMessage(id as string, { content }),
    {
      invalidates: [qk.support.tickets],
      error: t('support.replyFailed'),
      onSuccess: () => {
        setReply('');
        refetch();
      },
      onError: (e) => captureException(e, { level: 'error', tags: { flow: 'support.ticket.reply' } }),
    },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Ekrana dönüşte yalnız bayatsa tazele (her odakta değil; ilk açılışta ikinci istek yok).
  useRefetchStaleOnFocus([qk.support.detail(id)], isAuthenticated && !!id);

  return { ticket, isLoading, refreshing, onRefresh, reply, setReply, replyMutation };
}
