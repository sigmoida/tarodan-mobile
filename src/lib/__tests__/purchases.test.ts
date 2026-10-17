/**
 * Uygulama içi dijital satış iki mağazada da kapalı: iOS'ta Apple IAP'siz
 * (Guideline 3.1.1 / 3.1.3(g)), Android'de Play Billing'siz yapılamaz. Kapı TEK
 * bir sabitte durur; ekranlar doğrudan `Platform`'a bakmaz. Bu test hem sabiti
 * hem de `limitAlert`'in yükseltme düğmesini İKİ platformda da EKLEMEDİĞİNİ
 * sabitler.
 */
jest.mock('@/ui', () => ({ appAlert: jest.fn() }));

import { Platform } from 'react-native';
import { appAlert } from '@/ui';

const mockAlert = appAlert as unknown as jest.Mock;

const loadModule = () => {
  const osValue = Platform.OS;
  let mod: typeof import('../purchases');
  jest.isolateModules(() => {
    Platform.OS = osValue;
    mod = require('../purchases');
  });
  return mod!;
};

const opts = {
  title: 'Limit',
  message: 'Doldu',
  cancelLabel: 'İptal',
  upgradeLabel: 'Premium',
  onUpgrade: jest.fn(),
};

beforeEach(() => {
  // jest-expo Platform.OS'ü yazılabilir yap.
  Object.defineProperty(Platform, 'OS', {
    value: 'ios',
    writable: true,
    configurable: true,
  });
  mockAlert.mockReset();
});

afterEach(() => {
  Platform.OS = 'ios';
});

describe('CAN_BUY_DIGITAL', () => {
  it('iOS ise kapalı', () => {
    Platform.OS = 'ios';
    expect(loadModule().CAN_BUY_DIGITAL).toBe(false);
  });

  it('Android ise de kapalı (Play Billing yok)', () => {
    Platform.OS = 'android';
    expect(loadModule().CAN_BUY_DIGITAL).toBe(false);
  });
});

describe('limitAlert', () => {
  it('iOS: yalnız bilgi, yükseltme düğmesi YOK', () => {
    Platform.OS = 'ios';
    loadModule().limitAlert(opts);
    const buttons = mockAlert.mock.calls[0][2];
    expect(buttons).toHaveLength(1);
    expect(buttons[0].text).toBe('İptal');
    expect(JSON.stringify(buttons)).not.toContain('Premium');
  });

  it('Android: iOS gibi yalnız bilgi, yükseltme düğmesi YOK', () => {
    Platform.OS = 'android';
    loadModule().limitAlert(opts);
    const buttons = mockAlert.mock.calls[0][2];
    expect(buttons).toHaveLength(1);
    expect(buttons[0].text).toBe('İptal');
    expect(JSON.stringify(buttons)).not.toContain('Premium');
    expect(opts.onUpgrade).not.toHaveBeenCalled();
  });

  it('onCancel verilirse iptal düğmesine bağlanır (platformdan bağımsız)', () => {
    Platform.OS = 'ios';
    const onCancel = jest.fn();
    loadModule().limitAlert({ ...opts, onCancel });
    const buttons = mockAlert.mock.calls[0][2];
    expect(buttons[0].text).toBe('İptal');
    buttons[0].onPress();
    expect(onCancel).toHaveBeenCalled();
  });
});
