/**
 * 3DS'ten dönüş anı (`useThreeDSReturn`): verify'ın erken fazı bu anda başlar.
 */
import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { isPaytrUrl, useThreeDSReturn } from '../useThreeDSReturn';

const addListener = AppState.addEventListener as jest.Mock;
const lastListener = () => {
  const calls = addListener.mock.calls.filter(([event]) => event === 'change');
  return calls[calls.length - 1][1] as (state: string) => void;
};

beforeEach(() => {
  addListener.mockClear();
});

describe('isPaytrUrl', () => {
  it.each([
    'https://www.paytr.com/odeme',
    'https://paytr.com/odeme/guvenli/abc',
    'https://www.paytr.com',
    'http://www.paytr.com:443/x?y=1',
    'HTTPS://WWW.PAYTR.COM/ODEME',
  ])('%s → PayTR', (url) => {
    expect(isPaytrUrl(url)).toBe(true);
  });

  it.each([
    'https://acs.examplebank.com.tr/3ds',
    'https://paytr.com.evil.example/odeme',
    'https://notpaytr.com/odeme',
    'https://evil.example/?next=https://www.paytr.com',
    'about:blank',
    '',
  ])('%s → PayTR değil', (url) => {
    expect(isPaytrUrl(url)).toBe(false);
  });
});

describe('useThreeDSReturn', () => {
  it('WebView: PayTR → banka → PayTR dönüşü bildirir; banka görülmeden PayTR bildirmez', () => {
    const onReturn = jest.fn();
    const { result } = renderHook(() => useThreeDSReturn(true, onReturn));
    result.current.onNavigate('https://www.paytr.com/odeme');
    result.current.onNavigate('https://www.paytr.com/odeme/guvenli/form');
    expect(onReturn).not.toHaveBeenCalled();
    result.current.onNavigate('https://acs.examplebank.com.tr/3ds');
    expect(onReturn).not.toHaveBeenCalled();
    result.current.onNavigate('https://www.paytr.com/odeme/guvenli/sonuc');
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it('uygulama arka plandan öne gelince bildirir; inactive → active bildirmez', () => {
    const onReturn = jest.fn();
    renderHook(() => useThreeDSReturn(true, onReturn));
    const listener = lastListener();
    listener('inactive');
    listener('active');
    expect(onReturn).not.toHaveBeenCalled();
    listener('inactive');
    listener('background');
    listener('active');
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it('3DS açık değilken (active=false) dinlemez, gezinmeyi yok sayar', () => {
    const onReturn = jest.fn();
    const { result } = renderHook(() => useThreeDSReturn(false, onReturn));
    expect(addListener).not.toHaveBeenCalled();
    result.current.onNavigate('https://acs.examplebank.com.tr/3ds');
    result.current.onNavigate('https://www.paytr.com/odeme');
    expect(onReturn).not.toHaveBeenCalled();
  });

  it('3DS kapanınca dinleyici kaldırılır; yeni 3DS oturumu banka görülmesini sıfırlar', () => {
    const onReturn = jest.fn();
    const remove = jest.fn();
    addListener.mockImplementationOnce(() => ({ remove }));
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useThreeDSReturn(active, onReturn),
      { initialProps: { active: true } },
    );
    result.current.onNavigate('https://acs.examplebank.com.tr/3ds');
    rerender({ active: false });
    expect(remove).toHaveBeenCalled();
    rerender({ active: true });
    result.current.onNavigate('https://www.paytr.com/odeme');
    expect(onReturn).not.toHaveBeenCalled();
  });
});
