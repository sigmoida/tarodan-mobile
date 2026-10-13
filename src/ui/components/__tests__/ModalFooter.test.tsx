/**
 * ModalFooter: web ConfirmDialog düzeni (ana aksiyon üstte, İptal altta). `isLoading` yoktur —
 * modalı mutasyon boyunca açık tutmak iOS ModalFreeze kuralına aykırı (CLAUDE.md §12).
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ModalFooter } from '../ModalFooter';

describe('ModalFooter', () => {
  it('ana aksiyon üstte, İptal altta; basışlar ilgili callback’i çağırır', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(<ModalFooter onConfirm={onConfirm} onCancel={onCancel} confirmLabel="Kaydet" cancelLabel="Vazgeç" />);
    const labels = screen
      .getAllByRole('button')
      .map((el) => el.findAll((n) => typeof n.props.children === 'string')[0]?.props.children);
    expect(labels).toEqual(['Kaydet', 'Vazgeç']);
    fireEvent.press(screen.getByText('Kaydet'));
    fireEvent.press(screen.getByText('Vazgeç'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('isLoading prop’u yok: İptal düğmesi hiçbir zaman “yükleniyor” ile kilitlenmez', () => {
    // @ts-expect-error isLoading bilerek kaldırıldı (iOS ModalFreeze)
    render(<ModalFooter onConfirm={jest.fn()} onCancel={jest.fn()} isLoading />);
    const cancel = screen.getAllByRole('button')[1];
    expect(cancel.props.accessibilityState?.disabled).toBeFalsy();
  });
});
