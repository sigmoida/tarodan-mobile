import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { HStack, Screen, Text, VStack, theme } from '@/ui';
import { BrandLogo } from '@/components/BrandLogo';
import { useRegisterBusiness } from './_hooks/useRegisterBusiness';
import { styles } from './_lib/styles';
import { RegisterBusinessForm } from './_components/RegisterBusinessForm';

const { colors } = theme;

export default function RegisterBusinessScreen() {
  const { t } = useTranslation();
  const f = useRegisterBusiness();
  const insets = useSafeAreaInsets();

  return (
    <Screen center style={styles.screen}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        hitSlop={12}
        style={[styles.backButton, { top: insets.top + 8 }]}
      >
        <Ionicons name="arrow-back" size={26} color={colors.white} />
      </Pressable>

      <VStack gap={5}>
        <View style={styles.brandHeader}>
          <BrandLogo />
          <Text variant="displaySm" align="center" style={styles.headerTitle}>{t('auth.registerBusinessTitle')}</Text>
        </View>

        <RegisterBusinessForm f={f} />

        <HStack justify="center" gap={1}>
          <Text variant="bodySm" style={styles.footerText}>{t('auth.hasAccount')}</Text>
          <Text
            variant="bodySm"
            weight="bold"
            style={styles.footerLink}
            onPress={() => router.replace('/(auth)/login')}
          >
            {t('common.login')}
          </Text>
        </HStack>
      </VStack>
    </Screen>
  );
}
