import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { RegisterAccountTabs } from '@/components/auth/RegisterAccountTabs';
import { useRegisterBusiness } from './_hooks/useRegisterBusiness';
import { styles } from './_lib/styles';
import { RegisterBusinessForm } from './_components/RegisterBusinessForm';

/** Kurumsal ön başvuru — İNCE ekran: auth kabuğu + Bireysel/Kurumsal sekmeleri + form. */
export default function RegisterBusinessScreen() {
  const { t } = useTranslation();
  const f = useRegisterBusiness();

  return (
    <AuthShell
      title={t('auth.registerBusinessTitle')}
      hero="auth_register"
      back={{
        label: t('common.back'),
        onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)')),
      }}
      footer={
        <AuthFooterLink
          prompt={t('auth.hasAccount')}
          linkLabel={t('common.login')}
          onPress={() => router.replace('/(auth)/login')}
        />
      }
    >
      <View style={styles.tabs}>
        <RegisterAccountTabs active="corporate" />
      </View>
      <RegisterBusinessForm f={f} />
    </AuthShell>
  );
}
