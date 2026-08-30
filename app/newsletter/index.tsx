import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, Button, Input, Text, appAlert } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { guestApi } from '@/lib/api';
import { ScreenHeader } from '@/components/common';

const { colors } = theme;

export default function NewsletterScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  /**
   * KVKK/ETK açık rızası — İŞARETSİZ başlar ve abonelik kapısıdır.
   *
   * Sunucuya güvenilemez: 2026-08-11 ölçümünde `/newsletter/subscribe` yalnız
   * `email` istiyor ve `newsletter: false` ile bile başarı dönüyor. Yani
   * "ikisi de false → 400" kuralı staging'de YOK; kapı tamamen burada.
   */
  const [consent, setConsent] = useState(false);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      // Web paritesi (newsletter/page.tsx): NewsletterSubscribeDto yalnızca email/newsletter
      // kabul eder; backend 'name' alanını desteklemez (whitelist ile sessizce strip edilir).
      return guestApi.post('/newsletter/subscribe', {
        email: email.trim().toLowerCase(),
        // Kullanıcının verdiği rıza — sabit `true` değil.
        newsletter: consent,
      });
    },
    onSuccess: () => {
      appAlert(
        t('marketing.newsletter.successTitle'),
        t('marketing.newsletter.successMessage'),
        [{ text: t('common.ok'), onPress: () => router.back() }],
      );
      setEmail('');
      setConsent(false);
    },
    onError: (e: any) =>
      appAlert(t('common.error'), e?.response?.data?.message || t('marketing.newsletter.subscriptionFailed')),
  });

  const handleSubmit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return appAlert(t('common.missing'), t('marketing.newsletter.emailInvalid'));
    subscribeMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('mobile.settingsNewsletter')} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.scrollBody}>
          <View style={styles.iconWrap}>
            <Ionicons name="mail-unread-outline" size={72} color={colors.primary[600]!} />
          </View>

          <Text style={styles.title}>{t('marketing.newsletter.title')}</Text>
          <Text style={styles.subtitle}>
            {t('marketing.newsletter.subtitle')}
          </Text>

          <Input
            testID="newsletter-email"
            label={`${t('marketing.newsletter.emailLabel')} *`}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={styles.input}
          />

          {/* Açık rıza — işaretsiz başlar, abone olmanın kapısıdır. */}
          <View style={styles.consentRow}>
            <TouchableOpacity
              testID="newsletter-consent"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              onPress={() => setConsent((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={consent ? 'checkbox' : 'square-outline'}
                size={22}
                color={consent ? colors.primary[600]! : colors.text.muted}
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentText}>
                {t('marketing.newsletter.consentText')}
              </Text>
              <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
                <Text style={styles.consentLink}>{t('mobile.pagePrivacy')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Button
            testID="newsletter-submit"
            variant="primary"
            title={t('marketing.newsletter.subscribeButton')}
            onPress={handleSubmit}
            isLoading={subscribeMutation.isPending}
            disabled={subscribeMutation.isPending || !email || !consent}
            style={styles.btn}
          />

          <Button
            variant="ghost"
            title={t('marketing.newsletter.cancelLinkText')}
            onPress={() => router.push('/newsletter/unsubscribe' as any)}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  consentText: { color: colors.text.body, fontSize: 13, lineHeight: 18 },
  consentLink: {
    color: colors.primary[600]!,
    textDecorationLine: 'underline',
    fontSize: 13,
    marginTop: theme.spacing[1],
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  scrollBody: {
    padding: theme.spacing[6],
    gap: theme.spacing[2.5],
  },
  iconWrap: {
    alignItems: 'center',
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.heading,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.surface.DEFAULT,
  },
  btn: {
    borderRadius: theme.radius['2xl'],
    marginTop: theme.spacing[2],
  },
});
