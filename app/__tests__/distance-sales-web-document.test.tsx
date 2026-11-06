/**
 * The distance sales contract (pre-information form) is not rendered natively: the route shows
 * web's app-mode page `/app/distance-sales` in a WebView (`LegalWebPage`, `@/lib/legal/webDocs`),
 * and `src/constants/legalFacts.ts` holds only the legal entity and support e-mail. So the
 * installment clause of plan AS-L1 (new `-draft` version in `legal-consent.ts`) reaches mobile
 * with the web text (task W1); mobile has no contract copy to keep in step.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as legalFacts from '@/constants/legalFacts';
import { legalEmbedUrl } from '@/lib/legal/webDocs';

jest.mock('@/components/legal/LegalWebPage', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LegalWebPage: ({ doc }: { doc: string }) => <Text testID="legal-web-page">{doc}</Text> };
});

import DistanceSalesScreen from '../distance-sales';

it('renders the web distance sales document, not a native text', () => {
  render(<DistanceSalesScreen />);
  expect(screen.getByTestId('legal-web-page')).toHaveTextContent('distance-sales');
  expect(legalEmbedUrl('distance-sales', 'tr')).toMatch(/\/app\/distance-sales$/);
  expect(legalEmbedUrl('distance-sales', 'en')).toMatch(/\/en\/app\/distance-sales$/);
});

it('legalFacts carries no contract text (only the entity and the support e-mail)', () => {
  expect(Object.keys(legalFacts).sort()).toEqual(['LEGAL_ENTITY', 'SUPPORT_EMAIL']);
});
