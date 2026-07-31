import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Alert, Button, ScreenHeader, Text, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { useEmailChange } from './_hooks/useEmailChange';

export default function EmailChangeScreen() {
  const f = useEmailChange();

  return (
    <View style={styles.container}>
      <ScreenHeader title="E-posta Değiştir" onBack={() => router.back()} />
      <View style={styles.body}>
        <Alert variant="info" title="Mevcut e-postanız aktif kalır">
          Yeni adresinizi doğrulayana kadar hesabınız mevcut e-posta ile çalışmaya devam eder.
        </Alert>

        {f.step === 'email' ? (
          <Form form={f.emailForm}>
            <FormInput
              name="newEmail"
              label="Yeni e-posta"
              placeholder="yeni@ornek.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-change-input"
            />
            <Button
              title="Doğrulama kodu gönder"
              onPress={f.submitEmail}
              isLoading={f.isRequesting}
              testID="email-change-request"
            />
          </Form>
        ) : (
          <Form form={f.codeForm}>
            <Text variant="bodySm" style={styles.hint}>
              {f.pendingEmail} adresine gönderilen 6 haneli kodu girin.
            </Text>
            <FormInput
              name="code"
              label="Doğrulama kodu"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              testID="email-change-code"
            />
            <Button
              title="Doğrula"
              onPress={f.submitCode}
              isLoading={f.isVerifying}
              testID="email-change-verify"
            />
          </Form>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface.DEFAULT },
  body: { padding: theme.spacing[4], gap: theme.spacing[4] },
  hint: { color: theme.colors.text.muted },
});
