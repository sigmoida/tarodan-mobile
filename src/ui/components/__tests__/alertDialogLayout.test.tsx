/**
 * appAlert düğme dizilimi (telefon diyaloğu):
 * - 2 düğme, etiketler eşit paya sığıyorsa YAN YANA eşit genişlik; iptal solda (web ModalFooter
 *   `sm:flex-row`, iOS/Material). Sığmazsa alt alta: onay üstte, `cancel` stilli düğme EN ALTTA.
 * - 3+ düğme her zaman alt alta; `cancel` en altta, diğerlerinin sırası çağıranınki gibi (ters yok).
 * - İptal = outline, yıkıcı = danger-600, diğerleri primary. Etiket asla sarmaz (numberOfLines=1).
 * - Kart: min(340, ekran - 48), başlık ortalı, uzun mesajda yalnız gövde kayar.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AlertDialogHost, alertButtonLayout, appAlert, resetAlertQueueForTests } from '../AlertDialog';
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

const order = () =>
  screen
    .getAllByRole('button')
    .map((el) => el.findAll((n: { props: { children?: unknown } }) => typeof n.props.children === 'string')[0]?.props.children as string);

const direction = () =>
  StyleSheet.flatten(screen.getByTestId('alert-dialog-buttons-items').props.style).flexDirection;

const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 40 } } });
/** ButtonRow ölçümü: kapsayıcı genişliği + her düğmenin doğal genişliği. */
const measureButtons = (container: number, ...natural: number[]) => {
  fireEvent(screen.getByTestId('alert-dialog-buttons'), 'layout', layout(container));
  natural.forEach((w, i) =>
    fireEvent(
      screen.getByTestId(`alert-dialog-buttons-measure-${i}`, { includeHiddenElements: true }),
      'layout',
      layout(w),
    ),
  );
};

describe('appAlert düğme dizilimi', () => {
  it('[İptal, Sil] sığıyorsa yan yana: İptal solda (outline), Sil sağda (danger); etiket sarmaz', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Silinsin mi?', 'Geri alınamaz.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive' },
      ]);
    });
    measureButtons(280, 70, 60);
    expect(direction()).toBe('row');
    expect(order()).toEqual(['İptal', 'Sil']);
    expect(pressableStyle('Sil').backgroundColor).toBe(theme.colors.danger[600]);
    expect(pressableStyle('İptal')).toMatchObject({ borderWidth: 1, backgroundColor: 'transparent' });
    expect(screen.getByText('Sil').props.numberOfLines).toBe(1);
  });

  it('uzun etiket sığmazsa alt alta: onay üstte, İptal en altta', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Ödemeden çıkılsın mı?', undefined, [
        { text: 'Ödemeye devam et', style: 'cancel' },
        { text: 'Çık' },
      ]);
    });
    measureButtons(260, 180, 60);
    expect(direction()).toBe('column');
    expect(order()).toEqual(['Çık', 'Ödemeye devam et']);
  });

  it('menü [Profil, Şikayet, Engelle(destructive), İptal] → alt alta, aynı sıra, İptal en altta', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Kullanıcı', undefined, [
        { text: 'Profil' },
        { text: 'Şikayet' },
        { text: 'Engelle', style: 'destructive' },
        { text: 'İptal', style: 'cancel' },
      ]);
    });
    expect(direction()).toBe('column');
    expect(order()).toEqual(['Profil', 'Şikayet', 'Engelle', 'İptal']);
  });

  it('3 düğmede iptal ortada verilse de en alta iner, diğerleri ters çevrilmez', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Seç', undefined, [{ text: 'A' }, { text: 'İptal', style: 'cancel' }, { text: 'B' }]);
    });
    expect(order()).toEqual(['A', 'B', 'İptal']);
  });

  it('iptal düğmesi yoksa çağıran sırası aynen korunur', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Bilgi', undefined, [{ text: 'A' }, { text: 'B' }, { text: 'C' }]);
    });
    expect(order()).toEqual(['A', 'B', 'C']);
  });

  it('alertButtonLayout: 2 düğme + iptal → [iptal, onay] yan yana, alt alta ters', () => {
    const r = alertButtonLayout([{ text: 'Giriş' }, { text: 'İptal', style: 'cancel' }]);
    expect(r.ordered.map((o) => o.button.text)).toEqual(['İptal', 'Giriş']);
    expect(r).toMatchObject({ layout: 'auto', stackOrder: 'reverse' });
    const two = alertButtonLayout([{ text: 'A' }, { text: 'B' }]);
    expect(two).toMatchObject({ layout: 'auto', stackOrder: 'same' });
    expect(alertButtonLayout([{ text: 'A' }, { text: 'B' }, { text: 'C' }]).layout).toBe('stack');
  });
});

describe('appAlert kartı', () => {
  it('başlık ortalı h3 kalın, mesaj ortalı; kart genişliği min(340, ekran - 48)', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Başlık', 'Mesaj');
    });
    const title = StyleSheet.flatten(screen.getByText('Başlık').props.style);
    expect(title.textAlign).toBe('center');
    expect(title.fontWeight).toBe(theme.typography.fontWeight.bold);
    expect(StyleSheet.flatten(screen.getByText('Mesaj').props.style).textAlign).toBe('center');
    const card = StyleSheet.flatten(screen.getByTestId('alert-dialog').props.style);
    expect(card.width).toBe(Math.min(340, 750 - 48)); // jest pencere genişliği 750
  });

  it('uzun mesaj kaydırılabilir gövdede (kart pencereye sığana dek küçülür)', () => {
    render(<AlertDialogHost />);
    act(() => {
      appAlert('Başlık', 'Uzun '.repeat(400));
    });
    const body = screen.getByTestId('alert-dialog-body');
    expect(body.type).toBe('RCTScrollView');
    expect(StyleSheet.flatten(body.props.style)).toMatchObject({ flexShrink: 1 });
    expect(StyleSheet.flatten(screen.getByTestId('alert-dialog').props.style)).toMatchObject({ flexShrink: 1 });
  });
});
