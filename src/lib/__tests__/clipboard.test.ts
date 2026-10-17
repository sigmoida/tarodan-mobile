/**
 * Pano: hassas değer (2FA gizli anahtarı / yedek kodlar) süre dolunca temizlenir; arada
 * uygulamadan başka bir kopya yapılırsa temizlik onu silmez.
 */
import { Clipboard } from 'react-native';
import { copySensitiveToClipboard, copyToClipboard, SENSITIVE_CLIPBOARD_TTL_MS } from '../clipboard';

let setString: jest.SpyInstance;
beforeEach(() => {
  jest.useFakeTimers();
  setString = jest.spyOn(Clipboard, 'setString').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  setString.mockRestore();
});

it('hassas kopya süre dolunca panoyu boşaltır', () => {
  expect(copySensitiveToClipboard('JBSWY3DPEHPK3PXP')).toBe(true);
  expect(setString).toHaveBeenLastCalledWith('JBSWY3DPEHPK3PXP');
  jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS - 1);
  expect(setString).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1);
  expect(setString).toHaveBeenLastCalledWith('');
});

it('arada uygulamadan başka bir şey kopyalanırsa temizlik iptal olur', () => {
  copySensitiveToClipboard('secret');
  copyToClipboard('https://tarodan.com.tr/collections/c1');
  jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS * 2);
  expect(setString).toHaveBeenLastCalledWith('https://tarodan.com.tr/collections/c1');
});

it('ikinci hassas kopya süreyi baştan başlatır', () => {
  copySensitiveToClipboard('a');
  jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS / 2);
  copySensitiveToClipboard('b');
  jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS / 2 + 1);
  expect(setString).toHaveBeenLastCalledWith('b');
  jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS);
  expect(setString).toHaveBeenLastCalledWith('');
});

it('boş değer yazılmaz', () => {
  expect(copySensitiveToClipboard('')).toBe(false);
  expect(setString).not.toHaveBeenCalled();
});
