/**
 * Modal seçenekleri (web `Modal` ile aynı yüzey): `size` (md 480 / lg 512), başlık
 * satırında kapat düğmesi (`showCloseButton`) ve gövde iç boşluğunu sıfırlayan `flushBody`
 * (web `bodyClassName="p-0"`). Kart zemini ve köşeler flushBody ile DEĞİŞMEZ; kapatma
 * davranışı (geri tuşu / arka plan) her durumda aynı.
 */
import React from 'react';
import { Modal as RNModal, Platform, StyleSheet, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Modal, MODAL_MAX_WIDTH } from '../Modal';
import { resetToastForTests, toast, ToastHost } from '../Toast';

let mockKeyboardHeight = 0;
jest.mock('@/hooks/useKeyboardHeight', () => ({
  ...jest.requireActual('@/hooks/useKeyboardHeight'),
  useKeyboardHeight: () => mockKeyboardHeight,
}));
afterEach(() => {
  mockKeyboardHeight = 0;
});

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

  it('başlık ve gövde web Dialog gibi: başlık alt çizgili, gövde px-6 py-5, alt şerit üst çizgili', () => {
    const { getByText } = render(
      <Modal isOpen onClose={jest.fn()} title="Başlık" footer={<Text>alt</Text>}>
        <Text>içerik</Text>
      </Modal>,
    );
    expect(up(getByText('Başlık'), (s) => 'borderBottomWidth' in s)?.borderBottomWidth).toBe(1);
    const body = bodyOf(getByText('içerik'));
    expect(body?.paddingVertical).toBe(20);
    expect(body?.paddingTop).toBeUndefined();
    expect(up(getByText('alt'), (s) => 'borderTopWidth' in s)?.borderTopWidth).toBe(1);
  });

  it('yalnız kapat düğmeli başlıkta gövde üstte boşluksuz (reklam görseli)', () => {
    const { getByText } = render(
      <Modal isOpen onClose={jest.fn()} showCloseButton>
        <Text>içerik</Text>
      </Modal>,
    );
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

describe('Modal: gövde kaydırma, güvenli alan, klavye, toast katmanı', () => {
  const inside = (node: unknown, pred: (n: N & { type?: unknown }) => boolean) => {
    let cur = node as (N & { type?: unknown }) | null;
    while (cur) {
      if (pred(cur)) return true;
      cur = cur.parent as (N & { type?: unknown }) | null;
    }
    return false;
  };

  it('gövde ScrollView (başlık + alt şerit sabit); kart pencereye sığmazsa küçülür', () => {
    const { getByTestId, getByText } = render(
      <Modal isOpen onClose={jest.fn()} title="Başlık" footer={<Text>alt</Text>}>
        <Text>içerik</Text>
      </Modal>,
    );
    const scroll = getByTestId('modal-body-scroll');
    expect(scroll.type).toBe('RCTScrollView');
    expect(StyleSheet.flatten(scroll.props.style)).toMatchObject({ flexGrow: 0, flexShrink: 1 });
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    const inScroll = (label: string) => inside(getByText(label), (n) => n.props.testID === 'modal-body-scroll');
    expect(inScroll('içerik')).toBe(true);
    expect(inScroll('Başlık')).toBe(false);
    expect(inScroll('alt')).toBe(false);
    expect(sheetOf(getByText('içerik'))?.flexShrink).toBe(1);
  });

  it("scrollable={false}: kendi ScrollView'ını taşıyan gövdede çift kaydırma yok", () => {
    const { queryByTestId, getByText } = render(
      <Modal isOpen onClose={jest.fn()} scrollable={false} title="Başlık" footer={<Text>alt</Text>}>
        <Text>içerik</Text>
      </Modal>,
    );
    expect(queryByTestId('modal-body-scroll')).toBeNull();
    // Küçülme zinciri kart → gövde sarmalayıcı → padding'li gövde boyunca kesintisiz: çağıranın
    // ScrollView'ı klavye açıkken alt şeridin üstüne taşmaz, kalan alana küçülür.
    const chain: Record<string, unknown>[] = [];
    let cur = getByText('içerik') as unknown as N | null;
    while (cur) {
      const st = flat(cur);
      if (st && typeof st.maxWidth === 'number') break; // kart
      if (st && Object.keys(st).length) chain.push(st);
      cur = cur.parent;
    }
    expect(chain.length).toBeGreaterThanOrEqual(2);
    for (const st of chain) expect(st).toMatchObject({ flexShrink: 1, minHeight: 0 });
    expect(sheetOf(getByText('içerik'))?.flexShrink).toBe(1);
  });

  it('fitContent varsayılan olarak kaydırmasız (içeriğe oturan kart)', () => {
    const { queryByTestId } = render(
      <Modal isOpen onClose={jest.fn()} fitContent>
        <Text>içerik</Text>
      </Modal>,
    );
    expect(queryByTestId('modal-body-scroll')).toBeNull();
  });

  it('kenardan kenara (Android status/nav bar saydam); arka plan güvenli alan kadar içeriden', () => {
    const { UNSAFE_getByType, getByTestId } = render(
      <Modal isOpen onClose={jest.fn()}>
        <Text>içerik</Text>
      </Modal>,
    );
    const modal = UNSAFE_getByType(RNModal);
    expect(modal.props.statusBarTranslucent).toBe(true);
    expect(modal.props.navigationBarTranslucent).toBe(true);
    const backdrop = StyleSheet.flatten(getByTestId('modal-backdrop').props.style);
    expect(backdrop.paddingTop).toBe(16); // jest güvenli alan 0 + spacing[4]
    expect(backdrop.paddingBottom).toBe(16);
  });

  it('klavye açık: Android kenardan kenara pencerede alt boşluk klavye kadar (pencere küçüldüyse düşülür); iOS KeyboardAvoidingView', () => {
    const original = Platform.OS;
    const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
    mockKeyboardHeight = 280;
    try {
      setOS('android');
      const android = render(
        <Modal isOpen onClose={jest.fn()}>
          <Text>içerik</Text>
        </Modal>,
      );
      const pad = () => StyleSheet.flatten(android.getByTestId('modal-backdrop').props.style).paddingBottom;
      expect(pad()).toBe(280 + 8);
      // İşletim sistemi pencereyi yine de küçülttüyse (adjustResize) çift kaçış yok.
      const root = android.getByTestId('modal-root');
      fireEvent(root, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 640 } } });
      fireEvent(root, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 360 } } });
      expect(pad()).toBe(8);
      android.unmount();

      setOS('ios');
      const ios = render(
        <Modal isOpen onClose={jest.fn()}>
          <Text>içerik</Text>
        </Modal>,
      );
      expect(StyleSheet.flatten(ios.getByTestId('modal-backdrop').props.style).paddingBottom).toBe(8);
    } finally {
      setOS(original);
    }
  });

  it('toast modalın native penceresinde çizilir (ToastLayer bağlı)', () => {
    resetToastForTests();
    const { getByText } = render(
      <>
        <ToastHost />
        <Modal isOpen onClose={jest.fn()}>
          <Text>içerik</Text>
        </Modal>
      </>,
    );
    act(() => {
      toast.error('Modal üstünde');
    });
    expect(inside(getByText('Modal üstünde'), (n) => n.type === RNModal)).toBe(true);
    resetToastForTests();
  });
});
