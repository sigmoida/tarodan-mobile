import React from 'react';
import { Text } from '@/ui';
import { DEFAULT_COUNTRY_CODE } from '@/utils/phone';

/**
 * Telefon alanının solundaki sabit ülke kodu ("+90"). Platform yalnız TR numarası kabul eder
 * (bkz. `@/utils/phone`), ülke seçici yok; kullanıcı yalnız `5XX XXX XX XX` yazar. `Input`'un
 * `leftIcon` slotuna verilir (`leftIcon={<PhonePrefix />}`).
 */
export const PhonePrefix: React.FC = () => (
  <Text variant="body" tone="muted" testID="phone-prefix">
    {DEFAULT_COUNTRY_CODE}
  </Text>
);

export default PhonePrefix;
