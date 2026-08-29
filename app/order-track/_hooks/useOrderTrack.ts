import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import i18n from '@/i18n/config';
import { canGuestCancel, type OrderStatus } from '../_lib/status';
import { useGuestOrderCancel } from './useGuestOrderCancel';

/** A route parameter arrives as a string, an array, or not at all. */
function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/**
 * Guest order-tracking controller — owns the form state (order number + email),
 * validation, and the guest track POST. Lifted verbatim from the monolith.
 *
 * Order cards and the order e-mails link here as `/order-track?orderNumber=…`,
 * so both fields seed from the route parameters; they are initial values only,
 * the user stays free to overwrite them.
 */
export function useOrderTrack() {
  const params = useLocalSearchParams<{ orderNumber?: string; email?: string }>();
  const [orderNumber, setOrderNumber] = useState(() => firstParam(params.orderNumber));
  const [email, setEmail] = useState(() => firstParam(params.email));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderStatus | null>(null);

  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    variant: 'success' | 'danger';
  }>({ visible: false, message: '', variant: 'success' });
  const notify = useCallback(
    (message: string, variant: 'success' | 'danger') =>
      setSnackbar({ visible: true, message, variant }),
    [],
  );
  const dismissSnackbar = useCallback(
    () => setSnackbar((s) => ({ ...s, visible: false })),
    [],
  );
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  /**
   * `useCallback` — iptal mutasyonunun `onSettled`'ı bunu yeniden koşuyor
   * (bu ekranın verisi React Query'de değil, `useState`'te; `invalidateQueries`
   * karşılığı budur). Kimliğinin her render'da değişmesi mutasyonu gereksiz
   * yeniden kurardı.
   */
  const handleTrack = useCallback(async () => {
    if (!orderNumber.trim()) {
      setError(i18n.t('validation.enterOrderNumber'));
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError(i18n.t('validation.invalidEmail'));
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const response = await api.post('/orders/guest/track', {
        orderNumber: orderNumber.trim(),
        email: email.trim().toLowerCase(),
      });

      setOrder(response.data);
    } catch (err: any) {
      console.error('Track order error:', err);
      if (err.response?.status === 404) {
        setError(i18n.t('order.notFoundCheckDetails'));
      } else {
        setError(err.response?.data?.message || i18n.t('order.trackQueryFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [orderNumber, email]);

  const cancelMutation = useGuestOrderCancel({
    orderNumber,
    email,
    onDone: handleTrack,
    notify,
  });

  const onChangeOrderNumber = (text: string) => {
    setOrderNumber(text);
    setError('');
  };
  const onChangeEmail = (text: string) => {
    setEmail(text);
    setError('');
  };

  return {
    orderNumber,
    onChangeOrderNumber,
    email,
    onChangeEmail,
    loading,
    error,
    order,
    handleTrack,
    snackbar,
    dismissSnackbar,
    /**
     * Misafir iptali. Kapı `canGuestCancel` — kargoya verilmiş siparişte sunucu
     * zaten 400 atıyor, butonu göstermek kullanıcıyı o hataya yürütmek olurdu.
     */
    cancel: {
      available: canGuestCancel(order),
      visible: cancelModalVisible,
      open: () => setCancelModalVisible(true),
      close: () => setCancelModalVisible(false),
      /** `pending_payment` dışında ödeme alınmıştır → iade uyarısı gösterilir. */
      willRefund: order?.status !== 'pending_payment',
      confirm: cancelMutation.mutate,
      isPending: cancelMutation.isPending,
    },
  };
}

export type OrderTrackController = ReturnType<typeof useOrderTrack>;
