import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { discountsApi } from '@/lib/api';
import { extractApiMessage } from '../_lib/validation';

type CartLine = { productId: string; quantity: number; price: number };

export type AppliedCoupon = {
  code: string;
  /** Sunucunun hesapladığı tahmini indirim; kesin tutar sipariş yanıtından gelir. */
  discount: number;
  name?: string;
};

type ValidationResult = {
  isValid?: boolean;
  error?: string;
  discount?: { code?: string; name?: string; estimatedDiscount?: number };
};

/**
 * Checkout kupon kutusu controller'ı — kodu doğrular ve uygulanan kuponu tutar.
 * Üye `POST /discounts/validate` (fiyat da gönderir), misafir auth'suz
 * `POST /discounts/validate-guest` ucunu kullanır.
 */
export function useCoupon(items: CartLine[], isAuthenticated: boolean) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sepet değişince indirim tutarı bayatlar — kuponu düşür, kullanıcı yeniden uygulasın.
  useEffect(() => {
    setApplied(null);
    setError(null);
  }, [items]);

  const mutation = useMutation({
    mutationFn: async (raw: string) => {
      const trimmed = raw.trim().toUpperCase();
      const lines = items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        price: it.price,
      }));
      const response: any = isAuthenticated
        ? await discountsApi.validate({ code: trimmed, cartItems: lines })
        : await discountsApi.validateGuest({
            code: trimmed,
            cartItems: lines.map(({ productId, quantity }) => ({ productId, quantity })),
          });
      return ((response.data as any)?.data ?? response.data ?? {}) as ValidationResult;
    },
    onSuccess: (result, raw) => {
      // Uç geçersiz kuponda da 200 döner; karar `isValid` alanında.
      if (!result?.isValid || !result.discount) {
        setApplied(null);
        setError(result?.error || 'Kupon kodu geçersiz veya süresi dolmuş.');
        return;
      }
      setError(null);
      setApplied({
        code: result.discount.code || raw.trim().toUpperCase(),
        discount: Math.max(0, Number(result.discount.estimatedDiscount ?? 0)),
        name: result.discount.name,
      });
    },
    onError: (err: any) => {
      setApplied(null);
      setError(extractApiMessage(err) ?? 'Kupon doğrulanamadı. Lütfen tekrar deneyin.');
    },
  });

  const apply = () => {
    const trimmed = code.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate(trimmed);
  };

  const remove = () => {
    setApplied(null);
    setError(null);
    setCode('');
  };

  return {
    code,
    setCode,
    applied,
    error,
    apply,
    remove,
    isPending: mutation.isPending,
    /** Özet ve toplamda kullanılan indirim tutarı (kupon yoksa 0). */
    discount: applied?.discount ?? 0,
    /** Checkout payload'ına eklenecek kod (kupon yoksa undefined). */
    couponCode: applied?.code,
  };
}

export type CouponController = ReturnType<typeof useCoupon>;
