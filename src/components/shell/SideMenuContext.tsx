import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Router from 'expo-router';

export interface SideMenuApi {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /**
   * Soldan kaydırarak açma şu an izinli mi? Yalnız ☰'lı (Profil) sekme kökü odaktayken `true`
   * (`useEdgeSwipeWhenFocused`); `SideMenuHost` bunu okur.
   */
  edgeSwipeEnabled: boolean;
  setEdgeSwipeEnabled: (enabled: boolean) => void;
}

const noop = (): void => undefined;
const NOOP_API: SideMenuApi = {
  isOpen: false,
  open: noop,
  close: noop,
  edgeSwipeEnabled: false,
  setEdgeSwipeEnabled: noop,
};

const SideMenuContext = createContext<SideMenuApi>(NOOP_API);

/**
 * Yan menünün (drawer) açık/kapalı durumu. Kök layout'ta BİR kez sarılır; `SideMenuHost` durumu
 * okur, `AppShell` hamburgeri `open()` çağırır. Sağlayıcı yoksa (yalnız AppShell render eden
 * testler) hook işlevsiz bir yedek döner — menüyü açmaya çalışmak zararsızdır.
 */
export function SideMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  // Menü açıkken dışarıdan gezinme gelirse (push bildirimi, derin bağlantı, oturum düşüp login)
  // yeni ekran menünün altında kalmasın: rota değişince menü kapanır.
  // `* as Router`: expo-router'ı kısmi mock'layan testlerde usePathname yoksa no-op (AppShell ile aynı kalıp).
  const pathname = Router.usePathname?.() ?? '';
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    setOpen(false);
  }, [pathname]);
  const [edgeSwipeEnabled, setEdgeSwipeEnabled] = useState(false);
  const value = useMemo(
    () => ({ isOpen, open, close, edgeSwipeEnabled, setEdgeSwipeEnabled }),
    [isOpen, open, close, edgeSwipeEnabled],
  );
  return <SideMenuContext.Provider value={value}>{children}</SideMenuContext.Provider>;
}

export function useSideMenu(): SideMenuApi {
  return useContext(SideMenuContext);
}

/**
 * Çağıran ekran ODAKTAyken (ve `active` ise) soldan kaydırarak yan menü açmayı etkinleştirir; odak
 * kaybında / sökümde kapatır. Yığında üstte başka ekran varken alttaki Profil odakta sayılmaz →
 * sol kenar iOS'un "kaydırarak geri" jestine kalır. `* as Router`: `useFocusEffect`'i olmayan kısmi
 * expo-router mock'larında no-op.
 */
export function useEdgeSwipeWhenFocused(active: boolean): void {
  const { setEdgeSwipeEnabled } = useSideMenu();
  const onFocus = useCallback(() => {
    if (!active) return undefined;
    setEdgeSwipeEnabled(true);
    return () => setEdgeSwipeEnabled(false);
  }, [active, setEdgeSwipeEnabled]);
  Router.useFocusEffect?.(onFocus);
}
