import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { theme, Text, Card, Button, IconButton } from '@/ui';

const { colors } = theme;

type PromptType =
  | 'listingLimit'
  | 'tradeFeature'
  | 'collectionFeature'
  | 'featureListing'
  | 'messageLimit'
  | 'imageLimit';

interface UpgradePromptProps {
  type: PromptType;
  onDismiss?: () => void;
  dismissable?: boolean;
  compact?: boolean;
}

// Modül düzeyinde sabitlenirse i18next hazır olmadan çözülür ve donar —
// bileşen `useMemo(() => buildPromptConfig(t), [t])` ile çağırır.
const buildPromptConfig = (t: TFunction): Record<PromptType, {
  icon: string;
  title: string;
  message: string;
  benefit: string;
}> => ({
  listingLimit: {
    icon: 'pricetag',
    title: t('upgradePrompt.listingLimitTitle'),
    message: t('upgradePrompt.listingLimitMessage'),
    benefit: t('upgradePrompt.listingLimitBenefit'),
  },
  tradeFeature: {
    icon: 'swap-horizontal',
    title: t('trade.featureTitle'),
    message: t('upgradePrompt.tradeFeatureMessage'),
    benefit: t('upgradePrompt.tradeFeatureBenefit'),
  },
  collectionFeature: {
    icon: 'images',
    title: t('membership.featureDigitalGarage'),
    message: t('upgradePrompt.collectionFeatureMessage'),
    benefit: t('upgradePrompt.collectionFeatureBenefit'),
  },
  featureListing: {
    icon: 'star',
    title: t('upgradePrompt.featureListingTitle'),
    message: t('upgradePrompt.featureListingMessage'),
    benefit: t('upgradePrompt.featureListingBenefit'),
  },
  messageLimit: {
    icon: 'chatbubble',
    title: t('upgradePrompt.messageLimitTitle'),
    message: t('upgradePrompt.messageLimitMessage'),
    benefit: t('upgradePrompt.messageLimitBenefit'),
  },
  imageLimit: {
    icon: 'camera',
    title: t('upgradePrompt.imageLimitTitle'),
    message: t('upgradePrompt.imageLimitMessage'),
    benefit: t('upgradePrompt.imageLimitBenefit'),
  },
});

export default function UpgradePrompt({
  type,
  onDismiss,
  dismissable = true,
  compact = false,
}: UpgradePromptProps) {
  const { t } = useTranslation();
  const promptConfig = useMemo(() => buildPromptConfig(t), [t]);
  const config = promptConfig[type];

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => router.push('/upgrade')}
      >
        <Ionicons name={config.icon as any} size={18} color={colors.primary[600]!} />
        <Text style={styles.compactText}>{config.benefit}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.primary[600]!} />
      </TouchableOpacity>
    );
  }

  return (
    <Card style={styles.card}>
      {dismissable && onDismiss && (
        <IconButton
          icon="close"
          size="sm"
          accessibilityLabel={t('common.close')}
          style={styles.closeButton}
          onPress={onDismiss}
        />
      )}

      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name={config.icon as any} size={32} color={colors.primary[600]!} />
        </View>
      </View>

      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.message}>{config.message}</Text>

      <View style={styles.benefitContainer}>
        <Ionicons name="diamond" size={18} color={colors.primary[600]!} />
        <Text style={styles.benefitText}>{config.benefit}</Text>
      </View>

      <View style={styles.features}>
        <Text style={styles.featuresTitle}>{t('upgradePrompt.featuresTitle')}</Text>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark" size={16} color={colors.success[600]!} />
          <Text style={styles.featureText}>{t('membership.featureUnlimitedListings')}</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark" size={16} color={colors.success[600]!} />
          <Text style={styles.featureText}>{t('membership.featureTrade')}</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark" size={16} color={colors.success[600]!} />
          <Text style={styles.featureText}>{t('membership.featureDigitalGarage')}</Text>
        </View>
        {/*
          "Reklamsız deneyim" KALDIRILDI: banner'lar herkese gösteriliyor ve
          sunucu her katman için `isAdFree: null` döndürüyor (staging,
          2026-08-26). Vaadin kendisi devre dışı; `useAds`'teki `isAdFree`
          kapısı kodda kalıyor çünkü alan bir gün dolarsa mekanizma çalışır —
          ama pazarlama metni karşılığı olmayan bir söz veremez.
        */}
      </View>

      <Button
        variant="primary"
        title={t('upgradePrompt.upgradeButtonWithPrice')}
        onPress={() => router.push('/upgrade')}
        style={styles.upgradeButton}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: theme.spacing[4],
    backgroundColor: colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[50]!,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing[2],
    color: colors.text.heading,
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    textAlign: 'center',
    color: colors.text.muted,
    marginBottom: theme.spacing[4],
    fontSize: 14,
  },
  benefitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50]!,
    padding: theme.spacing[3],
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing[4],
  },
  benefitText: {
    marginLeft: theme.spacing[2],
    color: colors.primary[600]!,
    fontWeight: '600',
  },
  features: {
    marginBottom: theme.spacing[4],
  },
  featuresTitle: {
    color: colors.text.muted,
    marginBottom: theme.spacing[2],
    fontSize: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing[1],
  },
  featureText: {
    marginLeft: theme.spacing[2],
    color: colors.text.heading,
    fontSize: 13,
  },
  upgradeButton: {
    backgroundColor: colors.primary[600]!,
  },
  priceNote: {
    textAlign: 'center',
    marginTop: theme.spacing[2],
    color: colors.success[600]!,
    fontSize: 12,
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50]!,
    padding: theme.spacing[3],
    borderRadius: theme.radius.xl,
    margin: theme.spacing[4],
    gap: theme.spacing[2],
  },
  compactText: {
    flex: 1,
    color: colors.primary[600]!,
    fontWeight: '500',
    fontSize: 13,
  },
});
