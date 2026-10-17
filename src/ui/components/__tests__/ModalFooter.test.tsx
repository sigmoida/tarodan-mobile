/**
 * ModalFooter: web ConfirmDialog düzeni (ana aksiyon üstte, İptal altta). `isLoading` yoktur —
 * modalı mutasyon boyunca açık tutmak iOS ModalFreeze kuralına aykırı (src/ui/CLAUDE.md › iOS modal rule).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ModalFooter } from '../ModalFooter';

const labels = () =>
  screen
    .getAllByRole('button')
    .map((el) => el.findAll((n: { props: { children?: unknown } }) => typeof n.props.children === 'string')[0]?.props.children);
const direction = () => StyleSheet.flatten(screen.getByTestId('modal-footer-items').props.style).flexDirection;
const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 40 } } });
const measure = (container: number, cancel: number, confirm: number) => {
  fireEvent(screen.getByTestId('modal-footer'), 'layout', layout(container));
  fireEvent(screen.getByTestId('modal-footer-measure-0', { includeHiddenElements: true }), 'layout', layout(cancel));
  fireEvent(screen.getByTestId('modal-footer-measure-1', { includeHiddenElements: true }), 'layout', layout(confirm));
};

describe('ModalFooter', () => {
  it('etiketler sığıyorsa yan yana eşit genişlik: [İptal][Ana aksiyon]; basışlar ilgili callback’i çağırır', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(<ModalFooter onConfirm={onConfirm} onCancel={onCancel} confirmLabel="Kaydet" cancelLabel="Vazgeç" />);
    measure(300, 80, 80);
    expect(direction()).toBe('row');
    expect(labels()).toEqual(['Vazgeç', 'Kaydet']);
    expect(screen.getByText('Kaydet').props.numberOfLines).toBe(1);
    fireEvent.press(screen.getByText('Kaydet'));
    fireEvent.press(screen.getByText('Vazgeç'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('sığmazsa alt alta tam genişlik: ana aksiyon üstte, İptal altta (web flex-col-reverse)', () => {
    render(<ModalFooter onConfirm={jest.fn()} onCancel={jest.fn()} confirmLabel="Karşı teklifi gönder" cancelLabel="Vazgeç" />);
    measure(240, 80, 170);
    expect(direction()).toBe('column');
    expect(labels()).toEqual(['Karşı teklifi gönder', 'Vazgeç']);
  });

  it('isLoading prop’u yok: İptal düğmesi hiçbir zaman “yükleniyor” ile kilitlenmez', () => {
    // @ts-expect-error isLoading bilerek kaldırıldı (iOS ModalFreeze)
    render(<ModalFooter onConfirm={jest.fn()} onCancel={jest.fn()} isLoading />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.props.accessibilityState?.disabled).toBeFalsy();
    }
  });
});
