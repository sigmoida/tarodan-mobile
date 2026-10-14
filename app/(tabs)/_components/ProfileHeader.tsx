import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, theme } from '@/ui';

const { spacing } = theme;

interface ProfileHeaderProps {
  /** Ad yoksa (misafir) fotoğraf/baş harf yerine boş avatar dairesi (user ikonu) çizilir. */
  name?: string;
  source?: string;
  children?: React.ReactNode;
}

/** Profil sekmesi üst bandı: ortalı büyük avatar + altında ortalı içerik (ad, e-posta, düğmeler). */
export function ProfileHeader({ name, source, children }: ProfileHeaderProps) {
  return (
    <View style={styles.header}>
      <Avatar
        size="2xl"
        name={name}
        source={source}
        placeholder={name ? 'initials' : 'icon'}
      />
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
});
