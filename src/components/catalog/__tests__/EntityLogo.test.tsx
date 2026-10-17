import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EntityLogo } from '../EntityLogo';

describe('EntityLogo', () => {
  it('logo yoksa adın baş harfini (büyük) çizer', () => {
    render(<EntityLogo logo={null} name="hot wheels" testID="logo" />);
    expect(screen.getByText('H')).toBeTruthy();
    expect(screen.getByTestId('logo')).toBeTruthy();
  });

  it('md = 48pt, lg = 80pt kutu', () => {
    const { rerender } = render(<EntityLogo logo={null} name="Mattel" testID="logo" />);
    expect(screen.getByTestId('logo')).toHaveStyle({ width: 48, height: 48 });
    rerender(<EntityLogo logo={null} name="Mattel" size="lg" testID="logo" />);
    expect(screen.getByTestId('logo')).toHaveStyle({ width: 80, height: 80 });
  });

  it('logo varsa baş harf çizilmez', () => {
    render(<EntityLogo logo="https://cdn.example.com/m.png" name="Mattel" />);
    expect(screen.queryByText('M')).toBeNull();
  });
});
