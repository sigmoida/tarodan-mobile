import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Divider,
  Icon,
  SectionCard,
  Text,
  androidRipple,
  rippleClip,
  showPressedStyle,
  theme,
} from '@/ui';
import { useAuthStore } from '@/stores/authStore';

const { colors, spacing, iconSize, minTouchTarget } = theme;

/**
 * Hesap — kullanıcı adı ve e-posta SALT OKUNUR satırlar (iOS Ayarlar düzeni). Değiştirme
 * kendi ekranında: e-posta → `edit-profile/email`; kullanıcı adı yalnız belirlenebilir hesapta
 * (`usernameClaimed === false`) → `edit-profile/username`, belirlenmişse dokunulmaz satır.
 */
export function AccountSection() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const canClaim = user?.usernameClaimed === false;
  const showUsername = canClaim || !!user?.username;

  return (
    <SectionCard title={t('nav.account')} testID="edit-profile-account-section">
      {showUsername ? (
        <>
          <AccountRow
            testID={canClaim ? 'edit-profile-username-row' : 'username-claimed'}
            label={t('auth.usernameLabel')}
            value={user?.username ? `@${user.username}` : '—'}
            hint={canClaim ? undefined : t('profile.usernameImmutable')}
            onPress={canClaim ? () => router.push('/settings/edit-profile/username') : undefined}
          />
          <Divider style={styles.divider} />
        </>
      ) : null}
      <AccountRow
        testID="edit-profile-email-row"
        label={t('auth.email')}
        value={user?.email || '—'}
        badge={
          <Badge size="sm" variant={user?.isEmailVerified ? 'success' : 'warning'}>
            {user?.isEmailVerified ? t('security.verified') : t('auth.unverifiedTitle')}
          </Badge>
        }
        onPress={() => router.push('/settings/edit-profile/email')}
      />
    </SectionCard>
  );
}

interface AccountRowProps {
  label: string;
  value: string;
  /** Değerin altında küçük not (ör. "değiştirilemez"). */
  hint?: string;
  /** Sağda (chevron'dan önce) durum rozeti. */
  badge?: React.ReactNode;
  /** Verilirse satır dokunulur ve sağda chevron çizilir; yoksa salt okunur. */
  onPress?: () => void;
  testID?: string;
}

/** Etiket + değer (+ not) solda, durum rozeti + chevron sağda. */
function AccountRow({ label, value, hint, badge, onPress, testID }: AccountRowProps) {
  const body = (
    <>
      <View style={styles.text}>
        <Text variant="bodySm" tone="muted" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="body" tone="heading" weight="medium" numberOfLines={1}>
          {value}
        </Text>
        {hint ? (
          <Text variant="caption" tone="subtle" numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      {badge}
      {onPress ? (
        <Icon name="chevron-right" size={iconSize.md} color={colors.text.subtle} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} testID={testID}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      android_ripple={androidRipple()}
      style={({ pressed }) => [styles.row, rippleClip(), showPressedStyle(pressed) && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: minTouchTarget,
    paddingVertical: spacing[2],
  },
  text: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  pressed: { opacity: 0.6 },
  divider: { marginVertical: spacing[1] },
});
