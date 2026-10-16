import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { Alert, Button, Spinner, Text, theme, appAlert } from '@/ui';
import { router, useFocusEffect, useLocalSearchParams, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { paymentsApi } from '@/lib/api';
import { ScreenHeader, ErrorState } from '@/components/common';
import { captureException } from '@/services/sentry';
import CardPaymentForm from '@/components/CardPaymentForm';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { paymentCapabilities, SAFE_PAYMENT_CONFIG, type PaymentConfig, type PaymentPurpose } from '@/lib/payment/capabilities';
import {
  paymentKindOf,
  paymentTargetOf,
  type PaymentStatusLight,
} from './_lib/paymentKind';
import type { DirectFormTarget } from '@/lib/payment/directFormBody';

/**
 * ⚠️ BU EKRAN BİLEREK React Query'ye TAŞINMADI (CLAUDE.md §6'nın istisnası).
 *
 * Buradaki yükleme saf bir okuma değil: ödeme durumunu okurken bypass açıksa `bypassComplete` ile ödemeyi TAMAMLIYOR ve başarı/başarısızlık rotasına yönlendiriyor. React Query sorguları
 * başarısızlıkta yeniden dener, odaklanmada/yeniden bağlanmada tazeler ve
 * aynı `queryFn`'i birden çok kez çalıştırabilir. Para hareketi yapan bir
 * çağrının bu semantiğe konması, en kötü ihtimalle işlemin iki kez
 * yürütülmesi demek.
 *
 * Akış `resolvedRef` gibi tek-sefer korumalarıyla elle yazıldı ve öyle
 * kalmalı. Buraya "tutarlılık için" sorgu eklemeyin.
 */

const { colors } = theme;

/**
 * Ödeme ekranı — TEK ödeme yüzeyi (iframe/WebView ödeme akışı kaldırıldı).
 * Misafir + üye aynı PayTR Direct API kart formunu kullanır.
 *
 * Akış:
 *   1. Çağıran ekran (checkout/üyelik/takas) sipariş/grup/takas oluşturup paymentId elde eder.
 *   2. router.push('/payment/<paymentId>?guest=0|1&type=...')
 *   3. Bu ekran ödeme durumunu yükler; tamamlandıysa/başarısızsa yönlendirir, aksi halde
 *      hedefi (orderId/checkoutGroupId/tradeId) türetip CardPaymentForm'u gösterir.
 *   4. Yeni kart 3D Secure HTML'i CardPaymentForm içindeki WebView'de render edilir (meşru).
 *   5. PAYMENT_BYPASS (dev) açıksa kart formu yerine ödeme anında tamamlanır.
 */
export default function PaymentScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    id: string;
    guest?: string;
    /** Üyelik ödemesi: başarı → /membership/success */
    type?: string;
    /** Üyelik kademesi (basic|premium|business) — success ekranına taşınır. */
    tier?: string;
    /** Takas nakit farkı ödemesi: başarı → /trade/{tradeId} */
    tradeId?: string;
    tradeCash?: string;
  }>();

  const paymentId = params.id!;
  const isGuest = params.guest === '1';
  const isMembership = params.type === 'membership';
  // Boost da dijital (Guideline 3.1.3(g) / Play ödeme politikası) — dijital satış
  // kapalıyken BoostModal zaten `null` döner ve bu yola hiç girmez, ama emniyet
  // kilidi simetrik olsun diye burada.
  const isBoost = params.type === 'boost';

  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    target: DirectFormTarget | null;
    amount?: number;
    /** Kayıtlı kartların aranacağı PayTR mağazası (API delta 20). */
    purpose: PaymentPurpose;
    /** Bu amaçta kart saklama açık + üye: kayıtlı kart listesi ve "kartımı sakla". */
    cardStorageEnabled: boolean;
    /** Durum yanıtı üyelik siparişi dedi (rota `type` taşımasa da) → başarı /membership/success. */
    isMembership: boolean;
    /** Durum yanıtı üyelik dedi ve dijital satış kapalı → ödeme formu yok. */
    digitalBlocked: boolean;
  }>({
    loading: true,
    error: null,
    target: null,
    purpose: 'checkout',
    cardStorageEnabled: false,
    isMembership,
    digitalBlocked: false,
  });

  const resolvedRef = useRef(false);

  // Back handler — ödeme süreci içinde kazara çıkışı engelle.
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        handleCancel();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, []),
  );

  useEffect(() => {
    load();
    // ödeme durumu yalnızca paymentId değişince yeniden yüklenir
  }, [paymentId]);

  const load = async () => {
    // Dijital satış kapalıyken (iOS + Android: `CAN_BUY_DIGITAL`) üyelik ödemesi
    // kabul edilmez (Apple 3.1.1 / Play ödeme politikası). Yalnız JSX'i
    // kilitlemek yetmez: render kilidi devredeyken bu effect zaten tetiklenmiş
    // olabiliyor, kilit olmasa `load()` durum sorgusunu ATAR, bypass açıksa
    // ödemeyi TAMAMLAR ve /membership/success'e yönlendirip <Redirect>'i
    // ezerdi. Bu yüzden imperative tarafta da aynı reddi tekrar ediyoruz —
    // fiziksel yol (`isMembership` false) bundan hiç etkilenmez.
    if ((isMembership || isBoost) && !CAN_BUY_DIGITAL) return;
    try {
      setState(s => ({ ...s, loading: true, error: null }));

      // Public ödeme yapılandırması (bypass + amaç başına kart saklama) ve ödeme
      // durumu (hedef + tutar + tamamlandı/başarısız) birbirinden bağımsız →
      // aynı anda. Config hatası güvenli varsayılana düşer (yalnız yeni kart,
      // bypass kapalı); durum hatası aşağıdaki catch'e gider.
      const [cfg, res] = await Promise.all([
        paymentsApi
          .getConfig()
          .then((r): PaymentConfig => r.data ?? SAFE_PAYMENT_CONFIG)
          .catch((): PaymentConfig => SAFE_PAYMENT_CONFIG),
        isGuest ? paymentsApi.getStatusLightGuest(paymentId) : paymentsApi.getStatusLight(paymentId),
      ]);
      const data: PaymentStatusLight = res?.data?.data ?? res?.data ?? {};
      const kind = paymentKindOf(params.type, data);

      // Rota `type` taşımadan gelen üyelik ödemesi (başarısız ödeme ekranından /
      // Ödemelerim'den yeniden deneme): yukarıdaki kilit param'a bakıyor, burada
      // durum yanıtıyla tekrarlanır — bypass/yönlendirme/kart formu YOK.
      if (kind.isMembership && !CAN_BUY_DIGITAL) {
        setState(s => ({ ...s, loading: false, digitalBlocked: true }));
        return;
      }

      if (data.status === 'completed') {
        routeToSuccess(paymentId, kind.isMembership);
        return;
      }
      if (data.status === 'failed') {
        routeToFail();
        return;
      }

      // PAYMENT_BYPASS (dev/test): kart formu anlamsız — ödemeyi anında tamamla.
      if (cfg.bypassEnabled && data.status === 'pending') {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        try {
          await paymentsApi.bypassComplete(paymentId);
        } catch (bypassErr: any) {
          captureException(bypassErr, {
            level: 'error',
            tags: { flow: 'payment.bypassComplete' },
            extra: { paymentId },
          });
        }
        routeToSuccess(paymentId, kind.isMembership);
        return;
      }

      // Hedef status'tan türetilir; tradeId status'ta yoksa param'dan tamamla (yedek).
      const target = paymentTargetOf(data, params.tradeId);
      const hasTarget = !!(target.orderId || target.checkoutGroupId || target.tradeId);
      if (!hasTarget) {
        setState(s => ({
          ...s,
          loading: false,
          error: t('payment.targetNotFound'),
          target: null,
          cardStorageEnabled: false,
        }));
        return;
      }

      setState(s => ({
        ...s,
        loading: false,
        error: null,
        target,
        amount: data.amount != null ? Number(data.amount) : undefined,
        purpose: kind.purpose,
        isMembership: kind.isMembership,
        // Kayıtlı kart yalnız giriş yapmış kullanıcıya gösterilir.
        cardStorageEnabled: paymentCapabilities(cfg, kind.purpose).cardStorageEnabled && !isGuest,
      }));
    } catch (e: any) {
      captureException(e, {
        level: 'error',
        tags: { flow: 'payment.load' },
        extra: { paymentId, status: e?.response?.status },
      });
      setState(s => ({
        ...s,
        loading: false,
        error: e?.response?.data?.message || t('payment.infoLoadFailed'),
        target: null,
        cardStorageEnabled: false,
      }));
    }
  };

  // Geri git; stack kökündeysek ana sayfaya düş.
  const safeBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  const handleCancel = () => {
    // Geri çıkış siparişi İPTAL ETMEZ — sadece ödeme ekranından çıkar. Sipariş
    // "ödeme bekliyor" kalır; kullanıcı sonra tekrar ödeyebilir. Cron terk edileni temizler.
    appAlert(
      t('payment.exitTitle'),
      t('payment.exitBody'),
      [
        { text: t('payment.continuePaymentAction'), style: 'cancel' },
        { text: t('payment.exitAction'), onPress: () => safeBack() },
      ],
    );
  };

  const routeToSuccess = (pid: string = paymentId, membership: boolean = isMembership) => {
    if (membership) {
      router.replace({
        pathname: '/membership/success',
        params: { paymentId: pid, ...(params.tier ? { tier: params.tier } : {}) },
      } as any);
    } else {
      router.replace({
        pathname: '/payment/success',
        params: {
          paymentId: pid,
          guest: params.guest,
          tradeCash: params.tradeCash,
          tradeId: params.tradeId,
        },
      } as any);
    }
  };

  /**
   * Ödeme durumu doğrulanamadı (belirsiz): kullanıcı kartı yeniden girmesin diye ödemenin
   * hedefine gider — ödendiyse orada görünür, değilse oradan yeniden ödenir. Misafirin sipariş
   * ekranı yok: sipariş takibine.
   */
  const routeToTarget = (target: DirectFormTarget, membership: boolean) => {
    if (membership) router.replace('/membership' as never);
    else if (isGuest) router.replace('/order-track' as never);
    else if (target.tradeId) router.replace({ pathname: '/trade/[id]', params: { id: target.tradeId } } as never);
    else if (target.orderId) router.replace({ pathname: '/orders/[id]', params: { id: target.orderId } } as never);
    else if (target.checkoutGroupId)
      router.replace({ pathname: '/orders/group/[id]', params: { id: target.checkoutGroupId } } as never);
    else router.replace('/orders' as never);
  };

  const routeToFail = (pid: string = paymentId) => {
    router.replace({ pathname: '/payment/fail', params: { paymentId: pid, guest: params.guest } } as any);
  };

  // Dijital satış kapalıyken (iOS + Android) üyelik/öne çıkarma ödemesi kabul
  // edilmez (Apple 3.1.1 / Play ödeme politikası). Fiziksel sipariş,
  // sepet ve takas ödemesi bu ekrandan geçmeye DEVAM eder — 3.1.3(e) gereği
  // onların IAP dışında kalması zorunlu. Tüm hook'lardan (ve yukarıdaki
  // `load` closure'ından, ki `useEffect` ona referans veriyor — daha erken
  // bir çıkış TDZ hatasına yol açardı) SONRA, JSX döndürülmeden hemen önce.
  if ((isMembership || isBoost || state.digitalBlocked) && !CAN_BUY_DIGITAL) return <Redirect href="/membership" />;

  return (
    <View style={styles.container}>
      <ScreenHeader floating={false} title={t('checkout.securePayment')} subtitle="PayTR" onBack={handleCancel} />

      {state.loading ? (
        <View style={styles.center}>
          <Spinner size="lg" />
          <Text style={styles.loadingText}>{t('payment.preparing')}</Text>
        </View>
      ) : state.error ? (
        <View style={styles.errorWrap}>
          <ErrorState message={state.error} onRetry={load} />
          <Button variant="ghost" title={t('common.goBack')} onPress={safeBack} style={{ alignSelf: 'center' }} />
        </View>
      ) : state.target ? (
        <View style={{ flex: 1 }}>
          <Alert variant="success" icon="lock-closed" style={styles.safeNotice}>
            {t('payment.sslNotice')}
          </Alert>
          <CardPaymentForm
            target={state.target}
            amount={state.amount}
            purpose={state.purpose}
            cardStorageEnabled={state.cardStorageEnabled}
            isGuest={isGuest}
            paymentId={paymentId}
            onSuccess={(pid) => routeToSuccess(pid, state.isMembership)}
            onFail={() => routeToFail()}
            onUncertain={() => routeToTarget(state.target!, state.isMembership)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  safeNotice: { marginHorizontal: theme.spacing[4], marginTop: theme.spacing[2] },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[6],
  },
  loadingText: {
    marginTop: theme.spacing[3],
    color: colors.text.muted,
  },
  errorWrap: {
    flex: 1,
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
  },
});
