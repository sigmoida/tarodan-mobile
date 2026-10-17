import { useEffect, useState } from 'react';
import { useGuestStore } from '@/stores/guestStore';

type PromptType = 'favorites' | 'message' | 'purchase' | 'trade' | 'collections';

/** Misafir kullanıcı için görüntülenme sayımı + gecikmeli signup prompt. */
export function useGuestPrompt(productId: string, isAuthenticated: boolean) {
  // Aksiyonlar kararlı referans — tek tek selector: guest store yazımları (görüntülenme sayacı)
  // bu hook'u yeniden render ettirmez.
  const incrementProductView = useGuestStore((s) => s.incrementProductView);
  const getPromptType = useGuestStore((s) => s.getPromptType);
  const setLastPromptShown = useGuestStore((s) => s.setLastPromptShown);
  const canShowPrompt = useGuestStore((s) => s.canShowPrompt);

  const [showPrompt, setShowPrompt] = useState(false);
  const [promptType, setPromptType] = useState<PromptType | null>(null);

  useEffect(() => {
    if (!isAuthenticated && productId) {
      incrementProductView();
      const type = getPromptType() as PromptType | null;
      if (type && canShowPrompt()) {
        const timer = setTimeout(() => {
          setPromptType(type);
          setShowPrompt(true);
          setLastPromptShown(type);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, isAuthenticated]);

  return { showPrompt, promptType, dismissPrompt: () => setShowPrompt(false) };
}
