import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, ScreenHeader, Text, theme } from '@/ui';

import { getUpgradeMessage } from '@/utils/membershipLimits';
import { styles } from '../_lib/styles';
import type { NewTradeController } from '../_hooks/useNewTrade';

const { colors } = theme;

/**
 * Renders the premium-required or not-authenticated gate, or `null` when the
 * wizard itself should render. Keeps the early-return ladder out of the screen.
 */
export function NewTradeGate({ f }: { f: NewTradeController }) {
  const { t } = useTranslation();
  if (!f.canTrade) {
    const upgradeInfo = getUpgradeMessage(t, 'tradeFeature');
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('product.trade')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />

        <View style={styles.premiumRequired}>
          <MaterialCommunityIcons name="swap-horizontal" size={80} color={colors.primary[600]!} />
          <Text variant="h2" style={styles.premiumTitle}>{upgradeInfo.title}</Text>
          <Text variant="body" style={styles.premiumSubtitle}>{upgradeInfo.message}</Text>

          <View style={styles.premiumFeatures}>
            <View style={styles.premiumFeature}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success[600]!} />
              <Text style={styles.premiumFeatureText}>{t('trade.premiumFeatureCreate')}</Text>
            </View>
            <View style={styles.premiumFeature}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success[600]!} />
              <Text style={styles.premiumFeatureText}>{t('trade.premiumFeatureCounter')}</Text>
            </View>
            <View style={styles.premiumFeature}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success[600]!} />
              <Text style={styles.premiumFeatureText}>{t('trade.premiumFeatureCash')}</Text>
            </View>
            <View style={styles.premiumFeature}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success[600]!} />
              <Text style={styles.premiumFeatureText}>{t('trade.premiumFeatureProtection')}</Text>
            </View>
          </View>

          <Button variant="primary" title={t('membership.title')} onPress={() => router.push('/membership')} style={styles.upgradeButton} />
          <Button variant="ghost" title={t('common.goBack')} onPress={() => router.back()} style={{ alignSelf: 'center' }} />
        </View>
      </View>
    );
  }

  if (!f.isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Text variant="h3">{t('membership.loginRequiredTitle')}</Text>
        <Text variant="body" style={styles.subtitle}>{t('trade.loginToTrade')}</Text>
        <Button variant="primary" title={t('common.login')} onPress={() => router.push('/(auth)/login')} style={{ alignSelf: 'center' }} />
      </View>
    );
  }

  return null;
}
