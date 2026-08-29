import { useTranslation } from 'react-i18next';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Card, Text, theme } from '@/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { colors } = theme;

export default function CheckoutSuccessScreen() {
  const { t } = useTranslation();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Animation/Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={60} color={colors.white} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('order.receivedTitle')}</Text>

        {/* Order ID */}
        {orderId && (
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>{t('checkout.orderNumberLabel')}</Text>
            <Text style={styles.orderIdValue}>#{orderId}</Text>
          </View>
        )}

        {/* Description */}
        <Text style={styles.description}>
          {t('checkout.successDescription')}
        </Text>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={24} color={colors.primary[600]!} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{t('checkout.emailNotificationTitle')}</Text>
              <Text style={styles.infoText}>{t('order.detailsEmailed')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={24} color={colors.primary[600]!} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{t('order.trackingSection')}</Text>
              <Text style={styles.infoText}>{t('order.trackingWhenSellerShips')}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="chatbubble-outline" size={24} color={colors.primary[600]!} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{t('order.sellerContactSection')}</Text>
              <Text style={styles.infoText}>{t('order.sellerContactVia')}</Text>
            </View>
          </View>
        </Card>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Button
            variant="primary"
            title={t('checkout.viewMyOrders')}
            fullWidth
            onPress={() => router.replace('/orders')}
            style={styles.primaryButton}
            icon="cube-outline"
          />
          <Button
            variant="outline"
            title={t('cart.continueShopping')}
            fullWidth
            onPress={() => router.replace('/(tabs)')}
            style={styles.secondaryButton}
          />
        </View>

        {/* Support Link */}
        <Text style={styles.supportText}>
          {t('checkout.supportQuestion')}{' '}
          <Text style={styles.supportLink} onPress={() => router.push('/support')}>
            {t('checkout.getSupport')}
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing[6],
    paddingTop: theme.spacing[20],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success[600]!,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.heading,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  orderIdContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  orderIdLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  orderIdValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[600]!,
    marginTop: theme.spacing[1],
  },
  description: {
    fontSize: 15,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing[8],
  },
  infoCard: {
    marginBottom: theme.spacing[8],
    backgroundColor: colors.surface.alt,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing[5],
  },
  infoContent: {
    flex: 1,
    marginLeft: theme.spacing[4],
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.heading,
    marginBottom: theme.spacing[1],
  },
  infoText: {
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 18,
  },
  buttons: {
    gap: theme.spacing[3],
    marginBottom: theme.spacing[6],
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: theme.spacing[1],
  },
  secondaryButton: {
    borderRadius: 12,
    borderColor: colors.primary[600]!,
  },
  supportText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
  supportLink: {
    color: colors.primary[600]!,
    fontWeight: '500',
  },
});
