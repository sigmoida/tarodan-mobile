import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, theme, toast, type IconButtonSize } from '@/ui';
import { copyToClipboard } from '@/lib/clipboard';

/** Kopyalandı onayının (tik) görünür kalma süresi — web `CopyButton` ile aynı. */
export const COPY_CONFIRM_MS = 1500;

export interface CopyButtonProps {
  /** Panoya yazılacak değer. */
  value: string;
  /** Başarı toast'ı (ör. `t('trade.trackingCopied')`). */
  successMessage: string;
  size?: IconButtonSize;
  testID?: string;
}

/**
 * Web `components/ui/CopyButton` karşılığı: değeri panoya yazar, ikon 1,5 sn
 * pano → tik (success rengi) döner ve başarı toast'ı gösterir. Takip numarası,
 * kargo referansı gibi kopyalanabilir her değerde kullanılır. Görsel web ölçüsünde
 * (sm), dokunma alanı `IconButton` hitSlop'u ile ≥ 44pt.
 */
export function CopyButton({ value, successMessage, size = 'sm', testID }: CopyButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onCopy = useCallback(() => {
    if (!copyToClipboard(value)) return;
    toast.success(successMessage);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPY_CONFIRM_MS);
  }, [value, successMessage]);

  return (
    <IconButton
      testID={testID}
      icon={copied ? 'check' : 'clipboard-document'}
      size={size}
      color={copied ? theme.colors.success[600] : undefined}
      accessibilityLabel={t('common.copy')}
      onPress={onCopy}
    />
  );
}
