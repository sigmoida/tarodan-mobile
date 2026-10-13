import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, theme, useHeaderTopInset, Icon } from '@/ui';
import { BrandLogo } from '@/components/BrandLogo';
import { AuthHeroBanner } from '@/components/hero/AuthHeroBanner';
import type { AuthHeroPlacement } from '@/components/hero/useAuthHero';

export interface AuthBackLink {
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface AuthShellProps {
  title: string;
  description?: React.ReactNode;
  /** Başlığın üstünde "← etiket" bağlantısı (web `AuthCard` `backHref`/`backLabel`). */
  back?: AuthBackLink;
  /** Yönetimden gelen auth görseli (yalnız geniş ekranda çizilir); verilmezse yok. */
  hero?: AuthHeroPlacement;
  /** Formun altında ikincil bağlantılar (web `AuthCard` `footer`). */
  footer?: React.ReactNode;
  testID?: string;
  children: React.ReactNode;
}

const { colors, spacing } = theme;

/** Web `AuthCard`: `max-w-md`. */
const MAX_WIDTH = 448;

/**
 * TÜM giriş/kayıt ekranlarının ortak kabuğu — web `(auth)` çerçevesinin (`AuthHeroFrame` /
 * `(minimal)` + `AuthCard`) telefon görünümü: beyaz zemin, solda logo, ardından sola dayalı
 * başlık + açıklama, form, ikincil bağlantılar. Çerçeve/kart/gölge yok; turuncu zemin yok.
 * Başlık her ekranda aynı yerde. Ekran yalnız alanlarını (ya da durum içeriğini) `children`
 * olarak verir.
 */
export const AuthShell: React.FC<AuthShellProps> = ({
  title,
  description,
  back,
  hero,
  footer,
  testID,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = useHeaderTopInset();
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID={testID}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topInset + spacing[6], paddingBottom: insets.bottom + spacing[8] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <BrandLogo />

          {hero ? <AuthHeroBanner placement={hero} style={styles.hero} /> : null}

          <View style={styles.body}>
            {back ? (
              <Pressable
                testID={back.testID}
                onPress={back.onPress}
                accessibilityRole="button"
                accessibilityLabel={back.label}
                hitSlop={spacing[3]}
                style={styles.back}
              >
                <Icon name="arrow-left" size={theme.iconSize.sm} color={colors.text.muted} />
                <Text variant="bodySm" tone="muted">
                  {back.label}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.header}>
              <Text variant="h1" tone="heading" accessibilityRole="header">
                {title}
              </Text>
              {description ? (
                typeof description === 'string' ? (
                  <Text variant="bodySm" tone="muted">
                    {description}
                  </Text>
                ) : (
                  description
                )
              ) : null}
            </View>

            <View style={styles.content}>{children}</View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.elevated,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
  },
  column: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    alignItems: 'flex-start',
  },
  hero: {
    marginTop: spacing[6],
    borderRadius: theme.radiusRole.section,
  },
  body: {
    width: '100%',
    marginTop: spacing[8],
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  header: {
    marginBottom: spacing[6],
    gap: spacing[1],
  },
  content: {
    width: '100%',
    gap: spacing[2],
  },
  footer: {
    marginTop: spacing[6],
    gap: spacing[2],
  },
});

export default AuthShell;
