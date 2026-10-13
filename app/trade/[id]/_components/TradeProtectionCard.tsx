import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/ui';

/** Takas koruma kartı — yalnızca aktif/erken statülerde. */
export function TradeProtectionCard({ status }: { status: string }) {
  const { t } = useTranslation();
  if (!(status === 'pending' || status === 'accepted' || status === 'awaiting_payment')) return null;
  return (
    <Alert variant="success" title={t('trade.protectionProgramTitle')}>
      {t('trade.protectionProgramDesc')}
    </Alert>
  );
}
