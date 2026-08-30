import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, Text } from '@/ui';

const { colors } = theme;

export default function MaintenanceScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('mobile.maintenanceHeaderTitle') }} />
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={64} color={colors.text.muted} />
        <Text variant="h2" style={styles.title}>{t('mobile.maintenanceTitle')}</Text>
        <Text variant="body" style={styles.text}>
          {t('mobile.maintenanceDescription')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[6] },
  title: { marginTop: theme.spacing[4], fontWeight: 'bold', color: colors.text.heading },
  text: { marginTop: theme.spacing[2], textAlign: 'center', color: colors.text.muted },
});
