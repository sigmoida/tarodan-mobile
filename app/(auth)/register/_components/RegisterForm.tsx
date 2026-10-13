import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, DateField, HStack, Input, Text } from '@/ui';
import { useUsernameFieldStatus } from '@/hooks/useUsernameFieldStatus';
import { Controller } from 'react-hook-form';
import { router } from 'expo-router';
import { styles } from '../_lib/styles';
import { maxBirthDate } from '../_lib/schema';
import { toHandle } from '@/utils/validation';
import type { RegisterController } from '../_hooks/useRegister';
import { IS_MAESTRO } from '@/config/maestro';

/** Kayıt form kartı — kullanıcı adı/ad/e-posta/doğum/şifre/onay alanları + sözleşme linkleri + gönder. */
export function RegisterForm({ f }: { f: RegisterController }) {
  const { t } = useTranslation();
  const { control, errors, registerMutation, usernameAvailability } = f;

  // Durum slotu (hata önceliği, yardım metni, ikon): `useUsernameFieldStatus` tek kaynak.
  const username = useUsernameFieldStatus(usernameAvailability, errors.username?.message);

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="username"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-username-input"
            label={t('auth.usernameLabel')}
            rightIcon={username.statusIcon}
            placeholder="kaan.merakli"
            value={value}
            // Girişte küçük harfe çevir: alan gerçekten kaydedilecek handle'ı
            // gösterir (sessiz dönüşüm yok) ve karışık girdi de uygunluk
            // kontrolünden geçer. Şemadaki `.toLowerCase()` emniyet kemeri.
            onChangeText={(t) => onChange(toHandle(t))}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            error={username.error}
            helperText={username.helper}
          />
        )}
      />
      <Text variant="bodySm" tone="muted" style={styles.fieldHint}>
        {t('settings.usernameClaimedHint')}
      </Text>

      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-displayName-input"
            label={t('auth.fullNameLabel')}
            placeholder={t('auth.fullNamePlaceholder')}
            value={value}
            onChangeText={onChange}
            error={errors.displayName?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-email-input"
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="birthDate"
        render={({ field: { onChange, value } }) => (
          <DateField
            testID="register-birthDate-input"
            label={`${t('auth.birthDate')} (${t('common.optional')})`}
            value={value ?? ''}
            onChange={onChange}
            placeholder={t('auth.birthDatePlaceholder')}
            maximumDate={maxBirthDate()}
            error={errors.birthDate?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-password-input"
            label={t('auth.password')}
            placeholder="••••••••"
            value={value}
            onChangeText={onChange}
            // Maestro: iOS secureTextEntry'ye yazamıyor + "Automatic Strong Password"
            // kaplaması çıkıyor. Test modunda maskeyi kapat (login.tsx ile aynı). Prod: maskeli.
            secureTextEntry={!IS_MAESTRO}
            // Maskesizken iOS otomatik öneri fazladan karakter ekliyor (şifre eşleşmez).
            autoCorrect={false}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            togglePasswordVisibility
            error={errors.password?.message}
          />
        )}
      />
      <Text variant="bodySm" tone="muted" style={styles.fieldHint}>
        {t('auth.passwordHint')}
      </Text>

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-confirmPassword-input"
            label={t('auth.confirmPassword')}
            placeholder="••••••••"
            value={value}
            onChangeText={onChange}
            secureTextEntry={!IS_MAESTRO}
            autoCorrect={false}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            togglePasswordVisibility
            error={errors.confirmPassword?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { onChange, value } }) => (
          <Checkbox
            testID="register-acceptTerms"
            checked={value}
            onChange={() => onChange(!value)}
            label={t('auth.termsCheckboxLabel')}
            error={errors.acceptTerms?.message}
          />
        )}
      />
      {errors.acceptTerms?.message ? (
        <Text variant="bodySm" tone="danger">{errors.acceptTerms.message}</Text>
      ) : null}

      <Controller
        control={control}
        name="acceptKvkk"
        render={({ field: { onChange, value } }) => (
          <Checkbox
            testID="register-acceptKvkk"
            checked={value}
            onChange={() => onChange(!value)}
            label={t('auth.kvkkCheckboxLabel')}
            error={errors.acceptKvkk?.message}
          />
        )}
      />
      {errors.acceptKvkk?.message ? (
        <Text variant="bodySm" tone="danger">{errors.acceptKvkk.message}</Text>
      ) : null}

      <HStack wrap gap={1} style={styles.legalLinks}>
        <Text variant="bodySm" tone="primary" weight="semibold" onPress={() => router.push('/terms')}>
          {t('footer.terms')}
        </Text>
        <Text variant="bodySm" tone="muted">{t('common.and')}</Text>
        <Text variant="bodySm" tone="primary" weight="semibold" onPress={() => router.push('/privacy')}>
          {t('footer.privacy')}
        </Text>
      </HStack>
      <HStack>
        <Text
          variant="bodySm"
          tone="primary"
          weight="semibold"
          testID="register-kvkk-link"
          // Ayrı KVKK sayfası yok; web gibi gizlilik/aydınlatma metnine gider.
          onPress={() => router.push('/privacy')}
        >
          {t('legal.kvkkTitle')}
        </Text>
      </HStack>

      {registerMutation.isError ? (
        <Text variant="bodySm" tone="danger">
          {(() => {
            const err = registerMutation.error as any;
            const msg = err?.response?.data?.message;
            const text = Array.isArray(msg) ? msg[0] : msg;
            return text || err?.message || t('auth.registerFailed');
          })()}
        </Text>
      ) : null}

      <Button
        testID="register-submit-button"
        variant="primary"
        size="lg"
        fullWidth
        title={t('auth.registerSubmit')}
        onPress={f.handleSubmit(f.onSubmit)}
        isLoading={registerMutation.isPending}
        disabled={registerMutation.isPending || usernameAvailability.available === false}
        style={styles.submit}
      />
    </View>
  );
}
