import { View } from 'react-native';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, SectionCard, Text } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { toHandle } from '@/utils/validation';
import { useClaimUsername } from '../_hooks/useClaimUsername';
import { styles } from '../_lib/styles';

/**
 * Kullanıcı adı — çoğu hesapta SALT OKUNUR bir satır (ad bir kez belirlenir,
 * değiştirilemez). Yalnız sunucunun izin verdiği hesapta (`usernameClaimed === false`,
 * sosyal girişle açılmış) satır içi belirleme formu açılır. Alt çubuktaki profil
 * "Kaydet"inden bağımsızdır.
 */
export function UsernameSection() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  if (user?.usernameClaimed === false) return <ClaimUsernameCard />;
  if (!user?.username) return null;

  return (
    <SectionCard title={t('auth.usernameLabel')} testID="edit-profile-username-section">
      <View style={styles.sectionBody} testID="username-claimed">
        <Text variant="h3">@{user.username}</Text>
        <Text variant="bodySm" tone="muted">
          {t('profile.usernameImmutable')}
        </Text>
      </View>
    </SectionCard>
  );
}

/** Belirlenebilir hesap: uygunluk kontrolü + kalıcılık uyarısı + onaylı kayıt. */
function ClaimUsernameCard() {
  const { t } = useTranslation();
  const f = useClaimUsername();

  return (
    <SectionCard title={t('auth.usernameLabel')} testID="edit-profile-username-section">
      <View style={styles.sectionBody}>
        {f.currentUsername ? (
          <Text variant="bodySm" tone="muted">
            {t('profile.usernameAutoAssigned', { username: f.currentUsername })}
          </Text>
        ) : null}
        <Alert variant="warning" testID="username-permanent-warning">
          {t('settings.usernamePermanentWarningBody')}
        </Alert>
        <Controller
          control={f.form.control}
          name="username"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              testID="username-input"
              accessibilityLabel={t('auth.usernameLabel')}
              placeholder={t('auth.usernamePlaceholder')}
              value={value ?? ''}
              // Girişte küçük harfe çevir: alan kalıcı olacak handle'ı olduğu gibi gösterir.
              onChangeText={(text) => onChange(toHandle(text))}
              onBlur={onBlur}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              rightIcon={f.status.statusIcon}
              error={f.status.error}
              helperText={f.status.helper}
            />
          )}
        />
        <Button
          variant="outline"
          title={t('common.save')}
          onPress={f.submit}
          isLoading={f.isSubmitting}
          disabled={!f.canSubmit}
          testID="username-submit"
        />
      </View>
    </SectionCard>
  );
}
