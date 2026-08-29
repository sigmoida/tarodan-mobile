import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Text } from './Text';
import { theme } from '../lib/theme';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  fullscreen?: boolean;
}

const { colors, spacing, radius } = theme;

/**
 * Varsayılan başlık/mesaj/buton metni `mobile.errorSomethingWrong` /
 * `mobile.errorBoundaryDescription` / `mobile.errorRetry`'yi REUSE eder —
 * `ErrorBoundary`'nin de kullandığı aynı üç anahtar (bkz. o dosya), ayrı bir
 * kopya açmak yerine.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  retryLabel,
  fullscreen = false,
}) => {
  const { t } = useTranslation();
  return (
    <View style={[styles.container, fullscreen && styles.fullscreen]}>
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.danger[600]!} />
      </View>
      <Text variant="h3" align="center">
        {title ?? t('mobile.errorSomethingWrong')}
      </Text>
      <Text variant="bodySm" tone="muted" align="center" style={styles.message}>
        {message ?? t('mobile.errorBoundaryDescription')}
      </Text>
      {onRetry ? (
        <Button
          variant="primary"
          title={retryLabel ?? t('mobile.errorRetry')}
          onPress={onRetry}
          style={styles.button}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  fullscreen: { flex: 1 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.danger[50]!,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  message: { marginTop: spacing[2] },
  // Button varsayılan alignSelf:'flex-start' kullanır; ortalı içeriğe hizala.
  button: { marginTop: spacing[5], alignSelf: 'center' },
});
