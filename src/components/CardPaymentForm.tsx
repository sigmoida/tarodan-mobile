import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { Button, Input, Checkbox, Text, theme, appAlert, Icon, RadioIndicator, LoadingIndicator } from '@/ui';
import { paymentsApi } from '@/lib/api';
import type { PaymentPurpose } from '@/lib/payment/capabilities';
import { buildDirectFormBody, type DirectFormBody, type DirectFormTarget } from '@/lib/payment/directFormBody';
import { useSavedCards } from '@/lib/payment/useSavedCards';
import { DistanceSalesConsent } from '@/components/payment/DistanceSalesConsent';
import {
  assertSafePaytrForm,
  buildPaytrFormHtml,
  cardFieldsForNewCard,
  cardFieldsForSavedCard,
  PAYTR_ACTION,
} from '@/lib/payment/paytrDirectForm';
import { PAYMENT_POLL_DURATION_MS, PAYMENT_STATUS_POLL_MS, startVerifyLoop } from '@/lib/payment/verifyPacer';
import { isPaidPaymentStatus } from '@/lib/payment/status';
import { threeDSCallbackResult } from '@/lib/payment/threeDSCallback';
import { formatPriceNumber } from '@/utils/format';
import { useScreenCaptureProtection } from '@/lib/security/screenCapture';

/**
 * ⚠️ 3DS SONRASI DURUM YOKLAMASI BİLEREK React Query'de DEĞİL (CLAUDE.md §6'nın
 * istisnası). Aşağıdaki effect ödeme durumunu sabit aralıklarla sorup nihai
 * sonuca göre yönlendiriyor; React Query'nin yeniden deneme ve odakta tazeleme
 * semantiği bu yoklamayı öngörülemez hâle getirir — ödeme akışında zamanlama
 * davranışın kendisidir. Yoklama elle, tek-sefer korumalarıyla yazıldı ve öyle
 * kalmalı. Saf okuma olan kayıtlı kart listesi ise query hook'ta (`useSavedCards`).
 */

const { colors } = theme;

/**
 * CardPaymentForm (mobil) — TEK ödeme yüzeyi: PayTR Direct API (misafir + üye). Web paritesi.
 *  - Yeni kart (3D → WebView) ile ödeme; tüm akışlarda aynı bileşen.
 *  - cardStorageEnabled (bu amacın PayTR mağazasında kart saklama açık + üye) iken:
 *    o mağazanın kayıtlı kartları + "kartımı sakla". Kapalıyken yalnız yeni-kart 3D.
 * GÜVENLİK: kart no/CVV yalnız istekle PayTR'a gider; saklanmaz/loglanmaz.
 */

interface Props {
  target: DirectFormTarget;
  amount?: number;
  onSuccess: (paymentId: string) => void;
  onFail?: () => void;
  /**
   * Doğrulama süresi doldu, ödeme durumu BELİRSİZ (ödendi de ödenmedi de denemez): uyarı
   * kapatılınca çağrılır — çağıran siparişe / takasa yönlendirir (yeniden kart girip çift
   * tahsilat riski yok). Verilmezse eski davranış: form ekranda kalır.
   */
  onUncertain?: () => void;
  /**
   * Ödemenin PayTR mağazası (API delta 20). Kartlar mağazaya özeldir: yalnız bu
   * amacın kartları listelenir — diğer mağazanın kartı direct-form'da
   * `404 server.payment.savedCardNotFound` verir.
   */
  purpose?: PaymentPurpose;
  /** Kayıtlı kart + "kartımı sakla" gösterilsin mi (`purposes[purpose].cardStorageEnabled` + üye). */
  cardStorageEnabled?: boolean;
  /** Misafir ödemesi mi — durum yoklamasında `status-guest` ucu kullanılır (verify üyedeki gibi çağrılır). */
  isGuest?: boolean;
  /**
   * Çağıran ekranın (/payment/[id]) zaten bildiği ödeme referansı — form mount olmadan
   * ÖNCE sipariş/grup/takas için oluşturulmuş paymentId. Web gibi direct-form gövdesine
   * girer (misafirde `X-Payment-Capability` ile birlikte zorunlu). directForm ağ/timeout hatası
   * verirse (sunucu charge'ı işlemiş olabilir) bu referansla mevcut poll/verify güvenlik
   * ağı devreye alınır; sert "başarısız" gösterilmez.
   */
  paymentId?: string;
}

const NEW_CARD = '__new__';
/**
 * Ödeme belirsizliği / durdurma uyarıları kullanıcı okumadan kapanmasın: geri tuşu ve arka plan
 * kapatmaz (tek düğmeli alert varsayılanı `cancelable: true`).
 */
const PAYMENT_ALERT = { cancelable: false } as const;

export default function CardPaymentForm({
  target,
  amount,
  onSuccess,
  onFail,
  onUncertain,
  purpose = 'checkout',
  cardStorageEnabled = false,
  isGuest = false,
  paymentId: initialPaymentId,
}: Props) {
  const { t } = useTranslation();
  // Kart numarası / CVV ve 3DS sayfası ekran görüntüsüne, kayda ve uygulama değiştiriciye düşmez.
  useScreenCaptureProtection();
  // Kayıtlı kart listesi yalnız bu amaçta kart saklama açıkken alınır.
  const cardsQuery = useSavedCards({ purpose, enabled: cardStorageEnabled });
  const cards = useMemo(() => (cardStorageEnabled ? cardsQuery.data ?? [] : []), [cardStorageEnabled, cardsQuery.data]);
  const loadingCards = cardStorageEnabled && cardsQuery.isLoading;
  // Kullanıcı seçmediyse (ya da seçtiği kart listeden düştüyse) ilk kart, yoksa
  // yeni kart — web `useCardPayment`'taki otomatik seçimle aynı.
  const [picked, setPicked] = useState<string | null>(null);
  const selected =
    picked === NEW_CARD || (picked && cards.some((c) => c.id === picked)) ? picked : cards[0]?.id ?? NEW_CARD;
  const [processing, setProcessing] = useState(false);
  const [threeDSHtml, setThreeDSHtml] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  // directForm ağ/timeout hatasında (sunucu charge'ı işlemiş olabilir) true olur;
  // 3DS WebView olmadan da poll useEffect'ini devreye alır.
  const [verifying, setVerifying] = useState(false);

  const [holder, setHolder] = useState('');
  const [number, setNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  // Varsayılan işaretli (web ile aynı): üyelikte oto-yenileme ancak saklanan kartla açılır.
  const [saveCard, setSaveCard] = useState(true);
  const [savedCvv, setSavedCvv] = useState('');
  const [distanceSalesAccepted, setDistanceSalesAccepted] = useState(false);

  // Sonucu yalnız bir kez bildir (poll + WebView yönlendirmesi yarışabilir).
  const resolvedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onFailRef = useRef(onFail);
  const onUncertainRef = useRef(onUncertain);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onFailRef.current = onFail;
    onUncertainRef.current = onUncertain;
  });

  const resolveSuccess = (pid: string) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onSuccessRef.current(pid);
  };
  const resolveFail = () => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onFailRef.current?.();
  };

  /** Sunucudaki ödeme durumu (misafir: yetki belirteciyle `status-guest`). */
  const readPaymentStatus = async (pid: string): Promise<unknown> => {
    const res = isGuest ? await paymentsApi.getStatusLightGuest(pid) : await paymentsApi.getStatusLight(pid);
    const body = (res as { data?: { data?: { status?: unknown }; status?: unknown } } | undefined)?.data;
    return (body?.data ?? body ?? {}).status;
  };

  // 3DS dönüş adresine varıldı: başarı YALNIZ sunucu "ödendi" derse gösterilir. Adres
  // (sahte bir yönlendirme dahil) tek başına başarı sayılmaz; değilse yoklama sürer.
  const confirmingRef = useRef(false);
  const confirmPaidFromCallback = async (pid: string) => {
    if (confirmingRef.current || resolvedRef.current) return;
    confirmingRef.current = true;
    try {
      if (isPaidPaymentStatus(await readPaymentStatus(pid))) resolveSuccess(pid);
    } catch {
      /* yoksay: yoklama/verify döngüsü durumu doğrulamaya devam eder */
    } finally {
      confirmingRef.current = false;
    }
  };

  // 3DS WebView açıkken VEYA directForm ağ/timeout hatası sonrası (verifying) ödeme
  // durumunu yokla. PayTR'ın dönüş yönlendirmesi (merchant_ok_url) WebView içinde her zaman
  // /payment/success URL'ine ulaşmayabilir; bu durumda kullanıcı PayTR'ın "ödeme alınıyor"
  // sayfasında SONSUZA DEK takılıyordu. Ayrıca timeout durumunda sunucu charge'ı işlemiş
  // olabilir — aynı poll, bilinen paymentId ile gerçek durumu doğrular. Durum terminal
  // olunca (completed/failed) sonucu bildiriyoruz.
  useEffect(() => {
    if (!paymentId || !(threeDSHtml || verifying)) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + PAYMENT_POLL_DURATION_MS;
    // verify PayTR durumunu sunucuda sorgular ve ödemeyi aktive eder (idempotent):
    // callback gecikse ya da hiç gelmese de ödeme tamamlanır. Misafir de çağırır
    // (`X-Payment-Capability` ile, `guestApi`'den). Sabit tempo (`verifyPacer`):
    // ilki ~3 sn'de, sonra 10 sn'de bir, arkada; durum okuması onu BEKLEMEZ. 3DS'in
    // hangi aşamada olduğuna (banka sayfası, uygulama geçişi) bakılmaz.
    const stopVerify = startVerifyLoop(paymentId, { guest: isGuest });
    const poll = async () => {
      try {
        const status = await readPaymentStatus(paymentId);
        if (!alive) return;
        if (isPaidPaymentStatus(status)) resolveSuccess(paymentId);
        else if (status === 'failed') resolveFail();
      } catch { /* yoksay, tekrar dene */ }
      if (!alive) return;
      if (resolvedRef.current) {
        stopVerify();
        return;
      }
      if (Date.now() < deadline) {
        timer = setTimeout(poll, PAYMENT_STATUS_POLL_MS);
        return;
      }
      // Yoklama süresi doldu (terminal duruma ulaşılamadı): ödeme BELİRSİZ. Kapatılamayan
      // uyarı; çağıran yönlendirme verdiyse siparişe gidilir (kart yeniden girilmez).
      stopVerify();
      if (verifying && !threeDSHtml) {
        setVerifying(false);
        const uncertain = onUncertainRef.current;
        if (uncertain) {
          appAlert(
            t('payment.connectionIssueTitle'),
            t('payment.verifyTimeoutBody'),
            [{ text: t('common.ok'), onPress: () => uncertain() }],
            PAYMENT_ALERT,
          );
        } else {
          setProcessing(false);
          appAlert(t('payment.connectionIssueTitle'), t('payment.verifyTimeoutBody'), undefined, PAYMENT_ALERT);
        }
      }
    };
    timer = setTimeout(poll, PAYMENT_STATUS_POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
      stopVerify();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threeDSHtml, verifying, paymentId, isGuest]);

  const selectedCard = useMemo(() => cards.find((c) => c.id === selected) || null, [cards, selected]);
  // "Oto-yenileme" metni yalnız üyelik ödemesinde — ve dijital satış açıkken
  // (Apple 2.1(b) / Play: satılmayan aboneliğe atıf yok). Sepet: "sonraki ödemeler".
  const renewalCopy = purpose === 'membership' && CAN_BUY_DIGITAL;

  const digitsOnly = (v: string) => v.replace(/\D/g, '');

  function validateNewCard(): string | null {
    if (holder.trim().length < 2) return t('payment.cardHolderRequired');
    const num = digitsOnly(number);
    if (num.length < 15 || num.length > 16) return t('payment.cardNumberInvalid');
    if (!/^\d{2}$/.test(expMonth) || Number(expMonth) < 1 || Number(expMonth) > 12)
      return t('payment.expMonthInvalid');
    if (!/^\d{2}(\d{2})?$/.test(expYear)) return t('payment.expYearInvalid');
    if (!/^\d{3,4}$/.test(cvc)) return t('payment.cvvInvalid');
    return null;
  }

  async function submit() {
    if (processing) return;
    // Düğme zaten kapalı; yine de onaysız ödeme isteği hiç gitmesin.
    if (!distanceSalesAccepted) return;

    let body: DirectFormBody;
    let cardFields: { name: string; value: string }[];

    if (selected === NEW_CARD) {
      const err = validateNewCard();
      if (err) {
        appAlert(t('payment.missingInfoTitle'), err);
        return;
      }
      body = buildDirectFormBody({
        target,
        paymentId: initialPaymentId,
        card: { kind: 'new', save: cardStorageEnabled && saveCard },
        distanceSalesAccepted,
      });
      cardFields = cardFieldsForNewCard({
        holder,
        number,
        expMonth,
        expYear,
        cvc,
      });
    } else {
      if (selectedCard?.requireCvv && !/^\d{3,4}$/.test(savedCvv)) {
        appAlert(t('payment.cvvRequiredTitle'), t('payment.cvvRequiredBody'));
        return;
      }
      body = buildDirectFormBody({
        target,
        paymentId: initialPaymentId,
        card: { kind: 'saved', id: selected },
        distanceSalesAccepted,
      });
      cardFields = cardFieldsForSavedCard(selectedCard?.requireCvv ? savedCvv : undefined);
    }

    setProcessing(true);
    try {
      // Misafir `guestApi`'den: cihazda kalmış token eklenmez, 401'de çıkış yapılmaz.
      const res = await (isGuest ? paymentsApi.directFormGuest(body) : paymentsApi.directForm(body));
      const data = res.data;
      setPaymentId(data.paymentId);

      // İki güvenlik kontrolü: hedef tam olarak PayTR mı, sunucu ham kart alanı
      // gönderiyor mu. Başarısızsa akış İPTAL edilir (kart bilgisi hiçbir yere gitmez).
      assertSafePaytrForm(data);

      const savedCardCvvRequired = data.savedCard === true && data.requireCvv === false;
      const fields = savedCardCvvRequired ? data.fields : [...data.fields, ...cardFields];
      setThreeDSHtml(buildPaytrFormHtml(PAYTR_ACTION, fields));
      setProcessing(false);
      return;
    } catch (e: any) {
      // Güvenlik doğrulaması reddi — tekrar denemek çözmez, kullanıcıya net söyle.
      if (e?.code === 'PAYTR_BAD_ACTION' || e?.code === 'PAYTR_RAW_CARD_FIELD' || e?.code === 'PAYTR_NO_FIELDS') {
        appAlert(t('payment.stoppedTitle'), e.message, undefined, PAYMENT_ALERT);
        setProcessing(false);
        return;
      }
      // Ağ/timeout hatası (30sn client-timeout dahil): sunucudan yanıt YOK demek, sunucu
      // charge'ı işlemiş olabilir. Gerçek API reddi (4xx/5xx yanıtlı) bu değildir.
      const isNetworkOrTimeout = e?.code === 'ECONNABORTED' || !e?.response;
      if (isNetworkOrTimeout && initialPaymentId) {
        // Sert "başarısız" gösterme — çağıran ekranın zaten bildiği paymentId ile mevcut
        // poll/verify güvenlik ağını devreye al (processing=true kalır, buton spinner'da).
        setPaymentId(initialPaymentId);
        setVerifying(true);
        return;
      }
      if (isNetworkOrTimeout) {
        // Elde ödeme referansı yok (beklenmeyen durum) — sert hata yerine bilgilendirme.
        appAlert(t('payment.connectionIssueTitle'), t('payment.processingMaybeBody'), undefined, PAYMENT_ALERT);
        setProcessing(false);
        return;
      }
      appAlert(t('common.error'), e?.response?.data?.message || t('payment.startFailed'));
      setProcessing(false);
    }
  }

  // 3D Secure: bankanın doğrulama sayfası. Yalnız KENDİ dönüş adresimiz (katı köken + yol
  // eşleşmesi, `threeDSCallbackResult`) sayılır; benzer görünen başka adresler yok sayılır.
  //  - başarısızlık adresi → sonuç bildirilir;
  //  - başarı adresi → WebView KAPANIR (web sitemizin başarı sayfası uygulamada çizilmez),
  //    ekran "doğrulanıyor" durumuna geçer ve sunucu durumu yoklanır: "ödendi" → başarı,
  //    "başarısız" → başarısızlık, süre dolarsa "ödeme belirsiz" uyarısı (`onUncertain`).
  //    `onSuccess` sunucu "ödendi" demeden ASLA çağrılmaz.
  // Dönüş ele alındıysa `true` (WebView o adresi yüklemesin).
  const callbackHandledRef = useRef(false);
  function handleThreeDSCallback(url: string | undefined): boolean {
    const result = threeDSCallbackResult(url);
    if (!result) return false;
    if (result === 'fail') {
      resolveFail();
      return true;
    }
    if (callbackHandledRef.current) return true;
    callbackHandledRef.current = true;
    setThreeDSHtml(null);
    if (paymentId) {
      setProcessing(true);
      setVerifying(true);
      void confirmPaidFromCallback(paymentId);
    } else {
      setProcessing(false);
    }
    return true;
  }

  if (threeDSHtml) {
    return (
      <View style={styles.webviewWrap}>
        <Pressable
          testID="threeds-cancel"
          onPress={() => {
            setThreeDSHtml(null);
            // paymentId varsa sert "başarısız" gösterme — poll/verify güvenlik ağı
            // (yukarıdaki useEffect) devreye girip gerçek durumu doğrular. Kullanıcı
            // bankada 3DS'i onaylamış olabilir; erken "başarısız" çift charge'a yol açar.
            if (paymentId) {
              // processing=true kalır (buton spinner'da) ki kullanıcı doğrulama
              // tamamlanmadan tekrar ödeme başlatamasın.
              setProcessing(true);
              setVerifying(true);
            } else {
              setProcessing(false);
            }
          }}
          style={{ padding: theme.spacing[3], alignSelf: 'flex-end' }}
        >
          <Text style={{ color: colors.primary[600]!, fontWeight: '600' }}>{t('payment.threeDSCancel')}</Text>
        </Pressable>
        <WebView
          originWhitelist={['*']}
          source={{ html: threeDSHtml }}
          // İki kanca birlikte: Android form POST'u / bazı yönlendirmeler için
          // `onShouldStartLoadWithRequest` çağrılmaz, gezinme durumu yine bildirilir.
          onShouldStartLoadWithRequest={(req) => !handleThreeDSCallback(req.url)}
          onNavigationStateChange={(nav: WebViewNavigation) => {
            handleThreeDSCallback(nav.url);
          }}
          startInLoadingState
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.titleRow}>
        <Icon name="credit-card" size={22} color={colors.primary[500]} />
        <Text variant="h3">{t('payment.cardFormTitle')}</Text>
      </View>

      {loadingCards ? (
        <View style={styles.center}>
          <LoadingIndicator />
        </View>
      ) : (
        <View style={styles.list}>
          {cards.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setPicked(c.id)}
              style={[styles.row, selected === c.id && styles.rowActive]}
            >
              <RadioIndicator checked={selected === c.id} color={colors.primary[500]} />
              <Icon name="credit-card" variant="solid" size={18} color={colors.text.muted} />
              <Text variant="body" style={styles.cardLabel}>
                {(c.brand || t('payment.cardGenericBrand')) + ' •••• ' + c.last4}
              </Text>
              {selected === c.id && c.requireCvv && (
                <Input
                  containerStyle={styles.cvvInline}
                  placeholder={t('checkout.cvv')}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  value={savedCvv}
                  onChangeText={(v) => setSavedCvv(digitsOnly(v))}
                />
              )}
            </Pressable>
          ))}

          <Pressable
            onPress={() => setPicked(NEW_CARD)}
            style={[styles.row, selected === NEW_CARD && styles.rowActive]}
          >
            <RadioIndicator checked={selected === NEW_CARD} color={colors.primary[500]} />
            <Icon name="plus" size={18} color={colors.text.muted} />
            <Text variant="body" style={styles.cardLabel}>
              {t('payment.payWithNewCard')}
            </Text>
          </Pressable>

          {selected === NEW_CARD && (
            <View style={styles.newCard}>
              <Input
                testID="card-holder"
                placeholder={t('payment.cardHolderPlaceholder')}
                value={holder}
                onChangeText={setHolder}
                autoCapitalize="characters"
              />
              <Input
                testID="card-number"
                placeholder={t('payment.cardNumberPlaceholder')}
                keyboardType="number-pad"
                maxLength={16}
                value={number}
                onChangeText={(v) => setNumber(digitsOnly(v).slice(0, 16))}
              />
              <View style={styles.expRow}>
                <Input
                  testID="card-exp-month"
                  containerStyle={styles.expField}
                  placeholder={t('payment.expMonthPlaceholder')}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={expMonth}
                  onChangeText={(v) => setExpMonth(digitsOnly(v).slice(0, 2))}
                />
                <Input
                  testID="card-exp-year"
                  containerStyle={styles.expField}
                  placeholder={t('payment.expYearPlaceholder')}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={expYear}
                  onChangeText={(v) => setExpYear(digitsOnly(v).slice(0, 4))}
                />
                <Input
                  testID="card-cvc"
                  containerStyle={styles.expField}
                  placeholder={t('checkout.cvv')}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  value={cvc}
                  onChangeText={(v) => setCvc(digitsOnly(v).slice(0, 4))}
                />
              </View>
              {cardStorageEnabled && (
                <View style={styles.saveCard}>
                  <Checkbox
                    testID="card-save"
                    checked={saveCard}
                    onChange={setSaveCard}
                    label={t(renewalCopy ? 'checkout.saveCardForRenewal' : 'checkout.saveCardPaytr')}
                  />
                  {renewalCopy ? (
                    <Text variant="caption" tone="muted">
                      {t(saveCard ? 'checkout.saveCardForRenewalHint' : 'checkout.saveCardForRenewalOffHint')}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Web `PaymentReady` ile aynı: hedefi olan HER ödemede (sipariş, sepet
          grubu, takas nakit farkı) kutu var; işaretlenmeden ödeme yok. */}
      <DistanceSalesConsent
        testID="payment-distance-sales-checkbox"
        checked={distanceSalesAccepted}
        onToggle={() => setDistanceSalesAccepted((v) => !v)}
        style={styles.consent}
      />

      <Button
        testID="card-submit"
        onPress={submit}
        isLoading={processing}
        disabled={loadingCards || !distanceSalesAccepted}
        fullWidth
        title={
          amount != null
            ? t('payment.payAmount', { amount: formatPriceNumber(amount) })
            : t('payment.payShort')
        }
        style={styles.payBtn}
      />

      {/* 3DS Vazgeç / bağlantı hatası sonrası gerçek durum doğrulanıyor (çift
          tahsilatı önlemek için 2 dakikaya kadar). Yalnız dönen düğme
          uygulamanın takıldığı izlenimini veriyordu — ne olduğunu söyle. */}
      {verifying && !threeDSHtml ? (
        <Text testID="payment-verifying-note" variant="caption" tone="muted" style={styles.verifyingNote}>
          {t('payment.confirmingTitle')} · {t('payment.verifyingDesc')}
        </Text>
      ) : null}

      <View style={styles.secure}>
        <Icon name="shield-check" size={14} color={colors.success[600]} />
        <Text variant="caption" tone="muted" style={styles.secureText}>
          {t('payment.cardSecureNotice')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing[4], gap: theme.spacing[3] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[1] },
  center: { paddingVertical: theme.spacing[8], alignItems: 'center' },
  list: { gap: theme.spacing[2.5] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2.5],
    padding: theme.spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200]!,
  },
  rowActive: { borderColor: colors.primary[500]!, backgroundColor: colors.primary[50]! },
  cardLabel: { flex: 1, fontWeight: '600' },
  cvvInline: { width: 80, marginBottom: theme.spacing[0] },
  newCard: { gap: theme.spacing[2.5], paddingTop: theme.spacing[1] },
  saveCard: { gap: theme.spacing[1.5] },
  expRow: { flexDirection: 'row', gap: theme.spacing[2.5] },
  expField: { flex: 1, marginBottom: theme.spacing[0] },
  consent: { marginTop: theme.spacing[2] },
  payBtn: { marginTop: theme.spacing[2] },
  verifyingNote: { marginTop: theme.spacing[2], textAlign: 'center' },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing[1.5], marginTop: theme.spacing[1] },
  secureText: { flexShrink: 1 },
  webviewWrap: { flex: 1, minHeight: 480, overflow: 'hidden' },
});
