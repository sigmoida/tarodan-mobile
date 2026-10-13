/**
 * Ürün şikayeti TEK yüzey: `handleReport` artık 6 sebep düğmeli appAlert açmaz; misafire giriş
 * uyarısı (toast), üyede `ReportModal` durumunu açar (sebep listesi / gönderim orada).
 */
import { act, renderHook } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/stores/cartStore', () => ({
  useCartStore: () => ({ isInCart: () => false, setBuyNow: jest.fn() }),
}));
jest.mock('@/hooks/useCartSync', () => ({ useCartSync: () => ({ add: jest.fn(), removeByProductId: jest.fn() }) }));
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

import { toast } from '@/ui';
import { useProductActions } from '../_hooks/useProductActions';

const product = { id: 'p1', title: 'Ferrari F40', price: 100, seller: { id: 's1' } } as never;

function setup(isAuthenticated: boolean) {
  return renderHook(() =>
    useProductActions({
      product,
      productId: 'p1',
      images: [],
      isOutOfStock: false,
      isAuthenticated,
      user: isAuthenticated ? { id: 'me' } : null,
    }),
  );
}

describe('useProductActions.handleReport', () => {
  beforeEach(() => {
    (toast.error as jest.Mock).mockClear();
  });

  it('üye: appAlert yerine ReportModal durumunu açar', () => {
    const { appAlert } = jest.requireMock('@/ui') as { appAlert: jest.Mock };
    const { result } = setup(true);
    expect(result.current.reportOpen).toBe(false);
    act(() => result.current.handleReport());
    expect(result.current.reportOpen).toBe(true);
    expect(appAlert).not.toHaveBeenCalled();
    act(() => result.current.setReportOpen(false));
    expect(result.current.reportOpen).toBe(false);
  });

  it('misafir: giriş uyarısı (toast), pencere açılmaz', () => {
    const { result } = setup(false);
    act(() => result.current.handleReport());
    expect(result.current.reportOpen).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Raporlamak için giriş yapmalısınız');
  });
});
