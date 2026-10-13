import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { RegisterAccountTabs } from '@/components/auth/RegisterAccountTabs';
import { useRegister } from './_hooks/useRegister';
import { styles } from './_lib/styles';
import { RegisterForm } from './_components/RegisterForm';

/** Bireysel kayıt — İNCE ekran: auth kabuğu + Bireysel/Kurumsal sekmeleri + form. */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const f = useRegister();

  return (
    <AuthShell
      title={t('auth.createAccount')}
      description={t('auth.joinCommunity')}
      hero="auth_register"
      onBack={f.handleBack}
      footer={
        <AuthFooterLink
          prompt={t('auth.hasAccount')}
          linkLabel={t('common.login')}
          onPress={() => router.push('/(auth)/login')}
        />
      }
    >
      <View style={styles.tabs}>
        <RegisterAccountTabs active="individual" />
      </View>
      <RegisterForm f={f} />
    </AuthShell>
  );
}
