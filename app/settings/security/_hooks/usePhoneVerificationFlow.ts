import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useZodForm } from '@/ui/form';
import { useAuthStore } from '@/stores/authStore';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { getPhoneInvalidMessage, parsePhoneForPayload, splitPhone } from '@/utils/phone';
import { phoneSchema, sixDigitCodeSchema } from '../_lib/schema';
import { useDoSendPhoneCode } from './useDoSendPhoneCode';
import { useDoVerifyPhone } from './useDoVerifyPhone';

/** API'nin yeniden gönderim bekleme süresi (sn). */
export const RESEND_SECONDS = 60;

export type PhoneStep = 'enter' | 'verify';

/**
 * Telefon doğrulama ekranının controller'ı: 2 adım (numara → kod), yeniden gönder geri sayımı,
 * `?verifyPhone=` ile otomatik gönderim ve Android geri tuşu (kod adımında numaraya döner).
 *
 * B-1.7 — profilde yeni numara kaydedildi (`?verifyPhone=+90…`): web'deki gibi kaydetmek ve
 * kanıtlamak tek hareket — ekran o numarayla açılır ve kod hemen gönderilir. Ref, aynı açılışta
 * ikinci SMS'i (60 sn bekleme) önler.
 */
export function usePhoneVerificationFlow() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { verifyPhone } = useLocalSearchParams<{ verifyPhone?: string }>();

  const [step, setStep] = useState<PhoneStep>('enter');
  const [sentTo, setSentTo] = useState('');
  const [resendIn, setResendIn] = useState(0);

  // Kayıtlı numara E.164 saklanıyor; alan lokal parçayı istiyor ("+90" tekrar yazılmasın).
  const seed = useMemo(() => splitPhone(verifyPhone ?? user?.phone ?? ''), [verifyPhone, user?.phone]);
  const phoneForm = useZodForm(useMemo(() => phoneSchema(), []), {
    defaultValues: { phone: seed.phone },
  });
  const codeForm = useZodForm(
    useMemo(() => sixDigitCodeSchema(t), [t]),
    { defaultValues: { code: '' } },
  );
  const send = useDoSendPhoneCode();
  const verify = useDoVerifyPhone();

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const sendTo = useCallback(
    (e164: string) =>
      send.mutate(e164, {
        onSuccess: () => {
          setSentTo(e164);
          setStep('verify');
          setResendIn(RESEND_SECONDS);
          codeForm.reset({ code: '' });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [send.mutate],
  );

  const autoSentFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !verifyPhone || autoSentFor.current === verifyPhone) return;
    autoSentFor.current = verifyPhone;
    const e164 = parsePhoneForPayload(seed.phone, seed.countryCode);
    // Çözülemeyen parametre sessizce yutulmasın: alanın altında sebebi görünsün; kullanıcı
    // numarayı düzeltip gönderebilir.
    if (!e164) {
      phoneForm.setError('phone', { message: getPhoneInvalidMessage() });
      return;
    }
    sendTo(e164);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, verifyPhone]);

  const backToEnter = useCallback(() => {
    setStep('enter');
    codeForm.reset({ code: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kod adımında Android geri tuşu ekrandan çıkmaz, numara adımına döner (üst bardaki ok ile aynı).
  useFocusEffect(
    useCallback(() => {
      if (step !== 'verify') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        backToEnter();
        return true;
      });
      return () => sub.remove();
    }, [step, backToEnter]),
  );

  const phone = phoneForm.watch('phone') ?? '';
  const code = codeForm.watch('code') ?? '';

  return {
    step,
    sentTo,
    resendIn,
    phoneForm,
    codeForm,
    isSending: send.isPending,
    isVerifying: verify.isPending,
    canSend: phone.trim().length > 0 && !send.isPending,
    canVerify: code.length === 6 && !verify.isPending,
    submitPhone: phoneForm.handleSubmit(({ phone: e164 }) => sendTo(e164)),
    submitCode: codeForm.handleSubmit(({ code: value }) =>
      verify.mutate(value, { onSuccess: () => goBackOrHome() }),
    ),
    resend: () => {
      if (sentTo && resendIn <= 0 && !send.isPending) sendTo(sentTo);
    },
    onBack: step === 'verify' ? backToEnter : goBackOrHome,
  };
}

export type PhoneVerificationFlow = ReturnType<typeof usePhoneVerificationFlow>;
