import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, Text, Button } from '@/ui';
import { useAuthStore } from '@/stores/authStore';

const { colors } = theme;

/**
 * Kurumsal başvuru onay sürecinde ekranı. Web karşılığı:
 * apps/web/src/app/business-pending/page.tsx. BusinessMembershipGuard,
 * businessStatus === 'pending' olan kurumsal hesapları buraya kilitler;
 * yalnızca bu ekran, /contact ve çıkış serbesttir.
 */
export default function BusinessPendingScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Ionicons name="time-outline" size={44} color={colors.warning[600]!} />
        </View>

        <Text variant="h2" style={styles.title}>{t('businessGuard.pendingTitle')}</Text>
        <Text variant="body" style={styles.text}>
          {t('businessGuard.pendingBody', { company: user?.companyName ?? '' })}
        </Text>
        <Text variant="body" style={styles.subText}>
          {t('businessGuard.pendingSubText', { email: user?.email ?? '' })}
        </Text>

        <View style={styles.infoBox}>
          <Text variant="body" weight="semibold" style={styles.infoTitle}>
            {t('businessGuard.pendingInfoTitle')}
          </Text>
          <Text variant="body" style={styles.infoItem}>
            {t('businessGuard.pendingStep1')}
          </Text>
          <Text variant="body" style={styles.infoItem}>
            {t('businessGuard.pendingStep2')}
          </Text>
          <Text variant="body" style={styles.infoItem}>
            {t('businessGuard.pendingStep3')}
          </Text>
        </View>

        <Button
          testID="business-pending-continue"
          variant="primary"
          title={t('businessGuard.pendingContinueCta')}
          onPress={() => router.push('/settings/business-application' as never)}
          style={styles.button}
        />
        <Button
          variant="outline"
          title={t('businessGuard.contactSupport')}
          onPress={() => router.push('/contact')}
          style={styles.button}
        />
        <Button
          variant="ghost"
          title={t('common.logout')}
          onPress={handleLogout}
          style={styles.button}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[6] },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning[100]!,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  title: { fontWeight: 'bold', color: colors.text.heading, textAlign: 'center' },
  text: { marginTop: theme.spacing[3], textAlign: 'center', color: colors.text.muted },
  subText: { marginTop: theme.spacing[2], textAlign: 'center', color: colors.text.muted },
  strong: { color: colors.text.heading },
  infoBox: {
    marginTop: theme.spacing[6],
    padding: theme.spacing[4],
    borderRadius: 12,
    backgroundColor: colors.warning[50]!,
    borderWidth: 1,
    borderColor: colors.warning[200]!,
    alignSelf: 'stretch',
  },
  infoTitle: { color: colors.warning[700]!, marginBottom: theme.spacing[2] },
  infoItem: { color: colors.warning[700]!, marginTop: theme.spacing[1], lineHeight: 20 },
  button: { marginTop: theme.spacing[4], alignSelf: 'stretch' },
});
