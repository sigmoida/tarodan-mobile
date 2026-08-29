import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, Input, Textarea, Button, Divider, theme } from '@/ui';

import { styles } from '../_lib/styles';
import { buildContactOptions } from '../_lib/faq';
import type { HelpController } from '../_hooks/useHelp';

const { colors } = theme;

/** Contact options (email/whatsapp/phone), contact form, and app info footer. */
export function HelpContact({ f }: { f: HelpController }) {
  const { t } = useTranslation();
  const contactOptions = useMemo(() => buildContactOptions(t), [t]);

  return (
    <>
      <Divider style={styles.divider} />

      {/* Contact Section */}
      <View style={styles.contactSection}>
        <Text style={styles.sectionTitle}>{t('guides.contactLink')}</Text>

        <View style={styles.contactOptions}>
          {contactOptions.map(option => (
            <TouchableOpacity key={option.id} style={styles.contactOption} onPress={option.action}>
              <View style={styles.contactIcon}>
                <Ionicons name={option.icon as any} size={24} color={colors.primary[600]!} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Form */}
        <View style={styles.contactForm}>
          <Text style={styles.formTitle}>{t('help.sendMessageTitle')}</Text>
          <Input
            label={t('checkout.guestName')}
            value={f.contactName}
            onChangeText={f.setContactName}
            containerStyle={styles.input}
          />
          <Input
            label={t('common.email')}
            value={f.contactEmail}
            onChangeText={f.setContactEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={styles.input}
          />
          <Textarea
            label={t('help.messageLabel')}
            value={f.contactMessage}
            onChangeText={f.setContactMessage}
            rows={4}
            containerStyle={styles.input}
          />
          <Button
            variant="primary"
            title={t('common.send')}
            icon="send"
            onPress={f.handleSubmitContact}
            isLoading={f.contactSubmitting}
            disabled={f.contactSubmitting}
            style={styles.submitButton}
          />
        </View>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Tarodan v1.0.0</Text>
        <View style={styles.appLinks}>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.appLink}>{t('mobile.pagePrivacy')}</Text>
          </TouchableOpacity>
          <Text style={styles.appLinkDivider}>•</Text>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.appLink}>{t('mobile.pageTerms')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
