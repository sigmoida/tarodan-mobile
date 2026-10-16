import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { copySensitiveToClipboard, SENSITIVE_CLIPBOARD_TTL_MS } from '@/lib/clipboard';
import { useZodForm } from '@/ui/form';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { apiErrorMessage } from '@/lib/api/errorText';
import { sixDigitCodeSchema } from '../_lib/schema';
import type { ShownBackupCodes, TwoFactorSetup } from '../_lib/types';
import { useTwoFactorStatus } from './useTwoFactorStatus';
import { useDoStartTwoFactor } from './useDoStartTwoFactor';
import { useDoVerifyTwoFactor } from './useDoVerifyTwoFactor';
import { useBackupCodesLeaveGuard } from './useBackupCodesLeaveGuard';

/** Ekranın o anki görünümü — gövde ve alt çubuk buna göre seçilir. */
export type TwoFactorView = 'setup' | 'codes' | 'enabled';

export type TwoFactorDialog = 'disable' | 'regenerate' | null;

/**
 * 2FA ekranının controller'ı (web `use2FA` + sayfa durumu).
 *
 * 2FA kapalıyken ara "Kurulumu başlat" adımı YOK: durum ilk kez "kapalı" geldiğinde `enable`
 * ekran başına BİR kez kendiliğinden çağrılır, QR + gizli anahtar + kod alanı doğrudan çıkar.
 * `enable` her çağrıda sunucudaki gizli anahtarı/yedek kodları yeniden üretebildiği için çift
 * çağrı (çift dokunma, StrictMode efekti, durum yeniden çekimi) kullanıcının Authenticator'a
 * eklediği anahtarı geçersiz kılar — `startLock` ref'i aynı anda tek istek, `autoStarted` ref'i
 * ekran başına tek otomatik başlatma garanti eder. Hata → `ErrorState` + yeniden dene.
 *
 * Doğrulama hatası (yanlış kod) toast değil, kod alanının altında (`setError`) gösterilir.
 */
export function useTwoFactorFlow() {
  const { t } = useTranslation();
  const status = useTwoFactorStatus();
  const start = useDoStartTwoFactor();
  const verify = useDoVerifyTwoFactor();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [shownCodes, setShownCodes] = useState<ShownBackupCodes | null>(null);
  const [dialog, setDialog] = useState<TwoFactorDialog>(null);
  const codeForm = useZodForm(
    useMemo(() => sixDigitCodeSchema(t), [t]),
    { defaultValues: { code: '' } },
  );

  const view: TwoFactorView = shownCodes
    ? 'codes'
    : setup || !status.isEnabled
      ? 'setup'
      : 'enabled';

  // Tek seferlik kodlar ekrandayken geri/kaydırma çıkışı onaya bağlı.
  const leaveGuard = useBackupCodesLeaveGuard(view === 'codes');

  // Aynı anda tek `enable` (ref: state güncellemesi gelmeden ikinci dokunuş da engellenir).
  const startLock = useRef(false);
  const startMutate = start.mutate;
  const resetForm = codeForm.reset;
  const startSetup = useCallback(() => {
    if (startLock.current) return;
    startLock.current = true;
    startMutate(undefined, {
      onSuccess: (data) => {
        resetForm({ code: '' });
        setSetup(data);
      },
      onSettled: () => {
        startLock.current = false;
      },
    });
  }, [startMutate, resetForm]);

  // İlk çözülen durum "kapalı" ise kurulum kendiliğinden başlar — ekran başına bir kez. 2FA
  // ekranda kapatılırsa (durum sonradan "kapalı" olur) yeniden başlatılmaz; ekran zaten kapanır.
  // Durum ALINAMADIYSA (`isError`, "kapalı" yalnız varsayım) otomatik `enable` yok: 2FA aslında
  // açıksa kurulum çağrısı gizli anahtarı yeniden üretebilirdi. Hata ekranı + yeniden dene durumu
  // tekrar sorar; durum gelince bu effect kurulumu (gerekirse) başlatır.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || status.isLoading || status.isError) return;
    autoStarted.current = true;
    if (!status.isEnabled) startSetup();
  }, [status.isLoading, status.isError, status.isEnabled, startSetup]);

  const waitingForSetup = view === 'setup' && !setup;
  const statusFailed = waitingForSetup && status.isError;
  const startFailed = waitingForSetup && (start.isError || statusFailed);
  const refetchStatus = status.refetch;
  const retrySetup = useCallback(() => {
    if (statusFailed) void refetchStatus();
    else startSetup();
  }, [statusFailed, refetchStatus, startSetup]);

  // Gizli anahtar / yedek kodlar panoda kısa süre kalır; kullanıcı süreyi bilsin.
  const copy = (text: string) => {
    if (!copySensitiveToClipboard(text)) return;
    toast.success(
      t('profile.twoFactor.copiedClipboardClears', { seconds: SENSITIVE_CLIPBOARD_TTL_MS / 1000 }),
    );
  };

  return {
    view,
    isEnabled: status.isEnabled,
    isLoading: (status.isLoading && !setup && !shownCodes) || (waitingForSetup && !startFailed),
    setup,
    shownCodes,
    codeForm,
    // Kurulum
    /** `enable` başarısız: ekran ErrorState gösterir (mesaj sunucudan, yoksa katalog). */
    startError: startFailed
      ? statusFailed
        ? t('profile.twoFactor.setupFailed')
        : apiErrorMessage(start.error, t('profile.twoFactor.setupFailed'))
      : null,
    retrySetup,
    isVerifying: verify.isPending,
    submitVerify: codeForm.handleSubmit(({ code: value }) => {
      if (verify.isPending) return;
      const fallback = setup?.backupCodes ?? [];
      verify.mutate(value, {
        onSuccess: (codes) => {
          setSetup(null);
          // Doğrulama yanıtı yedek kod taşımaz → SON `enable` yanıtındakiler (sunucu her enable'da
          // yeniden üretir; ekranda tutulan kurulum her zaman son yanıttır).
          const list = codes.length ? codes : fallback;
          // Gösterilecek kod yoksa (sunucu döndürmedi) bekletecek bir şey yok: geri dön.
          if (list.length) setShownCodes({ codes: list, source: 'setup' });
          else goBackOrHome();
        },
        onError: (e) => {
          codeForm.setError('code', {
            type: 'server',
            message: apiErrorMessage(e, t('profile.twoFactor.verifyFailed')),
          });
        },
      });
    }),
    copySecret: () => setup?.secret && copy(setup.secret),
    // Yedek kodlar
    copyCodes: () => shownCodes && copy(shownCodes.codes.join('\n')),
    showRegeneratedCodes: (codes: string[]) => {
      if (codes.length) setShownCodes({ codes, source: 'regenerate' });
    },
    /** "Tamam, kaydettim": kurulum sonrası ekran kapanır, yenileme sonrası yönetimde kalınır. */
    ackCodes: () => {
      const source = shownCodes?.source;
      setShownCodes(null);
      if (source === 'setup') {
        leaveGuard.leave(goBackOrHome);
      }
    },
    /** 2FA kapatıldı: ekranda gösterilecek bir şey kalmadı → güvenlik ekranına dön. */
    onDisabled: () => goBackOrHome(),
    // Diyaloglar (yalnız aç/kapa)
    dialog,
    openDialog: (d: Exclude<TwoFactorDialog, null>) => setDialog(d),
    closeDialog: () => setDialog(null),
  };
}

export type TwoFactorFlow = ReturnType<typeof useTwoFactorFlow>;
