/**
 * Modal seçenekleri (web `Modal` ile aynı yüzey): `size` (md 480 / lg 512), başlık
 * satırında kapat düğmesi (`showCloseButton`) ve gövde iç boşluğunu sıfırlayan `flushBody`
 * (web `bodyClassName="p-0"`). Kart zemini ve köşeler flushBody ile DEĞİŞMEZ; kapatma
 * davranışı (geri tuşu / arka plan) her durumda aynı.
 */
import React from 'react';
import { Modal as RNModal, StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Modal, MODAL_MAX_WIDTH } from '../Modal';

type N = { parent: N | null; props: { style?: unknown; testID?: string } };
const flat = (n: N) => StyleSheet.flatten(n.props.style as never) as Record<string, unknown> | undefined;

/** İçerikten yukarı çıkıp verilen koşulu sağlayan ilk stili bulur. */
const up = (node: unknown, pred: (st: Record<string, unknown>) => boolean) => {
  let cur = node as N | null;
  while (cur) {
    const st = flat(cur);
    if (st && pred(st)) return st;
    cur = cur.parent;
  }
  return undefined;
};
const sheetOf = (node: unknown) => up(node, (s) => typeof s.maxWidth === 'number');
const bodyOf = (node: unknown) => up(node, (s) => 'padding' in s && !('maxWidth' in s));

describe('Modal: kart yüzeyi', () => {
  it('varsayılan: md (480), beyaz zemin, köşe yuvarlak, gövde iç boşluklu, başlık satırı yok', () => {
    const { getByText, queryByTestId } = render(
      <Modal isOpen onClose={jest.fn()}>
        <Text>içerik</Text>
      </Modal>,
    );
    const sheet = sheetOf(getByText('içerik'));
    expect(sheet?.maxWidth).toBe(480);
    expect(sheet?.backgroundColor).not.toBe('transparent');
    expect(sheet?.borderRadius).toBeGreaterThan(0);
    expect(bodyOf(getByText('içerik'))?.padding).toBeGreaterThan(0);
    expect(queryByTestId('modal-close')).toBeNull();
  });

  it('size="lg": 512 (web max-w-lg)', () => {
    expect(MODAL_MAX_WIDTH).toEqual({ md: 480, lg: 512 });
    const { getByText } = render(
      <Modal isOpen onClose={jest.fn()} size="lg">
        <Text>içerik</Text>
      </Modal>,
    );
    expect(sheetOf(getByText('içerik'))?.maxWidth).toBe(512);
  });

  it('başlık ve gövde: başlık satırı üst boşluğu verir, gövde üstte boşluksuz (eski görünüm)', () => {
    const { getByText } = render(
      <Modal isOpen onClose={jest.fn()} title="Başlık">
        <Text>içerik</Text>
      </Modal>,
    );
    expect(getByText('Başlık')).toBeTruthy();
    expect(bodyOf(getByText('içerik'))?.paddingTop).toBe(0);
  });
});

describe('Modal: flushBody', () => {
  it('gövde iç boşluğu 0; kart zemini ve köşeler korunur (saydam kart yok)', () => {
    const { getByText } = render(
      <Modal isOpen onClose={jest.fn()} flushBody>
        <Text>içerik</Text>
      </Modal>,
    );
    expect(bodyOf(getByText('içerik'))?.padding).toBe(0);
    const sheet = sheetOf(getByText('içerik'));
    expect(sheet?.backgroundColor).not.toBe('transparent');
    expect(sheet?.borderRadius).toBeGreaterThan(0);
    expect(sheet?.overflow).toBe('hidden');
  });
});

describe('Modal: showCloseButton', () => {
  it('kapat düğmesi başlık satırında; basınca onClose; etiket verilen', () => {
    const onClose = jest.fn();
    const { getByTestId, getByLabelText } = render(
      <Modal isOpen onClose={onClose} showCloseButton closeLabel="Kapat" flushBody>
        <Text>içerik</Text>
      </Modal>,
    );
    expect(getByLabelText('Kapat')).toBeTruthy();
    fireEvent.press(getByTestId('modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('düğme gövdenin dışında (görselin üstüne binmez): gövdeyi içermez', () => {
    const { getByTestId, getByText } = render(
      <Modal isOpen onClose={jest.fn()} showCloseButton flushBody>
        <Text>içerik</Text>
      </Modal>,
    );
    // Gövde kapsayıcısı (padding'li View) içerikten yukarı çıkarken düğmeyi barındırmaz.
    let cur = getByText('içerik') as unknown as N;
    let body: N | null = null;
    while (cur && !body) {
      if (flat(cur) && 'padding' in (flat(cur) as object) && !('maxWidth' in (flat(cur) as object))) body = cur;
      cur = cur.parent as N;
    }
    expect(body).toBeTruthy();
    const containsClose = (n: unknown): boolean => {
      const node = n as { props: { testID?: string }; children?: unknown[] };
      if (node.props?.testID === 'modal-close') return true;
      return (node.children ?? []).some((c) => typeof c === 'object' && c !== null && containsClose(c));
    };
    expect(containsClose(body)).toBe(false);
    expect(getByTestId('modal-close')).toBeTruthy();
  });

  it('başlıkla birlikte: ikisi de görünür', () => {
    const { getByText, getByTestId } = render(
      <Modal isOpen onClose={jest.fn()} title="Başlık" showCloseButton>
        <Text>içerik</Text>
      </Modal>,
    );
    expect(getByText('Başlık')).toBeTruthy();
    expect(getByTestId('modal-close')).toBeTruthy();
  });
});

describe('Modal: kapatma yolları seçeneklerden bağımsız', () => {
  it('geri tuşu onClose çağırır', () => {
    const onClose = jest.fn();
    const { UNSAFE_getByType } = render(
      <Modal isOpen onClose={onClose} flushBody showCloseButton>
        <Text>içerik</Text>
      </Modal>,
    );
    UNSAFE_getByType(RNModal).props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('arka plana dokunmak kapatır; closeOnBackdrop=false kapatmaz', () => {
    const onClose = jest.fn();
    const { getByText, rerender } = render(
      <Modal isOpen onClose={onClose} flushBody>
        <Text>içerik</Text>
      </Modal>,
    );
    // Kartın kendisi onPress taşımaz; olay arka plan Pressable'ına yükselir.
    fireEvent.press(getByText('içerik'));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal isOpen onClose={onClose} flushBody closeOnBackdrop={false}>
        <Text>içerik</Text>
      </Modal>,
    );
    fireEvent.press(getByText('içerik'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('MODAL_CLOSE_HEADER_HEIGHT: IconButton ölçüsünden türer', () => {
  it('düğme kutusu (sm) + dikey iç boşluk; düğme boyutu değişirse birlikte değişir', () => {
    const { MODAL_CLOSE_HEADER_HEIGHT } = jest.requireActual('../Modal');
    const { iconButtonBoxSize } = jest.requireActual('../IconButton');
    const { theme } = jest.requireActual('../../lib/theme');
    expect(MODAL_CLOSE_HEADER_HEIGHT).toBe(iconButtonBoxSize('sm') + 2 * theme.spacing[2]);
  });

  it('gerçek düğme kutusu, yükseklik hesabındaki ölçüyle aynı', () => {
    const { MODAL_CLOSE_HEADER_HEIGHT } = jest.requireActual('../Modal');
    const { iconButtonBoxSize } = jest.requireActual('../IconButton');
    const { getByTestId } = render(
      <Modal isOpen onClose={jest.fn()} showCloseButton>
        <Text>içerik</Text>
      </Modal>,
    );
    const st = StyleSheet.flatten(getByTestId('modal-close').props.style as never) as { width: number; height: number };
    expect(st.width).toBe(iconButtonBoxSize('sm'));
    expect(st.height).toBe(iconButtonBoxSize('sm'));
    expect(MODAL_CLOSE_HEADER_HEIGHT).toBeGreaterThan(st.height);
  });
});

describe('Modal: fitContent', () => {
  it('varsayılan kart size\'a kadar tam genişlik (100%); fitContent içeriğe oturur (auto), üst sınır korunur', () => {
    const full = render(
      <Modal isOpen onClose={jest.fn()}>
        <Text>içerik</Text>
      </Modal>,
    );
    expect(sheetOf(full.getByText('içerik'))?.width).toBe('100%');
    full.unmount();

    const fit = render(
      <Modal isOpen onClose={jest.fn()} fitContent size="lg">
        <Text>içerik</Text>
      </Modal>,
    );
    const sheet = sheetOf(fit.getByText('içerik'));
    expect(sheet?.width).toBe('auto');
    expect(sheet?.maxWidth).toBe(512);
    expect(sheet?.backgroundColor).not.toBe('transparent');
  });
});
