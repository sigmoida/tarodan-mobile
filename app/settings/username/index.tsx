import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Alert, Button, Card, ScreenHeader, Text, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { useClaimUsername } from './_hooks/useClaimUsername';

export default function UsernameScreen() {
  const f = useClaimUsername();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Kullanıcı Adı" onBack={() => router.back()} />
      <View style={styles.body}>
        {f.claimed ? (
          <Card testID="username-claimed">
            <Text variant="h3">@{f.currentUsername}</Text>
            <Text variant="bodySm" style={styles.hint}>
              Kullanıcı adı bir kez belirlenir ve değiştirilemez.
            </Text>
          </Card>
        ) : (
          <>
            <Alert variant="warning" title="Bu seçim kalıcıdır" testID="username-permanent-warning">
              Kullanıcı adı bir kez belirlenir ve sonradan değiştirilemez.
            </Alert>
            <Form form={f.form}>
              <FormInput
                name="username"
                label="Kullanıcı adı"
                placeholder="kaan.merakli"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                testID="username-input"
              />
              <Button
                title="Kullanıcı adını belirle"
                onPress={f.submit}
                isLoading={f.isSubmitting}
                testID="username-submit"
              />
            </Form>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface.DEFAULT },
  body: { padding: theme.spacing[4], gap: theme.spacing[4] },
  hint: { color: theme.colors.text.muted, marginTop: theme.spacing[1] },
});
