import React from 'react';
import { useTranslation } from 'react-i18next';
import { Divider, SectionCard, Text } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { ReauthModal } from '@/components/auth/ReauthModal';

import { useSecurityAuthGate } from './_hooks/useSecurityAuthGate';
import { useConnectedAccounts } from './_hooks/useConnectedAccounts';
import { ConnectedAccountRow } from './_components/ConnectedAccountRow';
import { ConnectedAccountsSkeleton } from './_components/ConnectedAccountsSkeleton';
import { styles } from './_lib/styles';

/**
 * Connected accounts (web `ConnectedAccountsSection`): Google and Apple, each Connected or Not
 * connected, with Connect or Disconnect behind the confirm step. Android shows the ADR 0012
 * hints in place of Connect. All state lives in `useConnectedAccounts`.
 */
export default function ConnectedAccountsScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useSecurityAuthGate();
  const f = useConnectedAccounts();
  if (!isAuthenticated) return null;

  return (
    <PageShell
      title={t('profile.connectedAccounts.title')}
      loading={!f.rows && f.isLoading}
      loadingFallback={<ConnectedAccountsSkeleton />}
      error={f.loadError}
      onRetry={f.retry}
      overlay={<ReauthModal {...f.reauthModal} />}
    >
      <SectionCard bodyStyle={styles.stack}>
        <Text variant="bodySm" tone="muted">
          {t('profile.connectedAccounts.description')}
        </Text>
        {f.rows?.map((row, index) => (
          <React.Fragment key={row.provider}>
            {index > 0 ? <Divider /> : null}
            <ConnectedAccountRow
              row={row}
              isBusy={f.busyProvider === row.provider}
              isLocked={f.busyProvider !== null}
              onConnect={() => f.connect(row.provider)}
              onDisconnect={() => f.disconnect(row.provider)}
            />
          </React.Fragment>
        ))}
      </SectionCard>
    </PageShell>
  );
}
