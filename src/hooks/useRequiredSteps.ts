import { activeRequiredStep } from '@/lib/requiredSteps';
import { usePendingConsents } from './usePendingConsents';
import { useLegalIdentityStep } from './useLegalIdentity';

/**
 * Zorunlu adımların tek durum kaynağı (web `useRequiredSteps`): her adımın
 * verisi + şu an gösterilecek TEK adım. Kapı (`RequiredStepsGate`) bunu çizer.
 * `REQUIRED_STEPS` sırası hangisinin önce açılacağını belirler: onayı bekleyen
 * üye kimlik formunu ancak onaylardan sonra görür. Kimlik adımı yalnız bir
 * işlem `ensureLegalIdentity()` çağırdığında `pending` olur (ihtiyaç anında).
 */
export function useRequiredSteps() {
  const consents = usePendingConsents();
  const legalIdentity = useLegalIdentityStep();
  const active = activeRequiredStep({
    consents: consents.state,
    legalIdentity: legalIdentity.state,
  });
  return { active, consents, legalIdentity };
}
