/**
 * Modal `bare` varyantı: beyaz kart zemini ve iç boşluk yok (web'deki p-0 popup gibi),
 * kapatma davranışı (geri tuşu / arka plan) `card` ile aynı.
 */
import React from 'react';
import { Modal as RNModal, StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Modal } from '../Modal';

/** İçerikten yukarı çıkıp `maxWidth: 480` taşıyan kartı (sheet) bulur. */
const sheetStyleOf = (node: { parent: unknown; props: { style?: unknown } } | null) => {
  let cur = node as { parent: unknown; props: { style?: unknown } } | null;
  while (cur) {
    const st = StyleSheet.flatten(cur.props.style as never) as Record<string, unknown> | undefined;
    if (st && st.maxWidth === 480) return st;
    cur = cur.parent as typeof cur;
  }
  return undefined;
};

describe('Modal variant', () => {
  it('varsayılan (card): beyaz zemin ve iç boşluk', () => {
    const { getByText } = render(
      <Modal isOpen onClose={jest.fn()}>
        <Text>içerik</Text>
      </Modal>,
    );
    const st = sheetStyleOf(getByText('içerik'));
    expect(st?.backgroundColor).not.toBe('transparent');
    expect(st?.padding).toBeGreaterThan(0);
  });

  it('bare: zemin saydam, iç boşluk 0', () => {
    const { getByText } = render(
      <Modal isOpen onClose={jest.fn()} variant="bare">
        <Text>içerik</Text>
      </Modal>,
    );
    const st = sheetStyleOf(getByText('içerik'));
    expect(st?.backgroundColor).toBe('transparent');
    expect(st?.padding).toBe(0);
  });

  it('bare: geri tuşu onClose çağırır', () => {
    const onClose = jest.fn();
    const { UNSAFE_getByType } = render(
      <Modal isOpen onClose={onClose} variant="bare">
        <Text>içerik</Text>
      </Modal>,
    );
    UNSAFE_getByType(RNModal).props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('bare: arka plana dokunmak kapatır; closeOnBackdrop=false kapatmaz', () => {
    const onClose = jest.fn();
    const { getByText, rerender } = render(
      <Modal isOpen onClose={onClose} variant="bare">
        <Text>içerik</Text>
      </Modal>,
    );
    // Kartın kendisi onPress taşımaz; olay arka plan Pressable'ına yükselir.
    const press = (t: ReturnType<typeof getByText>) => fireEvent.press(t);
    press(getByText('içerik'));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal isOpen onClose={onClose} variant="bare" closeOnBackdrop={false}>
        <Text>içerik</Text>
      </Modal>,
    );
    press(getByText('içerik'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
