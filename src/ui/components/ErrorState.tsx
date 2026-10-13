import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { StateLayout } from './EmptyState';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Web: `default` geniş boşluk, `compact` kart içi. */
  size?: 'default' | 'compact';
  fullscreen?: boolean;
}

/**
 * EmptyState ile aynı web iskeleti (gri daire, gri ikon, lg/600 başlık, sm muted açıklama).
 *
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
  size = 'default',
  fullscreen = false,
}) => {
  const { t } = useTranslation();
  return (
    <StateLayout
      icon="exclamation-circle"
      title={title ?? t('mobile.errorSomethingWrong')}
      description={message ?? t('mobile.errorBoundaryDescription')}
      size={size}
      fullscreen={fullscreen}
    >
      {onRetry ? (
        <Button
          variant="primary"
          title={retryLabel ?? t('mobile.errorRetry')}
          onPress={onRetry}
          style={styles.button}
        />
      ) : null}
    </StateLayout>
  );
};

const styles = StyleSheet.create({
  button: { alignSelf: 'center' },
});
