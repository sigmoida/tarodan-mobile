import React from 'react';
import { render } from '@testing-library/react-native';
import { TrustBadges } from '../TrustBadges';
import { MAX_TRUST_BADGES, resolveTrustBadges } from '@/lib/hero/heroView';

const raw = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `b${i}`,
    icon: 'shield-check',
    title: { tr: `Rozet ${i}` },
    description: { tr: 'Açıklama' },
  }));

describe('TrustBadges', () => {
  it('liste boşsa hiçbir şey çizmez', () => {
    const api = render(<TrustBadges badges={[]} />);
    expect(api.queryByTestId('trust-badges')).toBeNull();
  });

  it('başlıkları çizer; açıklama telefonda gösterilmez', () => {
    const api = render(<TrustBadges badges={resolveTrustBadges(raw(3), 'tr')} />);
    expect(api.getByText('Rozet 0')).toBeTruthy();
    expect(api.getByText('Rozet 2')).toBeTruthy();
    expect(api.queryByText('Açıklama')).toBeNull();
  });

  it('çok sayıda rozet üst sınırla kesilir (taşma yok)', () => {
    const api = render(<TrustBadges badges={resolveTrustBadges(raw(40), 'tr')} />);
    expect(api.getByText(`Rozet ${MAX_TRUST_BADGES - 1}`)).toBeTruthy();
    expect(api.queryByText(`Rozet ${MAX_TRUST_BADGES}`)).toBeNull();
  });
});
