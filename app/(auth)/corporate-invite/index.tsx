import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import {
  Text,
  Button,
  Card,
  Alert,
  ScreenHeader,
  ScreenLoader,
  theme,
} from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { useCorporateInvite } from './_hooks/useCorporateInvite';

/**
 * Kurumsal davet aktivasyonu — THIN ekran. Davet e-postasındaki bağlantı
 * (universal link / tarodan://corporate-invite?token=) buraya düşer.
 * Kullanıcı adı BİR KEZ belirlenir ve değiştirilemez.
 */
export default function CorporateInviteScreen() {
  const f = useCorporateInvite();

  if (f.isLoading) return <ScreenLoader />;

  if (f.isInvalid) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface.DEFAULT }}>
        <ScreenHeader title="Kurumsal Davet" onBack={() => router.replace('/(auth)/login' as never)} />
        <View testID="invite-invalid" style={{ padding: theme.spacing[4], gap: theme.spacing[4] }}>
          <Alert variant="danger" title="Bağlantı geçersiz">
            Davet bağlantısı geçersiz veya süresi dolmuş. Lütfen şirket yöneticinizden
            yeni bir davet isteyin.
          </Alert>
          <Button onPress={() => router.replace('/(auth)/login' as never)}>Girişe dön</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface.DEFAULT }}>
      <ScreenHeader title="Kurumsal Hesabı Etkinleştir" onBack={() => router.replace('/(auth)/login' as never)} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[4] }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Text variant="h3">{f.invitation?.companyTitle}</Text>
          <Text variant="caption" style={{ color: theme.colors.text.muted }}>
            {f.invitation?.companyEmail}
          </Text>
        </Card>

        <Alert variant="info" title="Kullanıcı adı kalıcıdır">
          Belirlediğiniz kullanıcı adı sonradan değiştirilemez.
        </Alert>

        <Form form={f.form}>
          <FormInput
            testID="invite-username"
            name="username"
            label="Kullanıcı adı"
            placeholder="tarodan.kurumsal"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FormInput
            testID="invite-password"
            name="password"
            label="Şifre"
            secureTextEntry
            helperText="En az 8 karakter; bir küçük harf, bir büyük harf ve bir rakam."
          />
          <FormInput
            testID="invite-password-confirm"
            name="passwordConfirm"
            label="Şifre (tekrar)"
            secureTextEntry
          />
        </Form>

        <Button testID="invite-submit" onPress={f.onSubmit} isLoading={f.isSubmitting}>
          Hesabı etkinleştir
        </Button>
      </ScrollView>
    </View>
  );
}
