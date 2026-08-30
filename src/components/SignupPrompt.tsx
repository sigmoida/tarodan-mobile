import { useMemo } from 'react';
import { View, StyleSheet, Modal as RNModal, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { theme, Text, Button } from '@/ui';

const { colors } = theme;

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
    icon: 'heart',
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
    icon: 'chatbubble-ellipses',
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
    icon: 'checkmark-circle',
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
    icon: 'swap-horizontal',
    title: t('trade.featureTitle'),
    description: t('signupPrompt.tradeDescription'),
    primaryButton: t('mobile.guestGoPremium'),
    primaryAction: () => router.push('/(auth)/register'),
    benefits: [
      t('signupPrompt.tradeBenefit1'),
      t('signupPrompt.tradeBenefit2'),
      t('signupPrompt.tradeBenefit3'),
    ],
  },
  collections: {
    icon: 'albums',
    title: t('mobile.guestGarageTitle'),
    description: t('signupPrompt.collectionsDescription'),
    primaryButton: t('mobile.guestGoPremium'),
    primaryAction: () => router.push('/(auth)/register'),
    benefits: [
      t('signupPrompt.collectionsBenefit1'),
      t('signupPrompt.collectionsBenefit2'),
      t('signupPrompt.collectionsBenefit3'),
    ],
  },
});

export function SignupPrompt({ visible, onDismiss, type }: SignupPromptProps) {
  const { t } = useTranslation();
  const promptConfig = useMemo(() => buildPromptConfig(t), [t]);

  if (!visible) return null;

  const config = promptConfig[type];

  return (
    <RNModal
      visible
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
            <Ionicons name="close" size={24} color={colors.text.muted} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon as any} size={48} color={colors.primary[600]!} />
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.description}>{config.description}</Text>

          {/* Benefits */}
          <View style={styles.benefitsList}>
            {config.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success[600]!} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <Button
            variant="primary"
            title={config.primaryButton}
            onPress={() => {
              onDismiss();
              config.primaryAction();
            }}
            style={styles.primaryButton}
          />

          {type !== 'message' && (
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => {
                onDismiss();
                router.push('/(auth)/login');
              }}
            >
              <Text style={styles.loginLinkText}>
                {t('checkout.alreadyMember')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onDismiss}>
            <Text style={styles.skipText}>{t('signupPrompt.skipText')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.black50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[5],
  },
  container: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 20,
    padding: theme.spacing[6],
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: theme.spacing[2],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50]!,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.heading,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  description: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing[5],
  },
  benefitsList: {
    alignSelf: 'stretch',
    marginBottom: theme.spacing[6],
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2.5],
    gap: theme.spacing[2.5],
  },
  benefitText: {
    fontSize: 14,
    color: colors.text.heading,
    flex: 1,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    marginBottom: theme.spacing[3],
  },
  loginLink: {
    marginBottom: theme.spacing[4],
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  loginLinkBold: {
    color: colors.primary[600]!,
    fontWeight: '600',
  },
  skipText: {
    fontSize: 14,
    color: colors.text.muted,
  },
});

export default SignupPrompt;
