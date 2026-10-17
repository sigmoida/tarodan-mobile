import React, { useEffect, useState } from 'react';
import { Alert, Button, Spinner } from '@/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { paymentsApi } from '@/lib/api';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';
import { forgetPaymentCapabilityIfFinal } from '@/lib/payment/paymentCapability';
import { PageShell } from '@/components/common/PageShell';
import { searchEntryHref } from '@/lib/navigation/searchHref';
import { useHardwareBackToHome } from '@/hooks/useBlockHardwareBack';
import { PaymentResultCard } from '@/components/payment/PaymentResultCard';

/**
 * ⚠️ BU EKRAN BİLEREK React Query'ye TAŞINMADI (CLAUDE.md §6'nın istisnası).
 *
 * Buradaki yükleme saf bir okuma değil: `confirmFailed` çağrısıyla stok rezervasyonunu SERBEST BIRAKIYOR. React Query sorguları
 * başarısızlıkta yeniden dener, odaklanmada/yeniden bağlanmada tazeler ve
 * aynı `queryFn`'i birden çok kez çalıştırabilir. Para hareketi yapan bir
 * çağrının bu semantiğe konması, en kötü ihtimalle işlemin iki kez
 * yürütülmesi demek.
 *
 * Akış `resolvedRef` gibi tek-sefer korumalarıyla elle yazıldı ve öyle
 * kalmalı. Buraya "tutarlılık için" sorgu eklemeyin.
 */

interface PaymentInfo {
  id: string;
  orderId?: string;
  tradeId?: string;
  order?: { id: string; orderNumber?: string };
  failureReason?: string;
  errorCode?: string;
  status?: string;
}

export default function PaymentFailScreen() {
  const { t } = useTranslation();
  const { paymentId, guest, error: queryError } = useLocalSearchParams<{
    paymentId: string;
    guest?: string;
    error?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [retrying, setRetrying] = useState(false);
  const { requireIdentity, isChecking: checkingIdentity } = useRequireLegalIdentity();
  const isGuest = guest === '1';
  // Sonuç ekranı: donanım geri tuşu ödeme formuna/sepete DÖNMEZ — ana sayfaya; tekrar deneme düğmede.
  useHardwareBackToHome();

  useEffect(() => {
    const load = async () => {
      if (!paymentId) { setLoading(false); return; }
      try {
        // Rezervasyonu serbest bırak. Misafir `guestApi`'den (Bearer yok, 401'de çıkış yok).
        const release = guest === '1' ? paymentsApi.confirmFailedGuest : paymentsApi.confirmFailed;
        await release(paymentId).catch(() => null);
        // Üye de `/status` (public + yetki belirteci): oturum 3DS sırasında
        // düştüyse JWT'li `GET /payments/:id` gibi 401 → çıkış → login yok.
        const response = guest === '1'
          ? await paymentsApi.getStatusLightGuest(paymentId)
          : await paymentsApi.getStatusLight(paymentId);
        const data = response.data?.data ?? response.data ?? null;
        setInfo(data);
        // confirm-failed ve durum okuması bitti; ödeme kesinse belirteci sil.
        void forgetPaymentCapabilityIfFinal(paymentId, data?.status);
      } catch {
        // Sessiz
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [paymentId, guest]);

  // Yalnız üye: `POST /payments/:id/retry` JwtAuthGuard'lı ve `api`'den gider.
  // Misafir 401 → çıkış + login ekranına düşerdi; misafire düğme gösterilmez.
  const handleRetry = async () => {
    if (!paymentId || isGuest) return;
    // B4: yeniden deneme yeni bir ödeme başlatır — önce yasal kimlik.
    // Vazgeçerse istek gitmez. Misafirde Tekrar Dene yok (web ile aynı).
    if (!(await requireIdentity())) return;
    try {
      setRetrying(true);
      await paymentsApi.retry(paymentId);
      router.replace({ pathname: '/payment/[id]', params: { id: paymentId, guest } } as any);
    } catch (e: any) {
      setRetrying(false);
      // Alert gerekirse burada gösterilebilir; basit tutuyoruz.
    }
  };

  const orderId = info?.order?.id || info?.orderId;
  // Takas nakit farkı ödemesi: sipariş yerine takas detayına dönülür.
  const tradeId = info?.tradeId;
  const reason = queryError || info?.failureReason || t('payment.failedReasonDefault');

  return (
    <PageShell title={t('checkout.title')} showBack={false}>
      <PaymentResultCard
        tone="danger"
        title={t('payment.failedTitle')}
        description={reason}
        actions={
          <>
            {isGuest ? (
              // Web misafir başarısız akışı (`PaymentFailClient`): yalnız "İlanlara Dön".
              <Button
                variant="primary"
                title={t('seller.backToListings')}
                fullWidth
                onPress={() => router.replace(searchEntryHref('all'))}
              />
            ) : (
              <Button
                variant="primary"
                title={t('payment.retry')}
                fullWidth
                onPress={handleRetry}
                isLoading={retrying || checkingIdentity}
                disabled={retrying || checkingIdentity || !paymentId}
                testID="payment-retry-button"
              />
            )}
            {tradeId ? (
              <Button
                variant="outline"
                title={t('trade.backToTrade')}
                fullWidth
                onPress={() => router.replace(`/trade/${tradeId}` as any)}
              />
            ) : orderId && !isGuest ? (
              <Button
                variant="outline"
                title={t('payment.goToOrderDetail')}
                fullWidth
                onPress={() => router.replace(`/orders/${orderId}` as any)}
              />
            ) : null}
            <Button variant="ghost" title={t('auth.goToHome')} fullWidth onPress={() => router.replace('/')} />
          </>
        }
      >
        {loading ? <Spinner size="md" /> : null}
        <Alert variant="warning">{t('payment.failedHint')}</Alert>
      </PaymentResultCard>
    </PageShell>
  );
}
