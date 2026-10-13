import { Platform } from 'react-native';
import { theme } from '@/ui';
import { androidRipple, rippleClip, showPressedStyle } from '../pressableFeedback';

const { overlay } = theme.colors;

describe('pressableFeedback', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('iOS', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'ios');
    });

    it('ripple ve kırpma yok; basılı stil (opaklık) uygulanır', () => {
      expect(androidRipple()).toBeUndefined();
      expect(androidRipple({ borderless: true, radius: 22 })).toBeUndefined();
      expect(rippleClip()).toBeUndefined();
      expect(showPressedStyle(true)).toBe(true);
      expect(showPressedStyle(false)).toBe(false);
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    it('sınırlı dalga: ön planda (köşeye kırpılabilsin), açık zeminde koyu ton', () => {
      expect(androidRipple()).toEqual({ color: overlay.black10, borderless: false, foreground: true });
      expect(rippleClip()).toEqual({ overflow: 'hidden' });
    });

    it('dolu zeminde açık ton', () => {
      expect(androidRipple({ tone: 'onDark' })).toMatchObject({ color: overlay.white20, foreground: true });
    });

    it('sınırsız dalga (zeminsiz ikon düğmesi): yarıçaplı, ön plan değil', () => {
      expect(androidRipple({ borderless: true, radius: 22 })).toEqual({
        color: overlay.black10,
        borderless: true,
        radius: 22,
      });
    });

    it('basılı opaklık yok (ripple yeterli)', () => {
      expect(showPressedStyle(true)).toBe(false);
    });
  });
});
