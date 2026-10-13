import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Button, HStack, SectionCard, Text } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { useEmailChangeFlow } from '../_hooks/useEmailChangeFlow';
import { styles, ACTION_GAP } from '../_lib/styles';

/**
 * E-posta — mevcut adres + doğrulama durumu; "Değiştir" aynı kartta satır içi
 * adımları açar (yeni e-posta → kod gönder → 6 haneli kod → doğrula). Modal yok;
 * hatalar alanın altında. Alt çubuktaki profil "Kaydet"inden bağımsızdır.
 */
export function EmailSection() {
  const { t } = useTranslation();
  const f = useEmailChangeFlow();

  return (
    <SectionCard
      title={t('auth.email')}
      testID="edit-profile-email-section"
      action={
        f.phase === 'idle' ? (
          <Button
            variant="link"
            size="sm"
            title={t('profile.change')}
            onPress={f.start}
            testID="edit-profile-email-change-toggle"
          />
        ) : undefined
      }
    >
      <View style={styles.sectionBody}>
        {f.phase === 'idle' && (
          <HStack gap={ACTION_GAP} align="center" wrap>
            <Text variant="body" testID="edit-profile-email-current">
              {f.email}
            </Text>
            <Badge size="sm" variant={f.isEmailVerified ? 'success' : 'warning'}>
              {f.isEmailVerified ? t('security.verified') : t('auth.unverifiedTitle')}
            </Badge>
          </HStack>
        )}

        {f.phase === 'entering' && (
          <Form form={f.emailForm}>
            <Text variant="bodySm" tone="muted">
              {t('profile.emailChangeIntro')}
            </Text>
            <FormInput
              name="newEmail"
              accessibilityLabel={t('profile.newEmail')}
              placeholder={t('profile.newEmailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-change-input"
            />
            <HStack gap={ACTION_GAP} align="center" wrap>
              <Button
                variant="outline"
                title={t('profile.sendCode')}
                onPress={f.submitEmail}
                isLoading={f.isRequesting}
                testID="email-change-request"
              />
              <Button
                variant="link"
                title={t('profile.giveUp')}
                onPress={f.cancel}
                testID="email-change-cancel"
              />
            </HStack>
          </Form>
        )}

        {f.phase === 'codeSent' && (
          <Form form={f.codeForm}>
            <Text variant="bodySm" tone="muted">
              {t('checkout.otpSentToEmail', { email: f.pendingEmail })}
            </Text>
            <FormInput
              name="code"
              accessibilityLabel={t('profile.verificationCode')}
              placeholder="123456"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={6}
              transform={(text) => text.replace(/\D/g, '')}
              testID="email-change-code"
            />
            <HStack gap={ACTION_GAP} align="center" wrap>
              <Button
                variant="outline"
                title={t('profile.verify')}
                onPress={f.submitCode}
                isLoading={f.isVerifying}
                testID="email-change-verify"
              />
              <Button
                variant="link"
                title={
                  f.resendIn > 0
                    ? t('checkout.resendCodeWithTimer', { seconds: f.resendIn })
                    : t('checkout.resendCode')
                }
                onPress={f.resend}
                disabled={f.resendIn > 0 || f.isRequesting}
                testID="email-change-resend"
              />
            </HStack>
            <HStack gap={ACTION_GAP} align="center" wrap>
              <Button
                variant="link"
                title={t('profile.fixEmail')}
                onPress={f.fixEmail}
                testID="email-change-fix"
              />
              <Button
                variant="link"
                title={t('profile.giveUp')}
                onPress={f.cancel}
                testID="email-change-cancel"
              />
            </HStack>
          </Form>
        )}
      </View>
    </SectionCard>
  );
}
