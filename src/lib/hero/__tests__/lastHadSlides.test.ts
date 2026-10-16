const mockGetItem = jest.fn<Promise<string | null>, [string]>();
const mockSetItem = jest.fn<Promise<void>, [string, string]>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => mockGetItem(k),
    setItem: (k: string, v: string) => mockSetItem(k, v),
  },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import {
  HERO_HOME_LAST_HAD_SLIDES_KEY,
  readLastHadSlides,
  resetLastHadSlidesCache,
  useLastHadSlides,
  writeLastHadSlides,
} from '../lastHadSlides';

beforeEach(() => {
  resetLastHadSlidesCache();
  mockGetItem.mockReset();
  mockSetItem.mockReset().mockResolvedValue(undefined);
});

describe('lastHadSlides', () => {
  it('anahtar hero.home.lastHadSlides', () => {
    expect(HERO_HOME_LAST_HAD_SLIDES_KEY).toBe('hero.home.lastHadSlides');
  });

  it("'1' → true; '0' / yok → false; okuma hatası → false", async () => {
    mockGetItem.mockResolvedValueOnce('1');
    expect(await readLastHadSlides()).toBe(true);
    resetLastHadSlidesCache();
    mockGetItem.mockResolvedValueOnce('0');
    expect(await readLastHadSlides()).toBe(false);
    resetLastHadSlidesCache();
    mockGetItem.mockResolvedValueOnce(null);
    expect(await readLastHadSlides()).toBe(false);
    resetLastHadSlidesCache();
    mockGetItem.mockRejectedValueOnce(new Error('x'));
    expect(await readLastHadSlides()).toBe(false);
  });

  it('depo bir kez okunur; yazma önbelleği günceller ve depoya yazar', async () => {
    mockGetItem.mockResolvedValue('0');
    await readLastHadSlides();
    await writeLastHadSlides(true);
    expect(mockSetItem).toHaveBeenCalledWith(HERO_HOME_LAST_HAD_SLIDES_KEY, '1');
    expect(await readLastHadSlides()).toBe(true);
    expect(mockGetItem).toHaveBeenCalledTimes(1);
  });

  it('yazma hatası sessizce geçer', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('x'));
    await expect(writeLastHadSlides(false)).resolves.toBeUndefined();
  });

  it('hook: ilk karede false, depo true ise güncellenir', async () => {
    mockGetItem.mockResolvedValue('1');
    const { result } = renderHook(() => useLastHadSlides());
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });
});
