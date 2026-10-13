import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface SideMenuApi {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const noop = (): void => undefined;
const NOOP_API: SideMenuApi = { isOpen: false, open: noop, close: noop };

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
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);
  return <SideMenuContext.Provider value={value}>{children}</SideMenuContext.Provider>;
}

export function useSideMenu(): SideMenuApi {
  return useContext(SideMenuContext);
}
