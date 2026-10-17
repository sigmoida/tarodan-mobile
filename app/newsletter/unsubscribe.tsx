import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, SectionCard, theme, toast } from '@/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { guestApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { ContentPage } from '@/components/content/ContentPage';
import { DocText } from '@/components/content/DocBlocks';

/**
 * Bülten abonelik iptali — ContentPage + tek SectionCard (e-posta formu ya da başarı notu).
 * Durum ikonu kalktı. Token akışı (GET) ve e-posta akışı (POST) değişmedi.
 */
export default function NewsletterUnsubscribeScreen() {
  const { t } = useTranslation();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const [email, setEmail] = useState('');
  // Alan doğrulaması: satır içi (toast/diyalog değil).
  const [emailError, setEmailError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);

  const unsubscribeMutation = useAppMutation(
    async (data: { email?: string; token?: string }) => {
      // Web ile birebir: token akışı GET ?token=..., e-posta akışı POST { email }.
      if (data.token) {
        return guestApi.get('/newsletter/unsubscribe', { params: { token: data.token } });
      }
      return guestApi.post('/newsletter/unsubscribe', { email: data.email });
    },
    {
      error: t('marketing.newsletter.unsubscribeFailed'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSuccess: (res: any) => {
        // API 2xx döner ama gövdede success:false ile başarısız olabilir (geçersiz e-posta vb.).
        if (res?.data?.success === false) {
          toast.error(res.data.message || t('marketing.newsletter.unsubscribeFailed'));
          return;
        }
        setSuccess(true);
      },
    },
  );

  // Token ile gelindiyse otomatik iptal
  useEffect(() => {
    if (tokenParam && !success && !unsubscribeMutation.isPending) {
      unsubscribeMutation.mutate({ token: tokenParam });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam]);

  const handleSubmit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setEmailError(t('marketing.newsletter.emailInvalid'));
    setEmailError(undefined);
    unsubscribeMutation.mutate({ email: email.trim().toLowerCase() });
  };

  return (
    <ContentPage title={t('marketing.newsletter.unsubscribeHeaderTitle')}>
      {success ? (
        <SectionCard title={t('marketing.newsletter.unsubscribeSuccessTitle')}>
          <DocText>{t('marketing.newsletter.unsubscribeSuccess')}</DocText>
          <Button
            variant="primary"
            size="lg"
            title={t('auth.goToHome')}
            fullWidth
            onPress={() => router.replace('/')}
            style={{ marginTop: theme.spacing[4] }}
          />
        </SectionCard>
      ) : (
        <SectionCard title={t('marketing.newsletter.unsubscribeTitle')} bodyStyle={{ gap: theme.spacing[2] }}>
          <DocText small tone="muted">
            {t('marketing.newsletter.unsubscribeReasonSubtitle')}
          </DocText>

          <Input
            label={`${t('marketing.newsletter.emailLabel')} *`}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError(undefined);
            }}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={{ marginTop: theme.spacing[4] }}
          />

          <Button
            variant="danger"
            size="lg"
            title={t('marketing.newsletter.unsubscribeButton')}
            fullWidth
            onPress={handleSubmit}
            isLoading={unsubscribeMutation.isPending}
            disabled={unsubscribeMutation.isPending || !email}
          />

          <Button variant="ghost" title={t('seller.cancel')} fullWidth onPress={() => router.back()} />
        </SectionCard>
      )}
    </ContentPage>
  );
}
