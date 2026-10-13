/**
 * /tasarim vitrini yalnız geliştirme ve staging'de; production'da ana sayfaya yönlenir.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  Redirect: ({ href }: { href: string }) => {
    const { Text: T } = require('react-native');
    return <T>{`redirect:${href}`}</T>;
  },
}));

let mockShow = true;
jest.mock('@/config/diagnostics', () => ({
  shouldShowDiagnostics: () => mockShow,
}));
jest.mock('../_components/Showcase', () => ({
  Showcase: () => {
    const { Text: T } = require('react-native');
    return <T>vitrin</T>;
  },
}));

import DesignShowcaseScreen from '../index';

describe('/tasarim', () => {
  it('staging/dev: vitrin açılır', () => {
    mockShow = true;
    render(<DesignShowcaseScreen />);
    expect(screen.getByText('vitrin')).toBeTruthy();
  });

  it('production: vitrin YOK, ana sayfaya yönlenir', () => {
    mockShow = false;
    render(<DesignShowcaseScreen />);
    expect(screen.queryByText('vitrin')).toBeNull();
    expect(screen.getByText('redirect:/')).toBeTruthy();
  });
});

