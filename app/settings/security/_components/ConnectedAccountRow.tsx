import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Text } from '@/ui';
import { ProviderMark } from '@/components/auth/SocialButtons';
import { SIGN_IN_PROVIDER_NAMES } from '@/components/auth/socialProviders';
import type { ConnectedAccountRowModel } from '../_lib/connectedAccounts';
import { styles } from '../_lib/styles';

export interface ConnectedAccountRowProps {
  row: ConnectedAccountRowModel;
  /** This row's flow is running (sheet, confirmation, step-up or write). */
  isBusy: boolean;
  /** Any row's flow is running: every button waits. */
  isLocked: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

/**
 * One provider (web `ProviderRow`): brand mark, name, Connected / Not connected badge, the
 * provider e-mail when linked, and the action. A linked row has Disconnect, disabled with the D1
 * hint when `canUnlink` is false. A row that is not linked has Connect, or the platform hint in
 * its place (ADR 0012).
 */
export function ConnectedAccountRow({ row, isBusy, isLocked, onConnect, onDisconnect }: ConnectedAccountRowProps) {
  const { t } = useTranslation();
  const { provider, linked, canUnlink, offer } = row;
  const name = SIGN_IN_PROVIDER_NAMES[provider];
  const hint = linked
    ? canUnlink
      ? null
      : t('profile.connectedAccounts.lastMethodHint')
    : offer?.kind === 'hint'
      ? t(offer.hint)
      : null;

  let action: React.ReactNode = null;
  if (linked) {
    action = (
      <Button
        variant="outline"
        size="sm"
        title={t('profile.connectedAccounts.disconnect')}
        accessibilityLabel={`${t('profile.connectedAccounts.disconnect')} ${name}`}
        accessibilityHint={hint ?? undefined}
        onPress={onDisconnect}
        isLoading={isBusy}
        disabled={!canUnlink || isLocked}
        testID={`connected-${provider}-disconnect`}
      />
    );
  } else if (offer?.kind === 'connect') {
    action = (
      <Button
        variant="outline"
        size="sm"
        title={t('profile.connectedAccounts.connect')}
        accessibilityLabel={`${t('profile.connectedAccounts.connect')} ${name}`}
        onPress={onConnect}
        isLoading={isBusy}
        disabled={isLocked}
        testID={`connected-${provider}-connect`}
      />
    );
  }

  return (
    <View style={styles.stack} testID={`connected-${provider}-row`}>
      <View style={styles.settingRow}>
        <View style={styles.providerHead}>
          <ProviderMark provider={provider} />
          <View style={styles.settingText}>
            <View style={styles.providerTitle}>
              <Text variant="bodySm" tone="heading" weight="medium">
                {name}
              </Text>
              <Badge variant={linked ? 'success' : 'outline'} size="sm" testID={`connected-${provider}-status`}>
                {linked ? t('profile.connectedAccounts.connected') : t('profile.connectedAccounts.notConnected')}
              </Badge>
            </View>
            {linked?.email ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {t('profile.connectedAccounts.connectedAs', { email: linked.email })}
              </Text>
            ) : null}
          </View>
        </View>
        {action}
      </View>
      {hint ? (
        <Text variant="caption" tone="muted" testID={`connected-${provider}-hint`}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
