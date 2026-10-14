import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, theme } from '@/ui';

const { spacing } = theme;

interface ProfileHeaderProps {
  /** Ad yoksa (misafir) fotoğraf/baş harf yerine boş avatar dairesi (user ikonu) çizilir. */
  name?: string;
  source?: string;
  /**
   * `centered` (varsayılan; misafir): ortalı büyük avatar + altında ortalı içerik.
   * `row` (üye): solda kompakt avatar, sağında `children` (ad / e-posta); `footer` alt satırda.
   */
  layout?: 'centered' | 'row';
  /** Yalnız `row`: avatar + metin satırının altında tam genişlik satır (rozetler). */
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/** Profil sekmesi üst bandı — misafirde ortalı, üyede yatay kompakt kimlik başlığı. */
export function ProfileHeader({ name, source, layout = 'centered', footer, children }: ProfileHeaderProps) {
  const avatar = (
    <Avatar
      size={layout === 'row' ? 'header' : '2xl'}
      name={name}
      source={source}
      placeholder={name ? 'initials' : 'icon'}
    />
  );

  if (layout === 'row') {
    return (
      <View style={styles.rowHeader} testID="profile-header">
        <View style={styles.identityRow}>
          {avatar}
          <View style={styles.identityText}>{children}</View>
        </View>
        {footer}
      </View>
    );
  }

  return (
    <View style={styles.header}>
      {avatar}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing[3],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  rowHeader: {
    gap: spacing[3],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  // Metin sütunu kalan genişliği alır; uzun ad/e-posta tek satırda kısalır (avatarı itmez).
  identityText: { flex: 1, minWidth: 0, gap: spacing[0.5] },
});
