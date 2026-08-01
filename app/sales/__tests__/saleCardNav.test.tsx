import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SaleCard } from '../_components/SaleCard';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const sale: any = {
  id: 'sale-1',
  orderNumber: 'ORD-1',
  status: 'paid',
  totalAmount: 1000,
  createdAt: '2026-01-01T00:00:00.000Z',
  product: { title: 'Test Ürün', images: [] },
  buyer: { displayName: 'Alıcı' },
  shippingAddress: { city: 'İstanbul' },
};

const actions: any = {
  updateStatusMutation: { isPending: false, variables: undefined },
  handleMarkAsProcessing: jest.fn(),
  setShipDialog: jest.fn(),
};

describe('SaleCard navigasyonu', () => {
  beforeEach(() => jest.clearAllMocks());

  it('karta basınca satış detayına gider', () => {
    const { getByTestId } = render(<SaleCard sale={sale} actions={actions} />);
    fireEvent.press(getByTestId('sale-card-sale-1'));
    expect(router.push).toHaveBeenCalledWith('/sales/sale-1');
  });

  it('aksiyon butonu navigasyonu TETİKLEMEZ', () => {
    const { getByText } = render(<SaleCard sale={sale} actions={actions} />);
    fireEvent.press(getByText('Hazırlanıyor Olarak İşaretle'));
    expect(actions.handleMarkAsProcessing).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
