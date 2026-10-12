import {
  dispatchAddressStatus,
  isValidDispatchPhone,
  pickDispatchAddress,
} from '../dispatchAddress';

const GOOD = {
  id: 'a1',
  phone: '+905321234567',
  city: 'İstanbul',
  district: 'Kadıköy',
  address: 'Moda Cd. 1',
};

describe('isValidDispatchPhone', () => {
  it.each([
    ['+905321234567', true],
    ['+902121234567', false], // sabit hat
    ['+90532123456', false], // kısa
    ['05321234567', false], // E.164 değil
    ['+905321234567 ', false],
    ['', false],
    [null, false],
    [undefined, false],
  ])('%s -> %s', (v, ok) => {
    expect(isValidDispatchPhone(v as string | null | undefined)).toBe(ok);
  });
});

describe('pickDispatchAddress', () => {
  it('varsayılan varsa o, yoksa ilk kayıt', () => {
    expect(pickDispatchAddress([{ id: 'x' }, { id: 'y', isDefault: true }])?.id).toBe('y');
    expect(pickDispatchAddress([{ id: 'x' }, { id: 'y' }])?.id).toBe('x');
    expect(pickDispatchAddress([])).toBeUndefined();
    expect(pickDispatchAddress(null)).toBeUndefined();
  });
});

describe('dispatchAddressStatus', () => {
  it('adres yok -> ekle (needsFix false)', () => {
    expect(dispatchAddressStatus([])).toEqual({ hasDispatchAddress: false, needsFix: false });
  });
  it('geçerli adres -> kapı açık', () => {
    expect(dispatchAddressStatus([GOOD])).toEqual({ hasDispatchAddress: true, needsFix: false });
  });
  it.each([
    ['sabit hat', { phone: '+902121234567' }],
    ['boş adres', { address: '   ' }],
    ['şehir yok', { city: '' }],
    ['ilçe yok', { district: null }],
  ])('%s -> düzelt', (_n, patch) => {
    expect(dispatchAddressStatus([{ ...GOOD, ...patch }])).toEqual({
      hasDispatchAddress: false,
      needsFix: true,
    });
  });
  it('yalnız seçilen adres değerlendirilir (varsayılan bozuksa diğeri kurtarmaz)', () => {
    const r = dispatchAddressStatus([GOOD, { ...GOOD, id: 'a2', isDefault: true, phone: '+902121234567' }]);
    expect(r.needsFix).toBe(true);
  });
});
