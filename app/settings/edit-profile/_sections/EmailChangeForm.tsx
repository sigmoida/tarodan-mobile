import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Button, HStack, SectionCard, Text } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { useSecondsUntil } from '@/hooks/useSecondsUntil';
import type { EmailChangeFlow } from '../_hooks/useEmailChangeFlow';
import { styles, ACTION_GAP } from '../_lib/styles';

/**
 * E-posta değişikliği ekranının gövdesi: mevcut adres + doğrulama durumu, sonra adım kartı
 * (yeni e-posta → 6 haneli kod). Birincil eylem ("Kod gönder" / "Doğrula") ekranın alt
 * çubuğunda; "Tekrar gönder" / "E-postayı düzelt" kod kartında metin düğmesi.
 */
export function EmailChangeForm({ f }: { f: EmailChangeFlow }) {
  const { t } = useTranslation();

  return (
    <>
      <SectionCard title={t('auth.email')} testID="email-change-current">
        <HStack gap={ACTION_GAP} align="center" wrap>
          <Text variant="body" testID="edit-profile-email-current">
            {f.email}
          </Text>
          <Badge size="sm" variant={f.isEmailVerified ? 'success' : 'warning'}>
            {f.isEmailVerified ? t('security.verified') : t('auth.unverifiedTitle')}
          </Badge>
        </HStack>
      </SectionCard>

      {f.phase === 'entering' ? (
        // `key`: adımlar aynı ağaç biçiminde — anahtarsız React alanı yeniden kullanır ve Controller
        // yeni form/ad'a bağlanmaz. Her adım kendi kartıyla yeniden bağlanır.
        <SectionCard key="email-step" title={t('profile.newEmail')}>
          <Form form={f.emailForm}>
            <View style={styles.sectionBody}>
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
                autoFocus
                returnKeyType="send"
                onSubmitEditing={f.submitEmail}
                testID="email-change-input"
              />
            </View>
          </Form>
        </SectionCard>
      ) : (
        <SectionCard key="code-step" title={t('profile.verificationCode')}>
          <Form form={f.codeForm}>
            <View style={styles.sectionBody}>
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
              <HStack justify="space-between" align="center" wrap>
                <EmailResendButton resendAt={f.resendAt} isRequesting={f.isRequesting} onPress={f.resend} />
                <Button
                  variant="link"
                  title={t('profile.fixEmail')}
                  onPress={f.fixEmail}
                  testID="email-change-fix"
                />
              </HStack>
            </View>
          </Form>
        </SectionCard>
      )}
    </>
  );
}

/** "Tekrar gönder" + saniyelik geri sayım — tik YALNIZ bu düğmeyi yeniden çizer. */
function EmailResendButton({
  resendAt,
  isRequesting,
  onPress,
}: {
  resendAt: number;
  isRequesting: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const resendIn = useSecondsUntil(resendAt);
  return (
    <Button
      variant="link"
      title={resendIn > 0 ? t('checkout.resendCodeWithTimer', { seconds: resendIn }) : t('checkout.resendCode')}
      onPress={onPress}
      disabled={resendIn > 0 || isRequesting}
      testID="email-change-resend"
    />
  );
}
