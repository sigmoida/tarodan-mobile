/**
 * A-3 inceleme #7 · Yardım Merkezi SSS'i iade süresini politika değerinden
 * alır (SSS ekranı `app/faq.tsx` ile aynı kaynak) — sabit 14 gün değil.
 */
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { makeTestQueryClient } from '@/test-utils';
import { FALLBACK_TIMING_POLICY, timingMessageValues } from '@/lib/shared/timingPolicy';

jest.mock('@/lib/api', () => ({
  timingRulesApi: { getPolicy: jest.fn() },
  supportApi: { createTicket: jest.fn(), guestContact: jest.fn() },
}));
import { timingRulesApi } from '@/lib/api';
import { buildFaqCategories } from '../_lib/faq';
import { useHelp } from '../_hooks/useHelp';

const returnAnswer = (categories: ReturnType<typeof buildFaqCategories>) =>
  categories
    .find((c) => c.id === 'buying')!
    .questions.find((q) => q.q === i18n.t('helpFaq.buying.returnPolicy.q'))!.a;

it('iade cevabı verilen politika değerini basar', () => {
  const timing = { ...timingMessageValues(FALLBACK_TIMING_POLICY), returnWindowDays: 30 };
  expect(returnAnswer(buildFaqCategories(i18n.t, timing))).toContain('30 gün içinde');
});

it('useHelp politikayı GET /timing-rules sorgusundan okur', async () => {
  (timingRulesApi.getPolicy as jest.Mock).mockResolvedValue({
    data: { returnWindowDays: { value: 21, unit: 'days' } },
  });
  const client = makeTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useHelp(), { wrapper });
  await waitFor(() => {
    const buying = result.current.filteredFAQs.find((c) => c.id === 'buying')!;
    expect(buying.questions.some((q) => q.a.includes('21 gün içinde'))).toBe(true);
  });
});
