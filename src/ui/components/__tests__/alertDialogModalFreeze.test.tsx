/**
 * ModalFreeze (kök çözüm): `AlertDialogHost.close()` düğmenin `onPress`'ini ve kuyruktaki
 * sıradaki alert'i RNModal'ı kaldırdığı tick'te değil, modal kapanışı BİTTİKTEN sonra
 * çalıştırır — iOS'ta `onDismiss` ile, olmayan yerde (Android) `MODAL_CLOSE_DELAY_MS` ile.
 * Aksi halde `onPress`'in açtığı yeni modal kapanmakta olanın üstüne biner ve ekran donar.
 */
import React from 'react';
import { BackHandler, Modal as RNModal, Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AlertDialogHost, appAlert } from '../AlertDialog';
import {
  MODAL_CLOSE_DELAY_MS,
  MODAL_DISMISS_TIMEOUT_MS,
  MODAL_PRESENT_RETRY_MS,
  MODAL_SHIELD_MAX_MS,
} from '../../lib/modal-timing';

const realAlert = appAlert;

const setPlatform = (os: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
};
const originalOS = Platform.OS;

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  setPlatform(originalOS as 'ios' | 'android');
});

const modal = () => screen.UNSAFE_getByType(RNModal);

describe('Android (onDismiss yok): sabit süre', () => {
  beforeEach(() => setPlatform('android'));

  it('onPress aynı tick\'te ve DELAY-1 ms\'de çalışmaz, DELAY\'de çalışır', () => {
    const onPress = jest.fn();
    render(<AlertDialogHost />);
    act(() => realAlert('Başlık', 'Mesaj', [{ text: 'Evet', onPress }]));

    fireEvent.press(screen.getByText('Evet'));
    expect(onPress).not.toHaveBeenCalled();
    expect(modal().props.visible).toBe(false); // modal kapanıyor

    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS - 1));
    expect(onPress).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Başlık')).toBeNull();
  });

  it('onSelect basıldığı an çalışır, onPress kapanış bitince', () => {
    const calls: string[] = [];
    render(<AlertDialogHost />);
    act(() =>
      realAlert('Başlık', undefined, [
        { text: 'Evet', onSelect: () => calls.push('select'), onPress: () => calls.push('press') },
      ]),
    );
    fireEvent.press(screen.getByText('Evet'));
    expect(calls).toEqual(['select']);
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(calls).toEqual(['select', 'press']);
  });

  it('kuyruktaki alert 50 ms değil, kapanış bitince açılır', () => {
    render(<AlertDialogHost />);
    act(() => {
      realAlert('Birinci', undefined, [{ text: 'Tamam1' }]);
      realAlert('İkinci', undefined, [{ text: 'Tamam2' }]);
    });
    fireEvent.press(screen.getByText('Tamam1'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS - 1));
    expect(screen.queryByText('İkinci')).toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByText('İkinci')).toBeTruthy();
    expect(modal().props.visible).toBe(true);
  });

  it('onPress içinden açılan alert, kuyruktaki alert\'in arkasına girer (sıra korunur)', () => {
    render(<AlertDialogHost />);
    act(() => {
      realAlert('A', undefined, [{ text: 'a', onPress: () => realAlert('C', undefined, [{ text: 'c' }]) }]);
      realAlert('B', undefined, [{ text: 'b' }]);
    });
    fireEvent.press(screen.getByText('a'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS * 2)); // kapanış + onPress sonrası oturma
    expect(screen.getByText('B')).toBeTruthy();
    fireEvent.press(screen.getByText('b'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(screen.getByText('C')).toBeTruthy();
  });

  it('kapanırken ikinci basış onPress\'i ikinci kez çalıştırmaz', () => {
    const onPress = jest.fn();
    render(<AlertDialogHost />);
    act(() => realAlert('Başlık', undefined, [{ text: 'Evet', onPress }]));
    // Gerçek RNModal solma animasyonu sırasında düğme hâlâ dokunulabilir.
    const button = screen.getByText('Evet');
    fireEvent.press(button);
    fireEvent.press(button);
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS * 3));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('dışarı dokunarak kapatma (cancelable) options.onDismiss\'i de ertelenmiş çağırır', () => {
    const onDismiss = jest.fn();
    render(<AlertDialogHost />);
    act(() => realAlert('Başlık', undefined, undefined, { cancelable: true, onDismiss }));
    act(() => modal().props.onRequestClose());
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('iOS: RNModal onDismiss', () => {
  beforeEach(() => setPlatform('ios'));

  it('onPress sabit süre değil onDismiss gelince çalışır', () => {
    const onPress = jest.fn();
    render(<AlertDialogHost />);
    act(() => realAlert('Başlık', undefined, [{ text: 'Evet', onPress }]));

    fireEvent.press(screen.getByText('Evet'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS * 2));
    expect(onPress).not.toHaveBeenCalled(); // kapanış bitmedi

    act(() => modal().props.onDismiss());
    expect(onPress).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(MODAL_DISMISS_TIMEOUT_MS * 2));
    expect(onPress).toHaveBeenCalledTimes(1); // yedek zamanlayıcı ikinci kez çalıştırmaz
  });

  it('kuyruktaki alert onDismiss ile açılır', () => {
    render(<AlertDialogHost />);
    act(() => {
      realAlert('Birinci', undefined, [{ text: 'Tamam1' }]);
      realAlert('İkinci', undefined, [{ text: 'Tamam2' }]);
    });
    fireEvent.press(screen.getByText('Tamam1'));
    expect(screen.queryByText('İkinci')).toBeNull();
    act(() => modal().props.onDismiss());
    expect(screen.getByText('İkinci')).toBeTruthy();
  });

  it('onDismiss hiç gelmezse üst sınırda yine de ilerler', () => {
    const onPress = jest.fn();
    render(<AlertDialogHost />);
    act(() => realAlert('Başlık', undefined, [{ text: 'Evet', onPress }]));
    fireEvent.press(screen.getByText('Evet'));
    act(() => jest.advanceTimersByTime(MODAL_DISMISS_TIMEOUT_MS));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('kuyruktaki alert ile onPress\'in açtığı modal çakışmaz', () => {
  /** onPress'i bir native Modal (seçici) açan düğme + kuyrukta ikinci alert. */
  function Harness() {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    React.useEffect(() => {
      realAlert('A', undefined, [{ text: 'a', onPress: () => { events.push('onPress'); setPickerOpen(true); } }]);
      realAlert('B', undefined, [{ text: 'b' }]);
    }, []);
    return (
      <>
        <AlertDialogHost />
        {pickerOpen && <RNModal visible testID="picker"><></></RNModal>}
      </>
    );
  }
  let events: string[];
  beforeEach(() => {
    events = [];
    setPlatform('android');
  });

  it('onPress önce çalışır; sıradaki alert aynı tick\'te değil, bir pencere sonra açılır', () => {
    render(<Harness />);
    expect(screen.getByText('A')).toBeTruthy();
    fireEvent.press(screen.getByText('a'));

    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(events).toEqual(['onPress']);
    expect(screen.getByTestId('picker')).toBeTruthy(); // seçici açıldı
    expect(screen.queryByText('B')).toBeNull(); // B aynı anda sunulmadı (iOS reddederdi)

    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS - 1));
    expect(screen.queryByText('B')).toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByText('B')).toBeTruthy(); // ikisi de kaybolmadı, sırayla göründü
  });

  it('B de kapanınca host boşalır (busy takılı kalmaz), yeni alert görünür', () => {
    render(<Harness />);
    fireEvent.press(screen.getByText('a'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS * 2));
    fireEvent.press(screen.getByText('b'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    act(() => realAlert('Son', undefined, [{ text: 'z' }]));
    expect(screen.getByText('Son')).toBeTruthy();
  });
});

describe('iOS sunum watchdog\'u (onShow gelmezse yeniden dener)', () => {
  beforeEach(() => setPlatform('ios'));

  it('onShow gelmezse modal yeniden bağlanır, gelirse bir daha denemez', () => {
    render(<AlertDialogHost />);
    act(() => realAlert('Başlık', undefined, [{ text: 'Tamam' }]));
    const first = screen.getByText('Başlık');

    act(() => jest.advanceTimersByTime(MODAL_PRESENT_RETRY_MS - 1));
    expect(screen.getByText('Başlık')).toBe(first); // henüz yeniden denenmedi
    act(() => jest.advanceTimersByTime(1));
    const second = screen.getByText('Başlık');
    expect(second).not.toBe(first); // yeniden bağlandı (sunum tekrar denendi)

    act(() => modal().props.onShow()); // bu sefer sunuldu
    act(() => jest.advanceTimersByTime(MODAL_PRESENT_RETRY_MS * 3));
    expect(screen.getByText('Başlık')).toBe(second);
  });

  it('reddedilen B sonunda görünür; host oturum boyunca kilitli kalmaz', () => {
    render(<AlertDialogHost />);
    act(() => {
      realAlert('A', undefined, [{ text: 'a' }]);
      realAlert('B', undefined, [{ text: 'b' }]);
    });
    act(() => modal().props.onShow());
    fireEvent.press(screen.getByText('a'));
    act(() => modal().props.onDismiss());
    expect(screen.getByText('B')).toBeTruthy(); // B sunuldu ama iOS reddetti: onShow yok
    act(() => jest.advanceTimersByTime(MODAL_PRESENT_RETRY_MS));
    act(() => modal().props.onShow()); // yeniden denemede sunuldu
    fireEvent.press(screen.getByText('b'));
    act(() => modal().props.onDismiss());
    act(() => realAlert('Son', undefined, [{ text: 'z' }]));
    expect(screen.getByText('Son')).toBeTruthy();
  });
});

describe('onSelect hata fırlatırsa host kilitlenmez', () => {
  beforeEach(() => setPlatform('android'));

  it('diyalog yine kapanır, onPress çalışır, sıradaki alert açılır', () => {
    const onPress = jest.fn();
    render(<AlertDialogHost />);
    act(() => {
      realAlert('A', undefined, [
        {
          text: 'a',
          onSelect: () => {
            throw new Error('boom');
          },
          onPress,
        },
      ]);
      realAlert('B', undefined, [{ text: 'b' }]);
    });
    expect(() => act(() => fireEvent.press(screen.getByText('a')))).toThrow('boom'); // hata yutulmaz
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS * 2)); // kapanış zamanlayıcısı yine kuruldu
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('B')).toBeTruthy();
  });

  it('sonraki alert\'ler normal çalışmaya devam eder', () => {
    render(<AlertDialogHost />);
    act(() =>
      realAlert('A', undefined, [
        {
          text: 'a',
          onSelect: () => {
            throw new Error('boom');
          },
        },
      ]),
    );
    expect(() => act(() => fireEvent.press(screen.getByText('a')))).toThrow('boom');
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    act(() => realAlert('Yeni', undefined, [{ text: 'y' }]));
    expect(screen.getByText('Yeni')).toBeTruthy();
  });
});

describe('kapanma penceresi: dokunma + geri tuşu yutulur (çift geri engeli)', () => {
  let backHandlers: (() => boolean)[];
  let removed: number;
  beforeEach(() => {
    setPlatform('android');
    backHandlers = [];
    removed = 0;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_type, fn) => {
      backHandlers.push(fn as () => boolean);
      return { remove: () => { removed += 1; } };
    });
  });
  afterEach(() => jest.restoreAllMocks());

  const pressBack = () => backHandlers.slice(-1).some((h) => h());

  it('pencere boyunca kalkan var ve geri tuşu yutulur; onPress bitince ve oturunca kalkar', () => {
    const back = jest.fn();
    render(<AlertDialogHost />);
    act(() => realAlert('Başlık', undefined, [{ text: 'Tamam', onPress: back }]));
    expect(screen.queryByTestId('alert-dialog-shield')).toBeNull();
    expect(backHandlers).toHaveLength(0); // açıkken geri tuşuna karışmaz (Modal onRequestClose)

    fireEvent.press(screen.getByText('Tamam'));
    expect(screen.getByTestId('alert-dialog-shield')).toBeTruthy();
    expect(pressBack()).toBe(true); // OK'tan hemen sonra geri tuşu yutuldu

    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS)); // onPress çalıştı, oturma sürüyor
    expect(back).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('alert-dialog-shield')).toBeTruthy();
    expect(pressBack()).toBe(true);

    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(screen.queryByTestId('alert-dialog-shield')).toBeNull();
    expect(removed).toBe(backHandlers.length); // dinleyici sökülür, geri tuşu serbest
  });

  it('onPress\'siz düğmede kalkan yalnız kapanış süresince durur', () => {
    render(<AlertDialogHost />);
    act(() => realAlert('Başlık', undefined, [{ text: 'Tamam' }]));
    fireEvent.press(screen.getByText('Tamam'));
    expect(screen.getByTestId('alert-dialog-shield')).toBeTruthy();
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(screen.queryByTestId('alert-dialog-shield')).toBeNull();
  });

  it('iOS\'ta onDismiss hiç gelmese de kalkan modal-timing üst sınırını aşmaz', () => {
    setPlatform('ios');
    render(<AlertDialogHost />);
    act(() => realAlert('Başlık', undefined, [{ text: 'Tamam', onPress: jest.fn() }]));
    act(() => modal().props.onShow());
    fireEvent.press(screen.getByText('Tamam'));
    act(() => jest.advanceTimersByTime(MODAL_SHIELD_MAX_MS - 1));
    expect(screen.getByTestId('alert-dialog-shield')).toBeTruthy();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.queryByTestId('alert-dialog-shield')).toBeNull();
  });

  it('sıradaki alert varken kalkan alert\'ler arasında da kesintisiz durur, sonra serbest kalır', () => {
    render(<AlertDialogHost />);
    act(() => {
      realAlert('A', undefined, [{ text: 'a', onPress: jest.fn() }]);
      realAlert('B', undefined, [{ text: 'b' }]);
    });
    fireEvent.press(screen.getByText('a'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS * 2));
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.queryByTestId('alert-dialog-shield')).toBeNull(); // B açıkken kalkan yok
  });
});
