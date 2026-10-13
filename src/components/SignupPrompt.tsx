import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { theme, Text, Button, Icon, BottomSheet, ButtonRow, useBottomSheet } from '@/ui';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

const { colors, spacing, iconSize } = theme;

interface SignupPromptProps {
  visible: boolean;
  onDismiss: () => void;
  type: 'favorites' | 'message' | 'purchase' | 'trade' | 'collections';
}

// Modül düzeyinde sabitlenirse i18next hazır olmadan çözülür ve ilk yüklenen
// dile donar — bu yüzden factory: bileşen `useMemo(() => buildPromptConfig(t), [t])`
// ile çağırır.
const buildPromptConfig = (t: TFunction) => ({
  favorites: {
    icon: 'heart' as const,
    title: t('product.addToFavorites'),
    description: t('signupPrompt.favoritesDescription'),
    primaryButton: t('common.register'),
    primaryAction: () => router.push('/(auth)/register'),
    benefits: [
      t('signupPrompt.favoritesBenefit1'),
      t('signupPrompt.favoritesBenefit2'),
      t('signupPrompt.favoritesBenefit3'),
    ],
  },
  message: {
    icon: 'chat-bubble-left-ellipsis' as const,
    title: t('signupPrompt.messageTitle'),
    description: t('signupPrompt.messageDescription'),
    primaryButton: t('common.login'),
    primaryAction: () => router.push('/(auth)/login'),
    benefits: [
      t('signupPrompt.messageBenefit1'),
      t('signupPrompt.messageBenefit2'),
      t('signupPrompt.messageBenefit3'),
    ],
  },
  purchase: {
    icon: 'check-circle' as const,
    title: t('signupPrompt.purchaseTitle'),
    description: t('signupPrompt.purchaseDescription'),
    primaryButton: t('common.register'),
    primaryAction: () => router.push('/(auth)/register'),
    benefits: [
      t('signupPrompt.purchaseBenefit1'),
      t('signupPrompt.purchaseBenefit2'),
      t('signupPrompt.purchaseBenefit3'),
    ],
  },
  trade: {
    icon: 'arrows-right-left' as const,
    title: t('trade.featureTitle'),
    description: CAN_BUY_DIGITAL
      ? t('signupPrompt.tradeDescription')
      : t('membership.featureUnavailableOnAccount'),
    primaryButton: CAN_BUY_DIGITAL ? t('mobile.guestGoPremium') : t('common.register'),
    primaryAction: () => router.push('/(auth)/register'),
    benefits: [
      t('signupPrompt.tradeBenefit1'),
      t('signupPrompt.tradeBenefit2'),
      t('signupPrompt.tradeBenefit3'),
    ],
  },
  collections: {
    icon: 'rectangle-stack' as const,
    title: t('mobile.guestGarageTitle'),
    description: CAN_BUY_DIGITAL
      ? t('signupPrompt.collectionsDescription')
      : t('membership.featureUnavailableOnAccount'),
    primaryButton: CAN_BUY_DIGITAL ? t('mobile.guestGoPremium') : t('common.register'),
    primaryAction: () => router.push('/(auth)/register'),
    benefits: [
      t('signupPrompt.collectionsBenefit1'),
      t('signupPrompt.collectionsBenefit2'),
      t('signupPrompt.collectionsBenefit3'),
    ],
  },
});

/**
 * Misafir tanıtımı — `BottomSheet size="fit"`: gövdede ikon + başlık + açıklama + faydalar,
 * sabit footer'da iki düğme (ana eylem + "Şimdilik geç"). Ana eylem / giriş yönlendirmesi sheet
 * TAMAMEN kapandıktan sonra çalışır (`runAfterClose`, §12). Çağıranlar (`visible`/`onDismiss`/`type`)
 * değişmez; sheet kapanış animasyonu için bileşen her zaman bağlıdır.
 */
export function SignupPrompt({ visible, onDismiss, type }: SignupPromptProps) {
  const { t } = useTranslation();
  const promptConfig = useMemo(() => buildPromptConfig(t), [t]);
  const config = promptConfig[type];

  return (
    <BottomSheet
      isOpen={visible}
      onClose={onDismiss}
      testID="signup-prompt"
      footer={<SignupPromptFooter primaryButton={config.primaryButton} primaryAction={config.primaryAction} />}
    >
      <View style={styles.iconContainer}>
        <Icon name={config.icon} variant="solid" size={iconSize.lg} color={colors.primary[600]!} />
      </View>

      <Text variant="h2" align="center" style={styles.title}>
        {config.title}
      </Text>
      <Text variant="bodySm" tone="muted" align="center" style={styles.description}>
        {config.description}
      </Text>

      <View style={styles.benefitsList}>
        {config.benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitItem}>
            <Icon name="check-circle" variant="solid" size={iconSize.md} color={colors.success[600]!} />
            <Text variant="bodySm" tone="heading" style={styles.benefitText}>
              {benefit}
            </Text>
          </View>
        ))}
      </View>

      {type !== 'message' ? <LoginLink /> : null}
    </BottomSheet>
  );
}

/** "Zaten üye misiniz? Giriş yapın" — sheet kapandıktan sonra giriş ekranına. */
function LoginLink() {
  const { t } = useTranslation();
  const { runAfterClose } = useBottomSheet();
  return (
    <Button
      variant="link"
      title={t('checkout.alreadyMember')}
      onPress={() => runAfterClose(() => router.push('/(auth)/login'))}
      testID="signup-prompt-login"
    />
  );
}

function SignupPromptFooter({
  primaryButton,
  primaryAction,
}: {
  primaryButton: string;
  primaryAction: () => void;
}) {
  const { t } = useTranslation();
  const { close, runAfterClose } = useBottomSheet();
  return (
    <ButtonRow layout="stack">
      <Button
        key="primary"
        variant="primary"
        title={primaryButton}
        onPress={() => runAfterClose(primaryAction)}
        testID="signup-prompt-primary"
      />
      <Button key="skip" variant="ghost" title={t('signupPrompt.skipText')} onPress={close} testID="signup-prompt-skip" />
    </ButtonRow>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignSelf: 'center',
    width: spacing[20],
    height: spacing[20],
    borderRadius: theme.radius.full,
    backgroundColor: colors.primary[50]!,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    marginBottom: spacing[2],
  },
  description: {
    marginBottom: spacing[5],
  },
  benefitsList: {
    alignSelf: 'stretch',
    marginBottom: spacing[3],
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2.5],
    gap: spacing[2.5],
  },
  benefitText: {
    flex: 1,
  },
});

export default SignupPrompt;
