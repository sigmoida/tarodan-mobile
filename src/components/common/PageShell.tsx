/**
 * `@/ui` PageShell'in uygulama sarmalayıcısı — `ScreenHeader` sarmalayıcısıyla aynı kural:
 * ekran `onBack` vermezse geri oku `router.back()` yapar; geri gidilecek yer yoksa ok devre
 * dışı kalır. (`@/ui` expo-router'a bağlı değil; router'ı bilen varsayılan burada.)
 */
import React from 'react';
import { router } from 'expo-router';
import { PageShell as BasePageShell, type PageShellProps } from '@/ui';

export type { PageShellProps };

export const PageShell: React.FC<PageShellProps> = ({ onBack, ...props }) => {
  const fallback = React.useCallback(() => {
    if (router.canGoBack()) router.back();
  }, []);

  return (
    <BasePageShell {...props} onBack={onBack ?? (router.canGoBack() ? fallback : undefined)} />
  );
};

export default PageShell;
