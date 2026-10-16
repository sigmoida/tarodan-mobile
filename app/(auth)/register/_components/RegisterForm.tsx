import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import { Button, DateField, Input, Text } from '@/ui';
import { useUsernameFieldStatus } from '@/hooks/useUsernameFieldStatus';
import { PhonePrefix } from '@/components/auth/PhonePrefix';
import { SocialButtons } from '@/components/auth/SocialButtons';
import { DEFAULT_COUNTRY_CODE, formatTrPhoneField, getPhonePlaceholder } from '@/utils/phone';
import { toHandle } from '@/utils/validation';
import { passwordHint } from '@/utils/passwordPolicy';
import { IS_MAESTRO } from '@/config/maestro';
import { styles } from '../_lib/styles';
import { maxBirthDate } from '../_lib/schema';
import type { RegisterController } from '../_hooks/useRegister';
import { RegisterConsents } from './RegisterConsents';

/** `formatTrPhoneField` baştaki `0`/`90`'ı soyduğu için placeholder lokal biçim (`+90` önek solda). */
const PHONE_PLACEHOLDER = getPhonePlaceholder(DEFAULT_COUNTRY_CODE);

/**
 * Bireysel kayıt formu (web `RegisterForm` sırası): Ad Soyad (`displayName`), Profil Kullanıcı
 * Adı, E-posta, Telefon + Doğum Tarihi (yan yana), Şifre (altında yazarken eksik kurallar),
 * Şifre Tekrar, onaylar, Üye Ol, Google/Apple. Web'deki Ad/Soyad/T.C. Kimlik bloğu BİLEREK yok: kimlik, ihtiyaç anında
 * (ödeme/ilan/takas) sorulur — kayıtta sorulmaz (App Store 5.1.1).
 */
export function RegisterForm({ f }: { f: RegisterController }) {
  const { t } = useTranslation();
  const { control, errors, registerMutation, usernameAvailability } = f;

  // Durum slotu (hata önceliği, yardım metni, ikon): `useUsernameFieldStatus` tek kaynak.
  const username = useUsernameFieldStatus(usernameAvailability, errors.username?.message);

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-displayName-input"
            // Kayıta özel etiket (`profile.displayName` profil ekranlarıyla ortak, dokunulmaz).
            label={t('auth.fullName')}
            required
            placeholder={t('auth.fullNamePlaceholder')}
            value={value}
            onChangeText={onChange}
            autoComplete="nickname"
            error={errors.displayName?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="username"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-username-input"
            label={t('auth.username')}
            required
            rightIcon={username.statusIcon}
            placeholder={t('auth.usernamePlaceholder')}
            value={value}
            // Girişte küçük harfe çevir: alan gerçekten kaydedilecek handle'ı
            // gösterir (sessiz dönüşüm yok) ve karışık girdi de uygunluk
            // kontrolünden geçer. Şemadaki `.toLowerCase()` emniyet kemeri.
            onChangeText={(text) => onChange(toHandle(text))}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            error={username.error}
            helperText={username.helper}
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
            required
            placeholder={t('auth.emailPlaceholder')}
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email?.message}
          />
        )}
      />

      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                testID="register-phone-input"
                label={t('auth.phone')}
                leftIcon={<PhonePrefix />}
                placeholder={PHONE_PLACEHOLDER}
                value={value ?? ''}
                onChangeText={(text) => onChange(formatTrPhoneField(text))}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                error={errors.phone?.message}
              />
            )}
          />
        </View>
        <View style={styles.pairItem}>
          <Controller
            control={control}
            name="birthDate"
            render={({ field: { onChange, value } }) => (
              <DateField
                testID="register-birthDate-input"
                label={t('auth.birthDate')}
                value={value ?? ''}
                onChange={onChange}
                placeholder={t('auth.birthDatePlaceholder')}
                maximumDate={maxBirthDate()}
                error={errors.birthDate?.message}
              />
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-password-input"
            label={t('auth.password')}
            required
            placeholder="••••••••"
            value={value}
            onChangeText={onChange}
            // Maestro: iOS secureTextEntry'ye yazamıyor + "Automatic Strong Password"
            // kaplaması çıkıyor. Test modunda maskeyi kapat (login ile aynı). Prod: maskeli.
            secureTextEntry={!IS_MAESTRO}
            // Maskesizken iOS otomatik öneri fazladan karakter ekliyor (şifre eşleşmez).
            autoCorrect={false}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            togglePasswordVisibility
            // Ayrı kural kartı yok: yazarken yalnız eksik kurallar (tek kaynak `passwordHint`).
            helperText={passwordHint(value, t)}
            error={errors.password?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="register-confirmPassword-input"
            label={t('auth.confirmPassword')}
            required
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

      <RegisterConsents f={f} />

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
        title={t('common.register')}
        onPress={f.handleSubmit(f.onSubmit)}
        isLoading={registerMutation.isPending}
        disabled={registerMutation.isPending || usernameAvailability.available === false}
        style={styles.submit}
      />

      <SocialButtons social={f.social} busy={registerMutation.isPending} testIDPrefix="register" />
    </View>
  );
}
