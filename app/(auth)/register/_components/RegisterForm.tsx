import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button, Checkbox, DateField, HStack, Input, Spinner, Text, theme } from '@/ui';
import { Controller } from 'react-hook-form';
import { router } from 'expo-router';
import { styles } from '../_lib/styles';
import { maxBirthDate } from '../_lib/schema';
import { toHandle } from '@/utils/validation';
import type { RegisterController } from '../_hooks/useRegister';

/** Kayıt form kartı — kullanıcı adı/ad/e-posta/doğum/şifre/onay alanları + sözleşme linkleri + gönder. */
export function RegisterForm({ f }: { f: RegisterController }) {
  const { t } = useTranslation();
  const { control, errors, registerMutation, usernameAvailability } = f;

  // Kullanıcı adı durum slotu — TEK öncelik sırası (Input tek satır gösterir):
  //   1) zod format hatası (submit sonrası)  2) ham biçim uyarısı (ANINDA, submit
  //   beklemeden — N-1: Türkçe büyük harf 'İ'.toLowerCase() birleşik noktalı 'i'
  //   üretir, alanda gözle doğru görünür ama regex'i geçmez)  3) "kontrol
  //   ediliyor"  4) uygunluk sonucu.
  // "Kontrol ediliyor" ADIMI ATLANMAZ: aksi halde henüz sorulmamış bir ad için
  // eski sonucun kırmızısı görünür ve buton sessizce kilitli kalır.
  const { available, checking, isThrottled, isFormatInvalid } = usernameAvailability;
  const usernameFormatError = errors.username?.message;
  const usernameRawFormatWarning =
    !usernameFormatError && isFormatInvalid
      ? t('auth.usernameInvalidFormat')
      : undefined;
  const usernameTakenError =
    !usernameFormatError && !usernameRawFormatWarning && !checking && available === false
      ? t('auth.usernameTaken')
      : undefined;
  const usernameError = usernameFormatError || usernameRawFormatWarning || usernameTakenError;
  const usernameHelper = usernameError
    ? undefined
    : checking
      ? t('auth.usernameChecking')
      : isThrottled
        ? t('auth.usernameRateLimited')
        : available === true
          ? t('auth.usernameAvailable')
          : undefined;
  const usernameStatusIcon = checking
    ? <Spinner size="sm" />
    : usernameError
      ? null
      : available === true
        ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.success[600]} />
        : null;

  return (
    <View style={styles.card}>
      <Controller
        control={control}
        name="username"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-username-input"
            label={t('auth.usernameLabel')}
            leftIconName="at-outline"
            rightIcon={usernameStatusIcon}
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
            error={usernameError}
            helperText={usernameHelper}
          />
        )}
      />
      <Text variant="bodySm" tone="muted" style={styles.fieldHint}>
        Kullanıcı adı bir kez belirlenince değiştirilemez.
      </Text>

      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-displayName-input"
            label={t('auth.fullNameLabel')}
            leftIconName="person-outline"
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
            leftIconName="mail-outline"
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
            label={t('auth.birthDate')}
            value={value}
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
            leftIconName="lock-closed-outline"
            placeholder="••••••••"
            value={value}
            onChangeText={onChange}
            // Maestro: iOS secureTextEntry'ye yazamıyor + "Automatic Strong Password"
            // kaplaması çıkıyor. Test modunda maskeyi kapat (login.tsx ile aynı). Prod: maskeli.
            secureTextEntry={process.env.EXPO_PUBLIC_MAESTRO !== '1'}
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
            leftIconName="lock-closed-outline"
            placeholder="••••••••"
            value={value}
            onChangeText={onChange}
            secureTextEntry={process.env.EXPO_PUBLIC_MAESTRO !== '1'}
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

      <HStack justify="center" wrap gap={1} style={{ marginTop: 8 }}>
        <Text variant="bodySm" tone="primary" weight="semibold" onPress={() => router.push('/terms')}>
          {t('footer.terms')}
        </Text>
        <Text variant="bodySm" tone="muted">{t('common.and')}</Text>
        <Text variant="bodySm" tone="primary" weight="semibold" onPress={() => router.push('/privacy')}>
          {t('footer.privacy')}
        </Text>
      </HStack>

      {registerMutation.isError ? (
        <Text variant="bodySm" tone="danger" align="center" style={{ marginTop: 8 }}>
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
        style={{ marginTop: 16 }}
      />
    </View>
  );
}
