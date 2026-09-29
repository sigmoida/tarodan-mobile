/**
 * Production build'de ham teşhis (stack trace, "### TAB CRASHED ###") ekranda
 * görünmemeli — kullanıcı ve App Review çevrilmiş "tekrar dene" ekranını görür.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import i18n from '@/i18n/config';
import { shouldShowDiagnostics } from '@/config/diagnostics';
import { tabDiag } from '../_tabDiag';

function Boom(): React.ReactElement {
  throw new Error('kaboom');
}

describe('shouldShowDiagnostics', () => {
  it('production build (dev değil) → kapalı', () => {
    expect(shouldShowDiagnostics('production', false)).toBe(false);
  });
  it('staging/preview → açık', () => {
    expect(shouldShowDiagnostics('preview', false)).toBe(true);
  });
  it('geliştirme → açık', () => {
    expect(shouldShowDiagnostics('production', true)).toBe(true);
    expect(shouldShowDiagnostics(undefined, false)).toBe(true);
  });
});

describe('tabDiag', () => {
  const silence = jest.spyOn(console, 'error').mockImplementation(() => {});
  afterAll(() => silence.mockRestore());

  it('production: çöken sekme stack trace değil, tekrar dene ekranı gösterir', () => {
    const Wrapped = tabDiag('search', Boom, false);
    const { queryByText, getByText } = render(<Wrapped />);
    expect(queryByText(/TAB CRASHED/)).toBeNull();
    expect(queryByText(/kaboom/)).toBeNull();
    expect(getByText(i18n.t('mobile.errorRetry'))).toBeTruthy();
  });

  it('staging: teşhis ekranı görünür', () => {
    const Wrapped = tabDiag('search', Boom, true);
    const { getByText } = render(<Wrapped />);
    expect(getByText(/TAB CRASHED/)).toBeTruthy();
  });
});
