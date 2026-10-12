import { activeRequiredStep } from '@/lib/requiredSteps';
import { usePendingConsents } from './usePendingConsents';

/**
 * Zorunlu adımların tek durum kaynağı (web `useRequiredSteps`): her adımın
 * verisi + şu an gösterilecek TEK adım. Kapı (`RequiredStepsGate`) bunu çizer.
 * Yeni bir adım (B3: ihtiyaç anında yasal kimlik) buraya bir durum olarak
 * eklenir; `REQUIRED_STEPS` sırası hangisinin önce açılacağını belirler.
 */
export function useRequiredSteps() {
  const consents = usePendingConsents();
  const active = activeRequiredStep({ consents: consents.state });
  return { active, consents };
}
