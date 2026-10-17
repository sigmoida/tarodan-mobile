import React from 'react';
import { StyleSheet } from 'react-native';
import { Alert, Button, Text, theme } from '@/ui';

const { spacing } = theme;

export interface RequirementPromptProps {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  testID?: string;
}

/**
 * Ön koşul istemi (web `BankGate` / `AddressGate`: `bg-danger-50 border-danger-200`, başlık,
 * açıklama, birincil düğme). IBAN ve kargo adresi istemleri aynı kalıbı paylaşır.
 */
export function RequirementPrompt({ title, body, actionLabel, onAction, testID }: RequirementPromptProps) {
  return (
    <Alert variant="danger" title={title} testID={testID}>
      <Text variant="bodySm" tone="danger" style={styles.body}>
        {body}
      </Text>
      <Button title={actionLabel} onPress={onAction} />
    </Alert>
  );
}

const styles = StyleSheet.create({
  body: {
    marginBottom: spacing[3],
  },
});
