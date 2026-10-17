import { create } from 'zustand';

/**
 * "Doğrulama bağlantısını tekrar gönder" bekleme süresinin TEK kaynağı — e-posta anahtarlı,
 * bitiş zaman damgası olarak bellekte (persist yok). Bileşen state'inde tutulsa ekran
 * yeniden kurulunca (kayıt → doğrulama, boş ↔ hata durumu) sıfırlanır ve kullanıcı sunucunun
 * oran sınırına çarpardı. Kayıt ekranı ve doğrulama ekranı aynı adres için aynı süreyi görür.
 */
interface ResendCooldownState {
  /** Normalize e-posta → bitiş zamanı (epoch ms). */
  until: Record<string, number>;
  start: (email: string, seconds: number) => void;
  reset: () => void;
}

export const cooldownKey = (email: string) => email.trim().toLowerCase();

export const useResendCooldownStore = create<ResendCooldownState>((set) => ({
  until: {},
  start: (email, seconds) => {
    const key = cooldownKey(email);
    if (!key) return;
    set((s) => ({ until: { ...s.until, [key]: Date.now() + seconds * 1000 } }));
  },
  reset: () => set({ until: {} }),
}));

/** Kayıt anında (ilk e-posta zaten gitti) ve gönderim sonrası çağrılır. */
export const startResendCooldown = (email: string, seconds: number) =>
  useResendCooldownStore.getState().start(email, seconds);
