import { View } from 'react-native';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, Input, SectionCard, Text } from '@/ui';
import { toHandle } from '@/utils/validation';
import type { ClaimUsernameController } from '../_hooks/useClaimUsername';
import { styles } from '../_lib/styles';

/**
 * Kullanıcı adı ekranının gövdesi. Belirlenebilir hesap (`usernameClaimed === false`):
 * mevcut otomatik ad + kalıcılık uyarısı + uygunluk kontrollü giriş ("Kaydet" alt çubukta).
 */
export function UsernameClaimForm({ f }: { f: ClaimUsernameController }) {
  const { t } = useTranslation();

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
      </View>
    </SectionCard>
  );
}

/** Belirlenmiş kullanıcı adı (ekrana derin bağlantıyla / başka cihazda belirlendikten sonra gelinirse). */
export function UsernameReadOnly({ username }: { username: string }) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('auth.usernameLabel')} testID="edit-profile-username-section">
      <View style={styles.sectionBody} testID="username-claimed">
        <Text variant="h3">@{username}</Text>
        <Text variant="bodySm" tone="muted">
          {t('profile.usernameImmutable')}
        </Text>
      </View>
    </SectionCard>
  );
}
