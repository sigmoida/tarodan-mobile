const mockGet = jest.fn();
const mockSet = jest.fn();
const mockRemove = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...a: unknown[]) => mockGet(...a),
    setItem: (...a: unknown[]) => mockSet(...a),
    removeItem: (...a: unknown[]) => mockRemove(...a),
  },
}));

import {
  canShowPopupAd,
  markPopupAdShown,
  clearPopupAdShown,
  POPUP_AD_INTERVAL_MS,
  POPUP_AD_STORAGE_KEY,
} from '../popupFrequency';

const NOW = 1_800_000_000_000;

beforeEach(() => {
  mockGet.mockReset();
  mockSet.mockReset();
  mockRemove.mockReset();
});

describe('canShowPopupAd', () => {
  it('damga yoksa gösterir', async () => {
    mockGet.mockResolvedValue(null);
    await expect(canShowPopupAd(NOW)).resolves.toBe(true);
    expect(mockGet).toHaveBeenCalledWith(POPUP_AD_STORAGE_KEY);
  });

  it('24 saat dolmadıysa göstermez, dolunca gösterir', async () => {
    mockGet.mockResolvedValue(String(NOW - POPUP_AD_INTERVAL_MS + 1000));
    await expect(canShowPopupAd(NOW)).resolves.toBe(false);
    mockGet.mockResolvedValue(String(NOW - POPUP_AD_INTERVAL_MS));
    await expect(canShowPopupAd(NOW)).resolves.toBe(true);
  });

  it('bozuk damga ya da gelecekteki damga (saat geri alınmış) kilitlemez', async () => {
    mockGet.mockResolvedValue('abc');
    await expect(canShowPopupAd(NOW)).resolves.toBe(true);
    mockGet.mockResolvedValue(String(NOW + 60_000));
    await expect(canShowPopupAd(NOW)).resolves.toBe(true);
  });

  it('depolama hata verirse gösterir (hata "gösterme" demek değil)', async () => {
    mockGet.mockRejectedValue(new Error('storage unavailable'));
    await expect(canShowPopupAd(NOW)).resolves.toBe(true);
  });
});

describe('markPopupAdShown', () => {
  it('damgayı yazar', async () => {
    mockSet.mockResolvedValue(undefined);
    await markPopupAdShown(NOW);
    expect(mockSet).toHaveBeenCalledWith(POPUP_AD_STORAGE_KEY, String(NOW));
  });

  it('yazma hatası fırlatmaz', async () => {
    mockSet.mockRejectedValue(new Error('quota'));
    await expect(markPopupAdShown(NOW)).resolves.toBeUndefined();
  });
});

describe('clearPopupAdShown', () => {
  it('damgayı siler; silinemezse fırlatmaz', async () => {
    mockRemove.mockResolvedValue(undefined);
    await clearPopupAdShown();
    expect(mockRemove).toHaveBeenCalledWith(POPUP_AD_STORAGE_KEY);
    mockRemove.mockRejectedValue(new Error('disk'));
    await expect(clearPopupAdShown()).resolves.toBeUndefined();
  });
});
