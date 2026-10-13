import React from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { act, render, screen, within } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import { Snackbar, toast, ToastHost, ToastLayer, useToastBottomInset } from '@/ui';
import { isSwipeDismiss, resetToastForTests, TOAST_GAP, toastBottom } from '../Toast';

let mockKeyboardHeight = 0;
jest.mock('@/hooks/useKeyboardHeight', () => ({
  ...jest.requireActual('@/hooks/useKeyboardHeight'),
  useKeyboardHeight: () => mockKeyboardHeight,
}));

/** Çıkış animasyonu (150 ms) + reanimated kare payı. */
const EXIT = 400;
const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
/** Süre dolsun, sonra çıkış animasyonu bitsin (React güncellemesi act sonunda işlenir: iki adım). */
const expire = (ms: number) => {
  advance(ms);
  advance(EXIT);
};
const bottomOf = (testID = 'toast') => StyleSheet.flatten(screen.getByTestId(testID).props.style).bottom;

beforeEach(() => {
  jest.useFakeTimers();
  resetToastForTests();
  mockKeyboardHeight = 0;
});
afterEach(() => {
  jest.useRealTimers();
});

describe('toast (web react-hot-toast karşılığı)', () => {
  it('toast.success: ikonlu, testID toast + toast-success; 2 sn dolunca ÇIKIŞ animasyonuyla kalkar', () => {
    render(<ToastHost />);
    act(() => {
      toast.success('Kaydedildi');
    });
    expect(screen.getByText('Kaydedildi')).toBeTruthy();
    expect(screen.getByTestId('toast')).toBeTruthy();
    expect(screen.getByTestId('toast-success')).toBeTruthy();
    expect(screen.getByTestId('icon-check-circle')).toBeTruthy();
    advance(1990);
    expect(screen.getByText('Kaydedildi')).toBeTruthy();
    advance(20); // süre doldu: çıkış başladı, kart animasyon bitene dek bağlı
    expect(screen.getByText('Kaydedildi')).toBeTruthy();
    advance(EXIT);
    expect(screen.queryByText('Kaydedildi')).toBeNull();
  });

  it('toast.error 4 sn, kırmızı ikon, testID toast-error; nötr toast ikonsuz (toast-blank)', () => {
    render(<ToastHost />);
    act(() => {
      toast.error('Olmadı');
    });
    expect(screen.getByTestId('toast-error')).toBeTruthy();
    expect(screen.getByTestId('icon-x-circle')).toBeTruthy();
    advance(3000);
    expect(screen.getByText('Olmadı')).toBeTruthy();
    expire(1000);
    expect(screen.queryByText('Olmadı')).toBeNull();

    act(() => {
      toast('Bilgi');
    });
    expect(screen.getByTestId('toast-blank')).toBeTruthy();
    expect(screen.queryByTestId('icon-check-circle')).toBeNull();
    expect(screen.queryByTestId('icon-x-circle')).toBeNull();
  });

  it('farklı yeni mesaj: eskisi çıkar, yenisi girer (aynı anda tek toast)', () => {
    render(<ToastHost />);
    act(() => {
      toast('Bilgi');
    });
    act(() => {
      toast.error('Olmadı');
    });
    // Eski kart çıkış animasyonunda; yenisi çıkış bitince girer.
    expect(screen.getAllByTestId('toast')).toHaveLength(1);
    advance(EXIT);
    expect(screen.queryByText('Bilgi')).toBeNull();
    expect(screen.getByText('Olmadı')).toBeTruthy();
  });

  it('aynı mesaj tekrar atılırsa yeni kart açılmaz, süre yenilenir (dedupe)', () => {
    render(<ToastHost />);
    let first: unknown;
    let second: unknown;
    act(() => {
      first = toast.success('Sepete eklendi');
    });
    advance(1500);
    act(() => {
      second = toast.success('Sepete eklendi');
    });
    expect(second).toBe(first);
    advance(1500); // ilk atıştan 3 sn sonra: yenilendiği için hâlâ görünür
    expect(screen.getAllByText('Sepete eklendi')).toHaveLength(1);
    expire(500);
    expect(screen.queryByText('Sepete eklendi')).toBeNull();
  });

  it('{ id }: aynı kimlikle atılan toast kartı yerinde günceller', () => {
    render(<ToastHost />);
    act(() => {
      toast('Yükleniyor', { id: 'upload' });
    });
    act(() => {
      toast.success('Yüklendi', { id: 'upload' });
    });
    expect(screen.queryByText('Yükleniyor')).toBeNull();
    expect(screen.getByText('Yüklendi')).toBeTruthy();
    expect(screen.getByTestId('toast-success')).toBeTruthy();
  });

  it('toast.dismiss(id) yalnız o toast\'ı, dismiss() görüneni kapatır', () => {
    render(<ToastHost />);
    let id: unknown;
    act(() => {
      id = toast('Kalıcı', { duration: 0 });
    });
    act(() => toast.dismiss('baska-id'));
    advance(EXIT);
    expect(screen.getByText('Kalıcı')).toBeTruthy();
    act(() => toast.dismiss(id as string));
    advance(EXIT);
    expect(screen.queryByText('Kalıcı')).toBeNull();

    act(() => {
      toast('İkinci', { duration: 0 });
    });
    act(() => toast.dismiss());
    advance(EXIT);
    expect(screen.queryByText('İkinci')).toBeNull();
  });

  it('mesaj güvenliği: dizi → ilk eleman, sayı/hata → metin, boş → atılmaz', () => {
    render(<ToastHost />);
    act(() => {
      toast.error(['Birinci hata', 'İkinci hata']);
    });
    expect(screen.getByText('Birinci hata')).toBeTruthy();
    act(() => {
      toast(42);
    });
    advance(EXIT);
    expect(screen.getByText('42')).toBeTruthy();
    act(() => {
      toast.error(new Error('Ağ hatası'));
    });
    advance(EXIT);
    expect(screen.getByText('Ağ hatası')).toBeTruthy();
    act(() => toast.dismiss());
    advance(EXIT);
    let empty: unknown;
    act(() => {
      empty = toast('   ');
      toast(undefined);
      toast(null);
      toast([]);
    });
    expect(empty).toBe('');
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('host bağlanmadan atılan mesaj bağlanınca görünür; süresi bağlanınca başlar', () => {
    toast.success('Erken');
    advance(5000);
    render(<ToastHost />);
    expect(screen.getByText('Erken')).toBeTruthy();
    advance(1500);
    expect(screen.getByText('Erken')).toBeTruthy();
  });

  it('erişilebilirlik: kart alert rolünde, Android canlı bölge, ekran okuyucuya duyurulur', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    render(<ToastHost />);
    act(() => {
      toast.success('Kaydedildi');
    });
    const card = screen.getByTestId('toast-success');
    expect(card.props.accessibilityRole).toBe('alert');
    expect(card.props.accessibilityLiveRegion).toBe('polite');
    expect(card.props.accessibilityLabel).toBe('Kaydedildi');
    expect(screen.getByText('Kaydedildi').props.numberOfLines).toBe(2);
    expect(announce).toHaveBeenCalledWith('Kaydedildi');
    announce.mockRestore();
  });
});

describe('ToastLayer: en son bağlanan katman çizer', () => {
  const Tree = ({ modal }: { modal: boolean }) => (
    <>
      <View testID="root-layer">
        <ToastHost />
      </View>
      {modal ? (
        <View testID="modal-layer">
          <ToastLayer />
        </View>
      ) : null}
    </>
  );

  it('modal açıkken toast modal katmanında; kapanınca kök katmanda kesintisiz sürer', () => {
    const view = render(<Tree modal={false} />);
    act(() => {
      toast.error('Modal altında kalmasın');
    });
    view.rerender(<Tree modal />);
    advance(EXIT);
    expect(within(screen.getByTestId('modal-layer')).getByText('Modal altında kalmasın')).toBeTruthy();
    expect(within(screen.getByTestId('root-layer')).queryByText('Modal altında kalmasın')).toBeNull();

    advance(1000); // toplam ~1.4 sn
    view.rerender(<Tree modal={false} />);
    // Kök katman devralır: giriş animasyonu yok, süre sıfırlanmaz (toplam 4 sn).
    expect(within(screen.getByTestId('root-layer')).getByText('Modal altında kalmasın')).toBeTruthy();
    advance(2000);
    expect(screen.getByText('Modal altında kalmasın')).toBeTruthy();
    expire(700);
    expect(screen.queryByText('Modal altında kalmasın')).toBeNull();
  });

  it('modal içinden atılan toast modal katmanında çizilir', () => {
    render(<Tree modal />);
    act(() => {
      toast('Modal içinden');
    });
    expect(within(screen.getByTestId('modal-layer')).getByText('Modal içinden')).toBeTruthy();
    expect(screen.getAllByTestId('toast')).toHaveLength(1);
  });
});

describe('konum: klavye ve alt engeller', () => {
  function Obstacle({ value, followsKeyboard }: { value: number | null; followsKeyboard?: boolean }) {
    useToastBottomInset(value, followsKeyboard);
    return null;
  }

  it('engel yokken güvenli alanın üstünde', () => {
    render(<ToastHost />);
    act(() => {
      toast('x');
    });
    // jest güvenli alan altı 0: 0 + spacing[2] + boşluk
    expect(bottomOf()).toBe(8 + TOAST_GAP);
  });

  it('kayıtlı engelin (sekme çubuğu / alt çubuk) üstünde; en son kaydolan geçerli; söküm geri alır', () => {
    const view = render(
      <>
        <ToastHost />
        <Obstacle value={90} />
      </>,
    );
    act(() => {
      toast('x', { duration: 0 });
    });
    expect(bottomOf()).toBe(90 + TOAST_GAP);
    view.rerender(
      <>
        <ToastHost />
        <Obstacle value={90} />
        <Obstacle value={120} />
      </>,
    );
    expect(bottomOf()).toBe(120 + TOAST_GAP);
    view.rerender(
      <>
        <ToastHost />
        <Obstacle value={90} />
      </>,
    );
    expect(bottomOf()).toBe(90 + TOAST_GAP);
  });

  it('değeri null olan kayıt atlanır (sırası korunur)', () => {
    render(
      <>
        <ToastHost />
        <Obstacle value={90} />
        <Obstacle value={null} />
      </>,
    );
    act(() => {
      toast('x');
    });
    expect(bottomOf()).toBe(90 + TOAST_GAP);
  });

  it('klavye açıkken klavyenin hemen üstünde (sekme çubuğu yok sayılır)', () => {
    mockKeyboardHeight = 300;
    render(
      <>
        <ToastHost />
        <Obstacle value={90} />
      </>,
    );
    act(() => {
      toast('x');
    });
    expect(bottomOf()).toBe(300 + TOAST_GAP);
  });

  it('klavyeyle yukarı çıkan alt çubuk varsa onun da üstünde', () => {
    mockKeyboardHeight = 300;
    render(
      <>
        <ToastHost />
        <Obstacle value={70} followsKeyboard />
      </>,
    );
    act(() => {
      toast('x');
    });
    expect(bottomOf()).toBe(300 + 70 + TOAST_GAP);
  });

  it('toastBottom: engel yoksa güvenli alan; klavyede yalnız klavyeyle kalkan engel eklenir', () => {
    expect(toastBottom({ keyboardOverlap: 0, safeBottom: 34, inset: { value: 80, followsKeyboard: false } })).toBe(80 + TOAST_GAP);
    expect(toastBottom({ keyboardOverlap: 0, safeBottom: 34, inset: null })).toBe(34 + 8 + TOAST_GAP);
    expect(toastBottom({ keyboardOverlap: 300, safeBottom: 34, inset: { value: 80, followsKeyboard: false } })).toBe(300 + TOAST_GAP);
  });

  it('modal/sheet katmanı: bottomOffset (alt çubuk) üstünde; followsKeyboard ile klavyede de', () => {
    const view = render(
      <>
        <ToastHost />
        <ToastLayer bottomOffset={72} followsKeyboard />
      </>,
    );
    act(() => {
      toast('x', { duration: 0 });
    });
    expect(bottomOf()).toBe(72 + TOAST_GAP);
    mockKeyboardHeight = 300;
    view.rerender(
      <>
        <ToastHost />
        <ToastLayer bottomOffset={72} followsKeyboard />
      </>,
    );
    expect(bottomOf()).toBe(300 + 72 + TOAST_GAP);
  });

  describe('kayıtlar yalnız ekran odaktayken geçerli', () => {
    type Listener = () => void;
    function fakeNavigation(initial: boolean) {
      let focused = initial;
      const listeners: Record<string, Listener[]> = { focus: [], blur: [] };
      return {
        isFocused: () => focused,
        addListener: (type: 'focus' | 'blur', cb: Listener) => {
          listeners[type]!.push(cb);
          return () => {
            listeners[type] = listeners[type]!.filter((l) => l !== cb);
          };
        },
        set(next: boolean) {
          focused = next;
          act(() => listeners[next ? 'focus' : 'blur']!.forEach((l) => l()));
        },
      };
    }
    const Screen = ({ nav, value }: { nav: ReturnType<typeof fakeNavigation>; value: number | null }) => (
      <NavigationContext.Provider value={nav as never}>
        <Obstacle value={value} />
      </NavigationContext.Provider>
    );

    it('sekme çubuğu itilen ekranın altında kalınca (blur) toast onu hesaba katmaz; dönünce yine katar', () => {
      const tabs = fakeNavigation(true);
      render(
        <>
          <ToastHost />
          <Screen nav={tabs} value={90} />
        </>,
      );
      act(() => {
        toast('x', { duration: 0 });
      });
      expect(bottomOf()).toBe(90 + TOAST_GAP);
      tabs.set(false); // footer'sız yığın ekranı itildi
      expect(bottomOf()).toBe(8 + TOAST_GAP);
      tabs.set(true); // geri dönüldü
      expect(bottomOf()).toBe(90 + TOAST_GAP);
    });

    it('A ekranının alt çubuğu, üstüne B itilince geçerli kalmaz; B\'nin alt çubuğu geçerli', () => {
      const a = fakeNavigation(true);
      const b = fakeNavigation(true);
      const view = render(
        <>
          <ToastHost />
          <Screen nav={a} value={76} />
        </>,
      );
      act(() => {
        toast('x', { duration: 0 });
      });
      expect(bottomOf()).toBe(76 + TOAST_GAP);
      a.set(false);
      view.rerender(
        <>
          <ToastHost />
          <Screen nav={a} value={76} />
          <Screen nav={b} value={null} />
        </>,
      );
      expect(bottomOf()).toBe(8 + TOAST_GAP);
      view.rerender(
        <>
          <ToastHost />
          <Screen nav={a} value={76} />
          <Screen nav={b} value={100} />
        </>,
      );
      expect(bottomOf()).toBe(100 + TOAST_GAP);
    });
  });
});

describe('kaydırarak kapatma eşiği', () => {
  it('yeterince sürükleme ya da hızlı fırlatma kapatır', () => {
    expect(isSwipeDismiss(10, 0)).toBe(false);
    expect(isSwipeDismiss(-40, 0)).toBe(true);
    expect(isSwipeDismiss(40, 0)).toBe(true);
    expect(isSwipeDismiss(5, 900)).toBe(true);
  });
});

describe('Snackbar (eski kullanım)', () => {
  it('mevcut Snackbar kullanımı (koyu şerit) aynen çalışır', () => {
    render(
      <Snackbar visible onDismiss={jest.fn()} variant="success">
        Tamam
      </Snackbar>,
    );
    expect(screen.getByText('Tamam')).toBeTruthy();
  });
});
