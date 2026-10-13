import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, PageHeader, SectionCard, Text, theme } from '@/ui';

import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { SignupPrompt } from '@/components/SignupPrompt';
import UpgradeCta from '@/components/UpgradeCta';
import { formatPrice } from '@/utils/format';
import type { ProfileController } from '../_hooks/useProfile';

const { colors, spacing, minTouchTarget } = theme;

/** Misafir profil: karşılama, üyelik faydaları, hızlı bağlantılar. Web gibi sade; ikon yok. */
export function ProfileGuestView({ f }: { f: ProfileController }) {
  const { t } = useTranslation();
  const tabInset = useTabBarInset();

  const benefits = [
    { title: t('mobile.guestListTitle'), desc: t('mobile.guestListDesc') },
    { title: t('mobile.guestTradeTitle'), desc: t('mobile.guestTradeDesc') },
    { title: t('mobile.guestFavTitle'), desc: t('mobile.guestFavDesc') },
    { title: t('mobile.guestGarageTitle'), desc: t('mobile.guestGarageDesc') },
  ];
  const quickLinks = [
    { label: t('mobile.guestBrowseListings'), to: '/search' },
    { label: t('collection.exploreCollections'), to: '/collections' },
    { label: t('cart.myCart'), to: '/cart' },
    { label: t('mobile.guestOrderTrack'), to: '/order-track' },
    { label: t('help.title'), to: '/help' },
  ];

  return (
    <AppShell>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabInset }]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title={t('profile.profile')} />

        <Card variant="bordered" style={styles.welcome}>
          <Text variant="h3">{t('profile.guestWelcomeTitle')}</Text>
          <Text variant="bodySm" tone="muted">
            {t('profile.guestWelcomeSubtitle')}
          </Text>
          <Button
            testID="profile-go-login-button"
            variant="primary"
            size="lg"
            fullWidth
            title={t('auth.loginTitle')}
            onPress={() => router.push('/(auth)/login')}
          />
          <Button
            variant="outline"
            size="lg"
            fullWidth
            title={t('auth.freeSignUp')}
            onPress={() => router.push('/(auth)/register')}
          />
        </Card>

        <SectionCard title={t('profile.guestBenefitsTitle')} bodyStyle={styles.benefits}>
          {benefits.map((b) => (
            <View key={b.title} style={styles.benefit}>
              <Text variant="label">{b.title}</Text>
              <Text variant="bodySm" tone="muted">
                {b.desc}
              </Text>
            </View>
          ))}
        </SectionCard>

        <Card variant="bordered" padding={0} style={styles.links}>
          <Text variant="overline" tone="subtle" style={styles.linksTitle}>
            {t('profile.guestQuickLinksTitle')}
          </Text>
          {quickLinks.map((q) => (
            <Pressable
              key={q.label}
              accessibilityRole="link"
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
              onPress={() => router.push(q.to as never)}
            >
              <Text variant="bodySm">{q.label}</Text>
            </Pressable>
          ))}
        </Card>

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
      </ScrollView>

      <SignupPrompt
        visible={f.showPrompt}
        onDismiss={() => f.setShowPrompt(false)}
        type={f.promptType}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[4], gap: spacing[4] },
  welcome: { gap: spacing[3] },
  benefits: { gap: spacing[3] },
  benefit: { gap: spacing[0.5] },
  links: { overflow: 'hidden' },
  linksTitle: { padding: spacing[4], paddingBottom: spacing[1] },
  linkRow: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  linkRowPressed: { backgroundColor: colors.surface.alt },
  promo: { gap: spacing[2] },
});
