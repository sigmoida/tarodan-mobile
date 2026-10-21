import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, ModalFooter, ModalMessage, Text, VStack, theme } from '@/ui';
import { Form, FormInput, useZodForm } from '@/ui/form';
import type { SignInProvider } from '@/types/sign-in-methods';
import { AppleMark, GoogleMark } from './SocialButtons';
import { SIGN_IN_PROVIDER_NAMES } from './socialProviders';
import { reauthPasswordSchema } from './_lib/reauthSchema';

/** What the confirm step asks for; `null` = closed. Built by `useReauth`. */
export interface ReauthPrompt {
  variant: 'password' | 'provider';
  /** Linked providers this device can show (provider variant only). */
  providers: SignInProvider[];
  /** The last proof's failure, shown inside the modal (never an alert over it). */
  error: string | null;
}

export interface ReauthModalProps {
  prompt: ReauthPrompt | null;
  onCancel: () => void;
  /** Called with the password as typed; the hook closes the modal before it sends it. */
  onSubmitPassword: (password: string) => void;
  /** The hook closes the modal, then opens the provider's native sheet. */
  onProvider: (provider: SignInProvider) => void;
}

/**
 * "Confirm it's you" (web `ReauthModal`): the password field when the account has one, else one
 * "Confirm with {provider}" button per linked provider this device shows. Mounted in the
 * screen's always-rendered `overlay`; all state lives in `useReauth`.
 */
export function ReauthModal({ prompt, onCancel, onSubmitPassword, onProvider }: ReauthModalProps) {
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
  const isPassword = prompt?.variant === 'password';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={t('auth.reauth.title')}
      footer={
        isPassword ? (
          <ModalFooter
            onCancel={onCancel}
            onConfirm={submit}
            confirmLabel={t('common.confirm')}
            confirmTestID="reauth-confirm"
            cancelTestID="reauth-cancel"
          />
        ) : (
          <Button variant="outline" fullWidth title={t('common.cancel')} onPress={onCancel} testID="reauth-cancel" />
        )
      }
    >
      <VStack gap={3}>
        <Text variant="bodySm" tone="muted">
          {t('auth.reauth.body')}
        </Text>
        <ModalMessage state={prompt?.error ? { type: 'error', text: prompt.error } : null} />
        {isPassword ? (
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
        ) : (
          prompt?.providers.map((provider) => (
            <Button
              key={provider}
              testID={`reauth-${provider}-button`}
              variant="outline"
              size="lg"
              fullWidth
              // eslint-disable-next-line tarodan/restrict-button-icon
              leftIcon={
                provider === 'google' ? (
                  <GoogleMark size={theme.iconSize.md} />
                ) : (
                  <AppleMark size={theme.iconSize.md} color={theme.colors.text.body} />
                )
              }
              title={t('auth.reauth.withProvider', { provider: SIGN_IN_PROVIDER_NAMES[provider] })}
              onPress={() => onProvider(provider)}
            />
          ))
        )}
      </VStack>
    </Modal>
  );
}
