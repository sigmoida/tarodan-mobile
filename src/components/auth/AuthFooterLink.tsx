import React from 'react';
import { Text } from '@/ui';

export interface AuthFooterLinkProps {
  /** Düz metin ("Hesabınız yok mu?"). */
  prompt: string;
  /** Bağlantı etiketi ("Kayıt Ol"). */
  linkLabel: string;
  onPress: () => void;
  testID?: string;
}

/**
 * Auth ekranı alt satırı — web `AuthCard` `footer`: `text-sm text-muted` cümle + satır içinde
 * `font-semibold text-primary-600` bağlantı. Cümle ve bağlantı tek `Text` içinde akar (dar
 * ekranda doğal sarar).
 */
export const AuthFooterLink: React.FC<AuthFooterLinkProps> = ({
  prompt,
  linkLabel,
  onPress,
  testID,
}) => (
  <Text variant="bodySm" tone="muted">
    {`${prompt} `}
    <Text
      variant="bodySm"
      tone="primary"
      weight="semibold"
      onPress={onPress}
      accessibilityRole="link"
      testID={testID}
    >
      {linkLabel}
    </Text>
  </Text>
);

export default AuthFooterLink;
