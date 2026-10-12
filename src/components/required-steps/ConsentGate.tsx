import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Checkbox, Text } from '@/ui';
import { errorText } from '@/lib/api';
import {
  CONSENT_DOCUMENT_I18N_KEYS,
  canSubmitConsents,
  legalRouteFor,
  type ConsentDocumentKey,
} from '@/lib/shared/legalConsent';
import type { PendingConsentsController } from '@/hooks/usePendingConsents';
import { RequiredStepShell } from './RequiredStepShell';

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
  accept,
  onLogout,
}: Pick<PendingConsentsController, 'pending' | 'accept'> & {
  onLogout: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState<Set<ConsentDocumentKey>>(new Set());
  const [loggingOut, setLoggingOut] = useState(false);

  const toggle = (document: ConsentDocumentKey, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(document);
      else next.delete(document);
      return next;
    });

  const updated = pending.some((p) => p.reason === 'outdated');
  const busy = accept.isPending || loggingOut;

  const submit = () =>
    accept.mutate(
      pending.map((p) => p.document),
      // Kapı yeniden açılırsa (yeni sürüm) kutular boş başlasın.
      { onSuccess: () => setChecked(new Set()) },
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
      icon="document-text-outline"
      title={t('legal.consentGate.title')}
      intro={updated ? t('legal.consentGate.updatedIntro') : t('legal.consentGate.intro')}
      error={accept.isError ? errorText(accept.error, t('legal.consentGate.submitFailed')) : null}
      primary={{
        label: t('legal.consentGate.submit'),
        onPress: submit,
        disabled: !canSubmitConsents(pending, checked) || loggingOut,
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
        return (
          <Checkbox
            key={p.document}
            testID={`consent-gate-${p.document}`}
            checked={checked.has(p.document)}
            onChange={(on) => toggle(p.document, on)}
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
