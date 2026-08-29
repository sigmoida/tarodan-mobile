import { View, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../_lib/browseStyles';

const { colors } = theme;

/** Digital Garage upsell bilgi kartı — premium olmayan üyeye gösterilir. */
export function CollectionsInfoCard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.infoCard}>
      <Ionicons name="information-circle" size={24} color={colors.info[600]!} />
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{t('collection.digitalGarageWhatTitle')}</Text>
        <Text style={styles.infoText}>
          {t('collection.digitalGarageInfoDesc')}
        </Text>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => router.push(isAuthenticated ? '/upgrade' : '/(auth)/login')}
        >
          <Text style={styles.infoButtonText}>{t('collection.becomePremiumCta')}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary[600]!} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
