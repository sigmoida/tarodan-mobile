import { router } from 'expo-router';
import { Snackbar } from '@/ui';
import { PageShell } from '@/components/common/PageShell';

import { useNewTrade } from './_hooks/useNewTrade';
import { NewTradeGate } from './_components/NewTradeGate';
import { StepIndicator, Step1MyItems, Step2TheirItems, Step3Review } from './_components/NewTradeSteps';

/**
 * New trade wizard — THIN screen. The `useNewTrade` controller owns the 3-step
 * state, product queries, and the create-trade mutation; this file renders the
 * gate, step indicator and the active step inside the shared PageShell.
 *
 * Not: adım bileşenleri (`NewTradeSteps`, `TradeProductCard`) ve `_lib/styles.ts` bu pakette
 * DEĞİŞMEDİ — ürün kartı birleştirmesi P1 Keşif paketinde (çakışmasın diye).
 */
export default function NewTradeScreen() {
  const f = useNewTrade();

  const gate = NewTradeGate({ f });
  if (gate) return gate;

  return (
    <PageShell
      title="Takas Teklifi"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      overlay={
        <Snackbar
          visible={f.snackbar.visible}
          onDismiss={() => f.setSnackbar({ ...f.snackbar, visible: false })}
          duration={3000}
        >
          {f.snackbar.message}
        </Snackbar>
      }
    >
      <StepIndicator step={f.step} />

      {f.step === 1 && <Step1MyItems f={f} />}
      {f.step === 2 && <Step2TheirItems f={f} />}
      {f.step === 3 && <Step3Review f={f} />}
    </PageShell>
  );
}
