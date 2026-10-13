/**
 * appAlert düğme dizilimi web ConfirmDialog'un telefon görünümü gibi: tam genişlik, alt alta,
 * TERS sıra (ana aksiyon üstte, İptal altta). İptal = outline, yıkıcı = danger-600.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import { AlertDialogHost, appAlert, resetAlertQueueForTests } from '../AlertDialog';
import { theme } from '../../lib/theme';

afterEach(() => {
  cleanup();
  resetAlertQueueForTests();
});

const pressableStyle = (label: string) => {
  let node = screen.getByText(label).parent;
  while (node && typeof node.props.style !== 'function') node = node.parent;
  return StyleSheet.flatten(node?.props.style({ pressed: false }));
};

describe('appAlert düğme dizilimi', () => {
  it('[İptal, Sil] → Sil üstte (danger), İptal altta (outline)', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Silinsin mi?', 'Geri alınamaz.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive' },
      ]);
    });
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    const [first, second] = buttons;
    expect(first).toHaveTextContent('Sil');
    expect(second).toHaveTextContent('İptal');
    expect(pressableStyle('Sil').backgroundColor).toBe(theme.colors.danger[600]);
    expect(pressableStyle('İptal')).toMatchObject({ borderWidth: 1, backgroundColor: 'transparent' });
  });
});
