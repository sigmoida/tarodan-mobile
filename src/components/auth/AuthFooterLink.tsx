import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, theme } from '@/ui';

export interface AuthFooterLinkProps {
  /** Düz metin ("Hesabınız yok mu?"); verilmezse satır yalnız bağlantıdır. */
  prompt?: string;
  /** Bağlantı etiketi ("Üye Ol"). */
  linkLabel: string;
  onPress: () => void;
  testID?: string;
}

/**
 * Auth ekranı alt satırı — web `AuthCard` `footer`: `text-sm text-muted` cümle + yanında
 * `font-semibold text-primary-600` bağlantı. Cümle ve bağlantı AYRI öğelerdir (iç içe `Text`
 * değil): bağlantı kendi dokunma alanına, `testID`'sine ve erişilebilirlik rolüne sahip olur,
 * dar ekranda satır sarar.
 */
export const AuthFooterLink: React.FC<AuthFooterLinkProps> = ({
  prompt,
  linkLabel,
  onPress,
  testID,
}) => (
  <View style={styles.row}>
    {prompt ? (
      <Text variant="bodySm" tone="muted">
        {prompt}
      </Text>
    ) : null}
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={linkLabel}
      hitSlop={theme.spacing[3]}
    >
      <Text variant="bodySm" tone="primary" weight="semibold">
        {linkLabel}
      </Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    // Web `AuthCard` footer `text-center`: satır (sarınca da) ortalı.
    justifyContent: 'center',
    columnGap: theme.spacing[1],
  },
});

export default AuthFooterLink;
