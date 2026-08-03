import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import type { OrderStatus } from '../_lib/status';

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

  const handleTrack = async () => {
    if (!orderNumber.trim()) {
      setError('Sipariş numarası girin');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Geçerli bir e-posta adresi girin');
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
        setError('Sipariş bulunamadı. Bilgileri kontrol edin.');
      } else {
        setError(err.response?.data?.message || 'Sipariş sorgulanamadı');
      }
    } finally {
      setLoading(false);
    }
  };

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
  };
}

export type OrderTrackController = ReturnType<typeof useOrderTrack>;
