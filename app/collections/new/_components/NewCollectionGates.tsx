import { View } from 'react-native';
import { Button, Text, theme, ScreenHeader } from '@/ui';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getUpgradeMessage } from '@/utils/membershipLimits';
import { styles } from '../_lib/styles';

const { colors } = theme;

/** Premium olmayan kullanıcıya gösterilen yükseltme kapısı. */
export function PremiumGate() {
  const { t } = useTranslation();
  const upgradeInfo = getUpgradeMessage(t, 'collectionFeature');
  const premiumFeatures = [
    t('collection.premiumFeatureUnlimited'),
    t('collection.premiumFeatureShare'),
    t('collection.premiumFeatureQr'),
    t('collection.premiumFeatureShowcase'),
  ];
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('mobile.guestGarageTitle')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
      <View style={styles.premiumRequired}>
        <MaterialCommunityIcons name="garage" size={80} color={colors.primary[600]!} />
        <Text variant="h2" style={styles.premiumTitle}>{upgradeInfo.title}</Text>
        <Text variant="body" style={styles.premiumSubtitle}>{upgradeInfo.message}</Text>

        <View style={styles.premiumFeatures}>
          {premiumFeatures.map((feature) => (
            <View key={feature} style={styles.premiumFeature}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success[600]!} />
              <Text style={styles.premiumFeatureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <Button variant="primary" title={t('membership.upgradeToPremium')} onPress={() => router.push('/upgrade')} style={styles.upgradeButton} />
        <Button variant="ghost" title={t('common.goBack')} onPress={() => router.back()} style={{ alignSelf: 'center' }} />
      </View>
    </View>
  );
}

/** Giriş yapmamış kullanıcı kapısı. */
export function AuthGate() {
  const { t } = useTranslation();
  return (
    <View style={styles.centeredContainer}>
      <Text variant="h2">{t('collection.authGateTitle')}</Text>
      <Text variant="body" style={styles.subtitle}>
        {t('collection.authGateSubtitle')}
      </Text>
      <Button
        variant="primary"
        title={t('common.login')}
        onPress={() => router.push('/(auth)/login')}
        style={{ alignSelf: 'center' }}
      />
    </View>
  );
}
