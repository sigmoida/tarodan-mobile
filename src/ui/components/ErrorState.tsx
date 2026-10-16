import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { StateLayout, type EmptyStatePlacement } from './EmptyState';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** İkincil aksiyon (ghost buton, yeniden denemenin altında) — `EmptyState` ile aynı ad. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Bkz. `EmptyStateProps.placement`. */
  placement?: EmptyStatePlacement;
  testID?: string;
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
  secondaryLabel,
  onSecondary,
  placement,
  testID = 'error-state',
}) => {
  const { t } = useTranslation();
  return (
    <StateLayout
      icon="exclamation-circle"
      title={title ?? t('mobile.errorSomethingWrong')}
      description={message ?? t('mobile.errorBoundaryDescription')}
      placement={placement}
      testID={testID}
    >
      {onRetry || (secondaryLabel && onSecondary) ? (
        <>
          {onRetry ? (
            <Button
              variant="primary"
              title={retryLabel ?? t('mobile.errorRetry')}
              onPress={onRetry}
              style={styles.button}
            />
          ) : null}
          {secondaryLabel && onSecondary ? (
            <Button variant="ghost" title={secondaryLabel} onPress={onSecondary} style={styles.button} />
          ) : null}
        </>
      ) : null}
    </StateLayout>
  );
};

const styles = StyleSheet.create({
  button: { alignSelf: 'center' },
});
