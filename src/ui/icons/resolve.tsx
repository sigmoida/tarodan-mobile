import React from 'react';
import { Icon, isIconName, type IconName, type IconProps, type IconVariant } from './Icon';
import { ioniconToIcon, type LegacyIoniconName } from './ionicons-compat';

/**
 * Bileşen prop'larının kabul ettiği ikon adı: Heroicons adı (yeni) ya da — geçiş sırasında,
 * henüz taşınmamış çağrı yerleri için — Ionicons adı (bkz. `ionicons-compat.ts`).
 */
export type IconRef = IconName | LegacyIoniconName;

export type IconRefProps = Omit<IconProps, 'name'> & { icon: IconRef };

export interface ResolvedIconRef {
  name: IconName;
  variant: IconVariant;
}

/**
 * `IconRef` -> çizilecek ikon. Önce Heroicons adı (outline varsayılan), sonra Ionicons çevirisi.
 * `variant` verilirse (açık tercih) çevirinin varyantını ezer. Çözülemezse `null`.
 */
export function resolveIcon(ref: IconRef, variant?: IconVariant): ResolvedIconRef | null {
  if (isIconName(ref)) return { name: ref, variant: variant ?? 'outline' };
  const legacy = ioniconToIcon(ref);
  if (!legacy) return null;
  return { name: legacy.name, variant: variant ?? legacy.variant };
}

/** `IconRef` alan bileşenlerin ortak çizicisi (Button/IconButton/EmptyState/FAB/Input). Çözülemezse hiçbir şey çizmez. */
export const RefIcon: React.FC<IconRefProps> = ({ icon, variant, ...rest }) => {
  const r = resolveIcon(icon, variant);
  return r ? <Icon name={r.name} variant={r.variant} {...rest} /> : null;
};
