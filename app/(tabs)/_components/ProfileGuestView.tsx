import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { Button, Card, Text, theme, usePageScrollValue, type IconName } from '@/ui';

import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { SignupPrompt } from '@/components/SignupPrompt';
import UpgradeCta from '@/components/UpgradeCta';
import { formatPrice } from '@/utils/format';
import type { ProfileController } from '../_hooks/useProfile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileRow } from './ProfileRow';

const { colors, spacing } = theme;

/** Misafir profil: ortalı boş avatar, giriş/kayıt düğmeleri, düz bağlantı satırları (ikon + chevron). */
export function ProfileGuestView({ f }: { f: ProfileController }) {
  const { t } = useTranslation();
  const tabInset = useTabBarInset();
  const page = usePageScrollValue();
  const tabScroll = useTabBarScrollHandler(undefined, page.scrollY);

  const quickLinks: { label: string; to: string; icon: IconName; testID?: string }[] = [
    { label: t('mobile.guestBrowseListings'), to: '/search', icon: 'magnifying-glass' },
    { label: t('collection.exploreCollections'), to: '/collections', icon: 'rectangle-stack' },
    { label: t('cart.myCart'), to: '/cart', icon: 'shopping-cart' },
    { label: t('mobile.guestOrderTrack'), to: '/order-track', icon: 'truck' },
    { label: t('help.title'), to: '/help', icon: 'question-mark-circle' },
    { label: t('mobile.settingsLanguage'), to: '/settings/language', icon: 'flag', testID: 'profile-language-link' },
  ];

  return (
    <AppShell variant="title" title={t('profile.profile')} scroll={page}>
      <Animated.ScrollView
        {...tabScroll}
        {...page.scrollProps}
        scrollEventThrottle={16}
        contentContainerStyle={page.contentStyle({ paddingBottom: tabInset })}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader>
          <View style={styles.welcome}>
            <Text variant="h2" align="center">
              {t('profile.guestWelcomeTitle')}
            </Text>
            <Text variant="bodySm" tone="muted" align="center">
              {t('profile.guestWelcomeSubtitle')}
            </Text>
          </View>
          <View style={styles.actions}>
            <Button
              testID="profile-go-login-button"
              variant="primary"
              size="lg"
              fullWidth
              title={t('auth.loginTitle')}
              onPress={() => router.push('/(auth)/login')}
            />
            <Button
              testID="profile-go-register-button"
              variant="outline"
              size="lg"
              fullWidth
              title={t('auth.freeSignUp')}
              onPress={() => router.push('/(auth)/register')}
            />
          </View>
        </ProfileHeader>

        <View style={styles.list}>
          {quickLinks.map((q) => (
            <ProfileRow
              key={q.label}
              testID={q.testID}
              icon={q.icon}
              label={q.label}
              onPress={() => router.push(q.to as never)}
            />
          ))}
        </View>

        <UpgradeCta>
          <Card variant="bordered" style={styles.promo}>
            <Text variant="h3">Premium Üyelik</Text>
            <Text variant="bodySm" tone="muted">
              Sınırsız ilan, takas özelliği, Digital Garage ve daha fazlası için Premium üye olun!
            </Text>
            <Text variant="bodySm" tone="muted">
              Aylık sadece
            </Text>
            <Text variant="h2" color={colors.primary[600]!}>
              {formatPrice(99)}
            </Text>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              title={t('mobile.guestGoPremium')}
              onPress={() => router.push('/(auth)/register')}
            />
          </Card>
        </UpgradeCta>
      </Animated.ScrollView>

      <SignupPrompt
        visible={f.showPrompt}
        onDismiss={() => f.setShowPrompt(false)}
        type={f.promptType}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  welcome: { alignItems: 'center', gap: spacing[1] },
  actions: { alignSelf: 'stretch', gap: spacing[3] },
  list: { paddingBottom: spacing[2] },
  promo: { gap: spacing[2], marginHorizontal: spacing[4], marginBottom: spacing[4] },
});
