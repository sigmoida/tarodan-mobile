/**
 * `@/ui` PageShell'in uygulama sarmalayıcısı — `ScreenHeader` sarmalayıcısıyla aynı kural:
 * ekran `onBack` vermezse geri oku `goBackOrHome` yapar (geçmiş yoksa `/(tabs)`'a replace).
 * (`@/ui` expo-router'a bağlı değil; router'ı bilen varsayılan burada.)
 */
import React from 'react';
import { PageShell as BasePageShell, type PageShellProps } from '@/ui';
import { goBackOrHome } from './goBackOrHome';

export type { PageShellProps };

export const PageShell: React.FC<PageShellProps> = ({ onBack, ...props }) => (
  <BasePageShell {...props} onBack={onBack ?? goBackOrHome} />
);

export default PageShell;
