import { useCallback, useEffect, useRef } from 'react';
import * as Router from 'expo-router';

/** Çift dokunuşta aynı ekran iki kez açılmasın: bu süre içinde ikinci dokunuş yok sayılır. */
export const SHELL_TAP_LOCK_MS = 800;

/**
 * Değişken hedefli kilitli açıcı: `go(href)` → `router.push(href)`; kısa kilitle çift dokunuş tek
 * açılışa iner (hedef ne olursa olsun — kilit hook örneği başınadır). Kategoriler ekranı gibi
 * her kutunun farklı hedefi olan yerler kullanır.
 */
export function useLockedNavigate(): (href: string) => void {
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return useCallback((href: string) => {
    if (locked.current) return;
    locked.current = true;
    timer.current = setTimeout(() => {
      locked.current = false;
    }, SHELL_TAP_LOCK_MS);
    Router.router.push(href as Router.Href);
  }, []);
}

/**
 * Kabuk düğmelerinin (arama alanı, mesajlar, bildirimler) ortak açıcısı: `router.push(href)`, kısa
 * kilitle çift dokunuş tek açılışa iner. Href sabit olmalı (düğme başına bir hook).
 */
export function useLockedPush(href: string): () => void {
  const go = useLockedNavigate();
  return useCallback(() => go(href), [go, href]);
}
