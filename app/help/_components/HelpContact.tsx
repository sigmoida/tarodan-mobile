import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Textarea, Button, SectionCard } from '@/ui';

import type { HelpController } from '../_hooks/useHelp';

/** Mesaj gönderme formu (SectionCard). */
export function HelpContact({ f }: { f: HelpController }) {
  const { t } = useTranslation();

  return (
    <SectionCard title={t('help.sendMessageTitle')}>
      <Input
        label={t('checkout.guestName')}
        value={f.contactName}
        onChangeText={f.setContactName}
      />
      <Input
        label={t('common.email')}
        value={f.contactEmail}
        onChangeText={f.setContactEmail}
        keyboardType='email-address'
        autoCapitalize='none'
      />
      <Textarea
        label={t('help.messageLabel')}
        value={f.contactMessage}
        onChangeText={f.setContactMessage}
        rows={4}
      />
      <Button
        variant='primary'
        size='lg'
        fullWidth
        title={t('common.send')}
        onPress={f.handleSubmitContact}
        isLoading={f.contactSubmitting}
        disabled={f.contactSubmitting}
      />
    </SectionCard>
  );
}
