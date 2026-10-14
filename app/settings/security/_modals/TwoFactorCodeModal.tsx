import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, ModalFooter, Text } from '@/ui';
import { Form, FormInput, useZodForm } from '@/ui/form';
import { sixDigitCodeSchema, toSixDigits } from '../_lib/schema';
import { styles } from '../_lib/styles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Kod alanının üstündeki açıklama. */
  hint: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Yıkıcı işlemde kırmızı uyarı kutusu (web `disableWarning` Alert'i). */
  warning?: { title: string; body: string };
  /** Geçerli kodla çağrılır — modal ZATEN kapanmıştır (§12: kapat → mutate). */
  onSubmit: (code: string) => void;
  testID?: string;
}

/**
 * Tek alanlı TOTP kod diyaloğu (2FA kapat / yedek kod yenile). Kendi `useZodForm`'unu taşır;
 * doğrulama satır içi, geçerli kodda ÖNCE kapanır sonra `onSubmit` (mutation sahibi modal
 * sarmalayıcısı) — açık Modal üstünde toast/alert yok.
 */
export function TwoFactorCodeModal({
  isOpen,
  onClose,
  title,
  hint,
  confirmLabel,
  destructive = false,
  warning,
  onSubmit,
  testID,
}: Props) {
  const { t } = useTranslation();
  const form = useZodForm(useMemo(() => sixDigitCodeSchema(t), [t]), {
    defaultValues: { code: '' },
  });

  // Her açılışta boş başla.
  useEffect(() => {
    if (isOpen) form.reset({ code: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const submit = form.handleSubmit(({ code }) => {
    onClose();
    onSubmit(code);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={submit}
          cancelLabel={t('common.cancel')}
          confirmLabel={confirmLabel}
          destructive={destructive}
          confirmTestID={testID ? `${testID}-confirm` : undefined}
        />
      }
    >
      <Text variant="bodySm" tone="muted" style={styles.modalHint}>
        {hint}
      </Text>
      {warning ? (
        <Alert variant="danger" title={warning.title} style={styles.modalHint}>
          {warning.body}
        </Alert>
      ) : null}
      <Form form={form}>
        <FormInput
          name="code"
          label={t('security.verificationCode')}
          placeholder={t('profile.twoFactor.sixDigitPlaceholder')}
          keyboardType="number-pad"
          maxLength={6}
          transform={toSixDigits}
          // TOTP (Authenticator) kodu — SMS değil: iOS "Mesajlar'dan" / Android SMS önerisi kapalı.
          autoComplete="off"
          textContentType="none"
          autoFocus
          testID={testID ? `${testID}-input` : undefined}
        />
      </Form>
    </Modal>
  );
}
