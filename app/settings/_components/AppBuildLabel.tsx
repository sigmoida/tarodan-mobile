import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '@/ui';
import { formatAppBuildLabel, getAppBuildInfo } from '@/constants/appBuildInfo';

/**
 * The build label at the very bottom of Settings (`1.2.3 (343) · a1b2c3 (Staging)`):
 * small, muted, centred and not pressable. Testers and support read it to tell which
 * binary and OTA a report comes from.
 */
export function AppBuildLabel() {
  const { t } = useTranslation();
  const label = useMemo(() => formatAppBuildLabel(getAppBuildInfo(), t), [t]);
  if (!label) return null;
  return (
    <Text
      variant="caption"
      align="center"
      testID="settings-build-label"
      accessibilityLabel={t('mobile.appBuildAccessibilityLabel', { label })}
    >
      {label}
    </Text>
  );
}
