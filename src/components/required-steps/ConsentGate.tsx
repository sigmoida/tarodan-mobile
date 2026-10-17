import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Checkbox, Text } from '@/ui';
import { useZodForm } from '@/ui/form';
import { errorText } from '@/lib/api';
import {
  CONSENT_DOCUMENT_I18N_KEYS,
  consentCheckKey,
  legalRouteFor,
} from '@/lib/shared/legalConsent';
import type { PendingConsentsController } from '@/hooks/usePendingConsents';
import { useDoAcceptConsents } from '@/hooks/useDoAcceptConsents';
import { consentGateSchema } from './consentGateSchema';
import { useAuthStore } from '@/stores/authStore';
import { RequiredStepShell, useRequiredStepVisible } from './RequiredStepShell';

/**
 * Yeniden-onay ekranı (web `ConsentGate`) — onayı olmayan ya da onayladığı
 * belgenin sürümü değişen üye, uygulamayı kullanmaya devam etmeden önce
 * zorunlu belgeleri (kullanım şartları, gizlilik, KVKK) onaylar. Her belge
 * ayrı kutu; gönder ancak hepsi işaretliyken açılır. Belge adı metni açar
 * (kapı o sayfada gizlenir, geri dönünce yeniden görünür). Tek çıkış:
 * onaylamak ya da oturumu kapatmak.
 */
export function ConsentGate({
  pending,
  onLogout,
}: Pick<PendingConsentsController, 'pending'> & {
  onLogout: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const accept = useDoAcceptConsents();
  const visible = useRequiredStepVisible();
  const userId = useAuthStore((s) => s.user?.id);
  // Eski gönderim hatası görünür kalmasın: kapı her (yeniden) açıldığında ve
  // oturum değiştiğinde mutasyon state'i sıfırlanır. Hata satır içi
  // gösterilir, `appAlert` yok (kapı tam ekran; iOS ModalFreeze).
  const { reset: resetAccept } = accept;
  useEffect(() => {
    if (visible) resetAccept();
  }, [visible, userId, resetAccept]);
  const schema = useMemo(() => consentGateSchema(pending), [pending]);
  const form = useZodForm(schema, { defaultValues: { accepted: [] } });
  const accepted = form.watch('accepted');
  const [loggingOut, setLoggingOut] = useState(false);

  // İşaret belge + SÜRÜM anahtarıyla tutulur: kapı açıkken gelen yeni sürüm
  // (ön plana dönüş) eski işareti devralmaz. Listede artık olmayan anahtarlar
  // da ayıklanır.
  const keys = pending.map(consentCheckKey).join('|');
  useEffect(() => {
    const current = keys.split('|');
    const kept = form.getValues('accepted').filter((k) => current.includes(k));
    form.setValue('accepted', kept);
  }, [keys, form]);

  const toggle = (key: string, on: boolean) =>
    form.setValue(
      'accepted',
      on ? [...accepted.filter((k) => k !== key), key] : accepted.filter((k) => k !== key),
    );

  const updated = pending.some((p) => p.reason === 'outdated');
  const busy = accept.isPending || loggingOut;
  // Gönder düğmesi şemadan beslenir: "hepsi işaretli" kuralı tek yerde.
  const canSubmit = schema.safeParse({ accepted }).success;

  const submit = form.handleSubmit(() =>
    accept.mutate(
      pending.map((p) => p.document),
      // Kapı yeniden açılırsa (yeni sürüm) kutular boş başlasın.
      { onSuccess: () => form.reset({ accepted: [] }) },
    ),
  );

  const logout = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <RequiredStepShell
      testID="consent-gate"
      icon="document-text"
      title={t('legal.consentGate.title')}
      intro={updated ? t('legal.consentGate.updatedIntro') : t('legal.consentGate.intro')}
      error={accept.isError ? errorText(accept.error, t('legal.consentGate.submitFailed')) : null}
      primary={{
        label: t('legal.consentGate.submit'),
        onPress: () => void submit(),
        disabled: !canSubmit || loggingOut,
        isLoading: accept.isPending,
        testID: 'consent-gate-submit',
      }}
      secondary={{
        label: t('common.logout'),
        onPress: () => void logout(),
        disabled: busy,
        testID: 'consent-gate-logout',
      }}
    >
      {pending.map((p) => {
        const name = t(CONSENT_DOCUMENT_I18N_KEYS[p.document]);
        const route = legalRouteFor(p.path);
        const key = consentCheckKey(p);
        return (
          <Checkbox
            key={key}
            testID={`consent-gate-${p.document}`}
            checked={accepted.includes(key)}
            onChange={(on) => toggle(key, on)}
            disabled={busy}
            label={
              <>
                {route ? (
                  <Text
                    variant="body"
                    tone="primary"
                    weight="semibold"
                    style={styles.link}
                    onPress={() => router.push(route)}
                    accessibilityRole="link"
                  >
                    {name}
                  </Text>
                ) : (
                  <Text variant="body" weight="semibold">
                    {name}
                  </Text>
                )}
                {t('legal.consentGate.acceptSuffix')}
              </>
            }
          />
        );
      })}
    </RequiredStepShell>
  );
}

const styles = StyleSheet.create({
  link: { textDecorationLine: 'underline' },
});
