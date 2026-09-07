/**
 * Limit uyarıları iOS'ta yükseltmeye çağırmamalı. Adres limiti temsilî
 * seçildi: dördü de aynı `limitAlert` yardımcısından geçiyor.
 */
import { Platform } from 'react-native';

jest.mock('@/ui', () => ({ appAlert: jest.fn() }));
import { appAlert } from '@/ui';
const mockAlert = appAlert as unknown as jest.Mock;

it('iOS: adres limiti uyarısında yükseltme düğmesi yok', () => {
  Platform.OS = 'ios';
  let limitAlert: any;
  jest.isolateModules(() => {
    limitAlert = require('@/lib/purchases').limitAlert;
  });
  limitAlert({
    title: 'Adres limiti',
    message: 'En fazla 10 adres',
    cancelLabel: 'İptal',
    upgradeLabel: 'Premium ol',
    onUpgrade: jest.fn(),
  });
  expect(mockAlert.mock.calls[0][2]).toHaveLength(1);
});
