import { create } from 'zustand';

/**
 * Doğrulanmamış kullanıcının e-postası — YALNIZ bellekte (persist yok, uygulama kapanınca
 * gider). Kayıttan sonra kullanıcı `verify-email` ekranına geçtiğinde (ya da doğrulama
 * bağlantısı uygulamayı kayıt akışının ardından açtığında) "yeni bağlantı gönder" ve girişe
 * ön doldurma için e-postayı taşır. API doğrulama yanıtında e-posta dönmez, bu yüzden tek
 * kaynak burası. Sunucu verisi değil, istemci/UI durumudur (src/stores/CLAUDE.md › Client state only).
 */
interface PendingAuthEmailState {
  email: string | null;
  setEmail: (email: string | null) => void;
}

export const usePendingAuthEmailStore = create<PendingAuthEmailState>((set) => ({
  email: null,
  setEmail: (email) => set({ email: email?.trim() || null }),
}));
