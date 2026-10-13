import { useMemo, useState } from 'react';
import { Clipboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useZodForm } from '@/ui/form';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { sixDigitCodeSchema } from '../_lib/schema';
import type { ShownBackupCodes, TwoFactorSetup } from '../_lib/types';
import { useTwoFactorStatus } from './useTwoFactorStatus';
import { useDoStartTwoFactor } from './useDoStartTwoFactor';
import { useDoVerifyTwoFactor } from './useDoVerifyTwoFactor';
import { useBackupCodesLeaveGuard } from './useBackupCodesLeaveGuard';

/** Ekranın o anki görünümü — gövde ve alt çubuk buna göre seçilir. */
export type TwoFactorView = 'intro' | 'setup' | 'codes' | 'enabled';

export type TwoFactorDialog = 'disable' | 'regenerate' | null;

/**
 * 2FA ekranının controller'ı (web `use2FA` + sayfa durumu): kurulum verisi (QR + gizli anahtar,
 * kullanıcı Authenticator'a geçip döndüğünde de ekranda kalır), doğrulama kodu formu, gösterilen
 * yedek kodlar ve iki diyalog (kapat / yedek kod yenile) için yalnız aç-kapa durumu — diyaloglar
 * kendi form + mutation'larını taşır.
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
  const code = codeForm.watch('code') ?? '';

  const view: TwoFactorView = shownCodes
    ? 'codes'
    : setup
      ? 'setup'
      : status.isEnabled
        ? 'enabled'
        : 'intro';

  // Tek seferlik kodlar ekrandayken geri/kaydırma çıkışı onaya bağlı.
  const leaveGuard = useBackupCodesLeaveGuard(view === 'codes');

  const copy = (text: string) => {
    Clipboard.setString(text);
    toast.success(t('common.copiedShort'));
  };

  return {
    view,
    isEnabled: status.isEnabled,
    isLoading: status.isLoading && !setup && !shownCodes,
    setup,
    shownCodes,
    codeForm,
    // Kurulum
    isStarting: start.isPending,
    startSetup: () =>
      start.mutate(undefined, {
        onSuccess: (data) => {
          codeForm.reset({ code: '' });
          setSetup(data);
        },
      }),
    cancelSetup: () => setSetup(null),
    isVerifying: verify.isPending,
    canVerify: code.length === 6 && !verify.isPending,
    submitVerify: codeForm.handleSubmit(({ code: value }) => {
      const fallback = setup?.backupCodes ?? [];
      verify.mutate(value, {
        onSuccess: (codes) => {
          setSetup(null);
          const list = codes.length ? codes : fallback;
          // Gösterilecek kod yoksa (sunucu döndürmedi) bekletecek bir şey yok: geri dön.
          if (list.length) setShownCodes({ codes: list, source: 'setup' });
          else goBackOrHome();
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
        leaveGuard.allowLeave();
        goBackOrHome();
      }
    },
    // Diyaloglar (yalnız aç/kapa)
    dialog,
    openDialog: (d: Exclude<TwoFactorDialog, null>) => setDialog(d),
    closeDialog: () => setDialog(null),
  };
}

export type TwoFactorFlow = ReturnType<typeof useTwoFactorFlow>;
