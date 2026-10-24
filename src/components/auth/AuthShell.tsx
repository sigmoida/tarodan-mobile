import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { AuthHeroBanner } from '@/components/hero/AuthHeroBanner';
import type { AuthHeroPlacement } from '@/components/hero/useAuthHero';

export interface AuthShellProps {
  /** Üst bar başlığı — içerikte tekrar edilmez (logo ve büyük başlık yok). */
  title: string;
  /** Durum ekranlarında (gönderildi / doğrulandı …) formun üstünde kısa açıklama paragrafı. */
  description?: React.ReactNode;
  /** Geri oku; verilmezse `PageShell` varsayılanı (`goBackOrHome`). */
  onBack?: () => void;
  /** Geri okunu gösterme kararı (varsayılan: göster). Giriş ana girişse `false`. */
  showBack?: boolean;
  /** Yönetimden gelen auth görseli (yalnız geniş ekranda çizilir); verilmezse yok. */
  hero?: AuthHeroPlacement;
  /** Formun altında ikincil bağlantılar (web `AuthCard` `footer`). */
  footer?: React.ReactNode;
  testID?: string;
  children: React.ReactNode;
}

const { spacing } = theme;

/**
 * TÜM giriş/kayıt ekranlarının ortak kabuğu — standart `PageShell` (cam/beyaz üst bar, geri oku,
 * klavye + güvenli alan) üstüne kartsız, beyaz zeminli sade içerik: opsiyonel açıklama, form,
 * ikincil bağlantılar. Başlık YALNIZ üst barda; logo ve içerik başlığı yok. Ekran yalnız
 * alanlarını (ya da durum içeriğini) `children` olarak verir.
 * Large screens: full width at the page gutter like every other screen (web's `max-w-md` card is a
 * desktop layout; the app goes edge to edge, src/ui/CLAUDE.md › Large screens).
 */
export const AuthShell: React.FC<AuthShellProps> = ({
  title,
  description,
  onBack,
  showBack = true,
  hero,
  footer,
  testID,
  children,
}) => (
  <PageShell
    title={title}
    onBack={onBack}
    showBack={showBack}
    testID={testID}
    surface="elevated"
  >
    <View style={styles.column}>
      {hero ? <AuthHeroBanner placement={hero} style={styles.hero} /> : null}

      {description ? (
        typeof description === 'string' ? (
          <Text variant="bodySm" tone="muted">
            {description}
          </Text>
        ) : (
          description
        )
      ) : null}

      <View style={styles.content}>{children}</View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  </PageShell>
);

const styles = StyleSheet.create({
  column: {
    gap: spacing[4],
  },
  hero: {
    borderRadius: theme.radiusRole.section,
  },
  content: {
    width: '100%',
    // Input kendi alt boşluğunu (8) taşır: 8 + 8 = web `space-y-4` (16).
    gap: spacing[2],
  },
  footer: {
    gap: spacing[2],
  },
});

export default AuthShell;
