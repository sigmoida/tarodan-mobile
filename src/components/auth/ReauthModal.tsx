import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, ModalFooter, ModalMessage, Text, VStack } from '@/ui';
import { Form, FormInput, useZodForm } from '@/ui/form';
import type { SignInProvider } from '@/types/sign-in-methods';
import { ProviderButton } from './SocialButtons';
import { SIGN_IN_PROVIDER_NAMES } from './socialProviders';
import { reauthPasswordSchema } from './_lib/reauthSchema';

/** What the confirm step asks for; `null` = closed. Built by `useReauth`. */
export interface ReauthPrompt {
  /**
   * `password`: the account has one. `provider`: one button per linked provider this device
   * shows. `loadError`: the sign-in methods could not be read (web `LoadErrorAlert`): the error
   * and a retry, never a guess about which proof to ask for.
   */
  variant: 'password' | 'provider' | 'loadError';
  /** Linked providers this device can show (provider variant only). */
  providers: SignInProvider[];
  /** The last failure, shown inside the modal (never an alert over it). */
  error: string | null;
}

export interface ReauthModalProps {
  prompt: ReauthPrompt | null;
  onCancel: () => void;
  /** Called with the password as typed; the hook closes the modal before it sends it. */
  onSubmitPassword: (password: string) => void;
  /** The hook closes the modal, then opens the provider's native sheet. */
  onProvider: (provider: SignInProvider) => void;
  /** Read the sign-in methods again (load-error variant); the hook closes the modal first. */
  onRetry: () => void;
}

/**
 * "Confirm it's you" (web `ReauthModal`): the password field when the account has one, else one
 * "Confirm with {provider}" button per linked provider this device shows, or the load error with
 * a retry. Mounted in the screen's always-rendered `overlay`; all state lives in `useReauth`.
 */
export function ReauthModal({ prompt, onCancel, onSubmitPassword, onProvider, onRetry }: ReauthModalProps) {
  const { t } = useTranslation();
  const form = useZodForm(useMemo(() => reauthPasswordSchema(t), [t]), {
    defaultValues: { password: '' },
  });
  const isOpen = prompt !== null;

  // Every opening starts empty (a reopen after a wrong password too).
  useEffect(() => {
    if (isOpen) form.reset({ password: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const submit = form.handleSubmit(({ password }) => onSubmitPassword(password));
  const variant = prompt?.variant;

  let footer: React.ReactNode = (
    <Button variant="outline" fullWidth title={t('common.cancel')} onPress={onCancel} testID="reauth-cancel" />
  );
  if (variant === 'password' || variant === 'loadError') {
    footer = (
      <ModalFooter
        onCancel={onCancel}
        onConfirm={variant === 'password' ? submit : onRetry}
        confirmLabel={variant === 'password' ? t('common.confirm') : t('common.tryAgain')}
        confirmTestID={variant === 'password' ? 'reauth-confirm' : 'reauth-retry'}
        cancelTestID="reauth-cancel"
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={t('auth.reauth.title')} footer={footer}>
      <VStack gap={3}>
        <Text variant="bodySm" tone="muted">
          {t('auth.reauth.body')}
        </Text>
        <ModalMessage state={prompt?.error ? { type: 'error', text: prompt.error } : null} />
        {variant === 'password' ? (
          <Form form={form}>
            <FormInput
              name="password"
              label={t('auth.reauth.withPassword')}
              secureTextEntry
              togglePasswordVisibility
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submit}
              testID="reauth-password-input"
            />
          </Form>
        ) : null}
        {variant === 'provider'
          ? prompt?.providers.map((provider) => (
              <ProviderButton
                key={provider}
                provider={provider}
                testID={`reauth-${provider}-button`}
                title={t('auth.reauth.withProvider', { provider: SIGN_IN_PROVIDER_NAMES[provider] })}
                onPress={() => onProvider(provider)}
              />
            ))
          : null}
      </VStack>
    </Modal>
  );
}
