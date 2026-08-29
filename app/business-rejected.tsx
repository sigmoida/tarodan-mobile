import { View, ScrollView, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, Text, Button } from '@/ui';
import { useAuthStore } from '@/stores/authStore';

const { colors } = theme;

/**
 * Kurumsal başvuru reddedildi ekranı. Web karşılığı:
 * apps/web/src/app/business-rejected/page.tsx. BusinessMembershipGuard,
 * businessStatus === 'rejected' olan kurumsal hesapları buraya kilitler;
 * yalnızca bu ekran, /contact, /login ve çıkış serbesttir.
 */
export default function BusinessRejectedScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Ionicons name="close-circle-outline" size={44} color={colors.danger[600]!} />
        </View>

        <Text variant="h2" style={styles.title}>{t('businessGuard.rejectedTitle')}</Text>
        <Text variant="body" style={styles.text}>
          {t('businessGuard.rejectedBody', { company: user?.companyName ?? '' })}
        </Text>
        <Text variant="body" style={styles.subText}>
          {t('businessGuard.rejectedSubText', { email: user?.email ?? '' })}
        </Text>

        <View style={styles.infoBox}>
          <Text variant="body" style={styles.infoText}>
            {t('businessGuard.rejectedInfoText')}
          </Text>
        </View>

        <Button
          testID="business-rejected-continue"
          variant="primary"
          title={t('businessGuard.rejectedFixCta')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[6] },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.danger[100]!,
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
    backgroundColor: colors.danger[50]!,
    borderWidth: 1,
    borderColor: colors.danger[200]!,
    alignSelf: 'stretch',
  },
  infoText: { color: colors.danger[700]!, lineHeight: 20 },
  button: { marginTop: theme.spacing[4], alignSelf: 'stretch' },
});
