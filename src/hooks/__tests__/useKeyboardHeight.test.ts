/**
 * useKeyboardHeight o anki klavyeden tohumlanır: yüzey klavye ZATEN açıkken bağlanırsa (sheet
 * odaklı bir alandan açıldı) "show" olayı bir daha gelmez — 0'dan başlamamalı.
 */
import { Keyboard } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { currentKeyboardHeight, useKeyboardHeight } from '../useKeyboardHeight';

afterEach(() => jest.restoreAllMocks());

describe('useKeyboardHeight', () => {
  it('klavye açıkken bağlanınca açık klavyenin yüksekliğiyle başlar', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    jest.spyOn(Keyboard, 'metrics').mockReturnValue({ screenX: 0, screenY: 500, width: 390, height: 280 });
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(280);
  });

  it('klavye kapalıyken 0', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);
  });

  it('ölçü okunamazsa 0 (emniyet)', () => {
    jest.spyOn(Keyboard, 'isVisible').mockImplementation(() => {
      throw new Error('yok');
    });
    expect(currentKeyboardHeight()).toBe(0);
  });
});
