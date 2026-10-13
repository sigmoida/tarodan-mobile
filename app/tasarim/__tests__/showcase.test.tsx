/** Vitrin tüm primitive'leri çökmeden çizer (duman testi). */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Showcase } from '../_components/Showcase';

describe('Showcase', () => {
  it('bütün bölümler çizilir', () => {
    render(<Showcase />);
    for (const title of ['Button', 'IconButton', 'Badge', 'Chip / Stepper', 'Form', 'Geri bildirim']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });
});
