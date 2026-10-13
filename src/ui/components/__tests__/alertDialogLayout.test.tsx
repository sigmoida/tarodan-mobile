/**
 * appAlert düğme dizilimi web ConfirmDialog'un telefon görünümü gibi: tam genişlik, alt alta,
 * ana aksiyon üstte, `cancel` stilli düğme HER ZAMAN altta; diğerlerinin sırası çağıranınki gibi
 * korunur (ters çevirme yok). İptal = outline, yıkıcı = danger-600.
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

  const order = () =>
    screen
      .getAllByRole('button')
      .map((el) => el.findAll((n) => typeof n.props.children === 'string')[0]?.props.children as string);

  it('menü [Profil, Şikayet, Engelle(destructive), İptal] → aynı sıra, İptal en altta', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Kullanıcı', undefined, [
        { text: 'Profil' },
        { text: 'Şikayet' },
        { text: 'Engelle', style: 'destructive' },
        { text: 'İptal', style: 'cancel' },
      ]);
    });
    expect(order()).toEqual(['Profil', 'Şikayet', 'Engelle', 'İptal']);
  });

  it('[Giriş, İptal] → Giriş üstte, İptal altta (ters çevrilmez)', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Giriş gerekli', 'Devam için giriş yapın', [
        { text: 'Giriş' },
        { text: 'İptal', style: 'cancel' },
      ]);
    });
    expect(order()).toEqual(['Giriş', 'İptal']);
  });

  it('[İptal, Onay] 2\'li onay → Onay üstte, İptal altta', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Emin misiniz?', undefined, [
        { text: 'İptal', style: 'cancel' },
        { text: 'Onay' },
      ]);
    });
    expect(order()).toEqual(['Onay', 'İptal']);
  });

  it('iptal düğmesi yoksa çağıran sırası aynen korunur', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Bilgi', undefined, [{ text: 'A' }, { text: 'B' }, { text: 'C' }]);
    });
    expect(order()).toEqual(['A', 'B', 'C']);
  });
});
