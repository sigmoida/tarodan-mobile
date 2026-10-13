import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Input, SectionCard, theme } from '@/ui';
import { router } from 'expo-router';
import { guestApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { ContentPage } from '@/components/content/ContentPage';
import { DocLink } from '@/components/content/DocBlocks';

/**
 * Bülten aboneliği — web `(corporate)/newsletter` düzeni: sayfa açıklaması + tek SectionCard
 * (e-posta, açık rıza, abone ol) + abonelik iptali bağlantısı. Büyük zarf ikonu kalktı; başarı
 * mesajı toast. Rıza kapısı ve istek gövdesi değişmedi.
 */
export default function NewsletterScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  // Alan doğrulaması: satır içi (toast/diyalog değil).
  const [emailError, setEmailError] = useState<string | undefined>();
  /**
   * KVKK/ETK açık rızası — İŞARETSİZ başlar ve abonelik kapısıdır.
   *
   * Sunucuya güvenilemez: 2026-08-11 ölçümünde `/newsletter/subscribe` yalnız
   * `email` istiyor ve `newsletter: false` ile bile başarı dönüyor. Yani
   * "ikisi de false → 400" kuralı staging'de YOK; kapı tamamen burada.
   */
  const [consent, setConsent] = useState(false);

  const subscribeMutation = useAppMutation(
    async () => {
      // Web paritesi (newsletter/page.tsx): NewsletterSubscribeDto yalnızca email/newsletter
      // kabul eder; backend 'name' alanını desteklemez (whitelist ile sessizce strip edilir).
      return guestApi.post('/newsletter/subscribe', {
        email: email.trim().toLowerCase(),
        // Kullanıcının verdiği rıza — sabit `true` değil.
        newsletter: consent,
      });
    },
    {
      success: t('marketing.newsletter.successMessage'),
      error: t('marketing.newsletter.subscriptionFailed'),
      onSuccess: () => {
        setEmail('');
        setConsent(false);
        router.back();
      },
    },
  );

  const handleSubmit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setEmailError(t('marketing.newsletter.emailInvalid'));
    setEmailError(undefined);
    subscribeMutation.mutate();
  };

  return (
    <ContentPage title={t('mobile.settingsNewsletter')} description={t('marketing.newsletter.subtitle')}>
      <SectionCard title={t('marketing.newsletter.title')} bodyStyle={{ gap: theme.spacing[2] }}>
        <Input
          testID="newsletter-email"
          label={`${t('marketing.newsletter.emailLabel')} *`}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailError(undefined);
          }}
          error={emailError}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Açık rıza — işaretsiz başlar, abone olmanın kapısıdır. */}
        <Checkbox
          testID="newsletter-consent"
          checked={consent}
          onChange={setConsent}
          label={t('marketing.newsletter.consentText')}
        />
        <DocLink label={t('mobile.pagePrivacy')} onPress={() => router.push('/privacy' as never)} />

        <Button
          testID="newsletter-submit"
          variant="primary"
          size="lg"
          fullWidth
          title={t('marketing.newsletter.subscribeButton')}
          onPress={handleSubmit}
          isLoading={subscribeMutation.isPending}
          disabled={subscribeMutation.isPending || !email || !consent}
          style={{ marginTop: theme.spacing[4] }}
        />
      </SectionCard>

      <Button
        variant="ghost"
        title={t('marketing.newsletter.cancelLinkText')}
        onPress={() => router.push('/newsletter/unsubscribe' as never)}
      />
    </ContentPage>
  );
}
