import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../_lib/styles';

const { colors } = theme;

/** Giriş yapmamış kullanıcıya satışlar yerine gösterilen giriş çağrısı. */
export function SalesAuthGate() {
  const { t } = useTranslation();
  return (
    <View style={styles.centeredContainer}>
      <Ionicons name="storefront-outline" size={64} color={colors.primary[600]!} />
      <Text variant="h2" style={styles.title}>{t('sellerDashboard.mySales')}</Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        {t('sale.authGateSubtitle')}
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
