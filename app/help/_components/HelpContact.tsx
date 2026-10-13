import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, Input, Textarea, Button, SectionCard, theme } from '@/ui';
import { DocLink } from '@/components/content/DocBlocks';

import { styles } from '../_lib/styles';
import { buildContactOptions } from '../_lib/faq';
import type { HelpController } from '../_hooks/useHelp';

const { colors, iconSize } = theme;

/** İletişim seçenekleri (e-posta), mesaj formu ve uygulama bilgisi — SectionCard'lar. */
export function HelpContact({ f }: { f: HelpController }) {
  const { t } = useTranslation();
  const contactOptions = useMemo(() => buildContactOptions(t), [t]);

  return (
    <>
      <SectionCard title={t('guides.contactLink')}>
        {contactOptions.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="link"
            style={styles.contactOption}
            onPress={option.action}
          >
            <View style={styles.contactInfo}>
              <Text variant="bodySm" tone="muted">
                {option.title}
              </Text>
              <Text variant="bodySm" tone="primary">
                {option.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={iconSize.md} color={colors.text.muted} />
          </Pressable>
        ))}
      </SectionCard>

      <SectionCard title={t('help.sendMessageTitle')}>
        <Input label={t('checkout.guestName')} value={f.contactName} onChangeText={f.setContactName} />
        <Input
          label={t('common.email')}
          value={f.contactEmail}
          onChangeText={f.setContactEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Textarea
          label={t('help.messageLabel')}
          value={f.contactMessage}
          onChangeText={f.setContactMessage}
          rows={4}
        />
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t('common.send')}
          onPress={f.handleSubmitContact}
          isLoading={f.contactSubmitting}
          disabled={f.contactSubmitting}
        />
      </SectionCard>

      <View style={styles.appInfo}>
        <Text variant="caption" tone="subtle">
          Tarodan v1.0.0
        </Text>
        <View style={styles.appLinks}>
          <DocLink label={t('mobile.pagePrivacy')} onPress={() => router.push('/privacy')} />
          <DocLink label={t('mobile.pageTerms')} onPress={() => router.push('/terms')} />
        </View>
      </View>
    </>
  );
}
