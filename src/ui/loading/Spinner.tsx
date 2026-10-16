import React from 'react';
import { LoadingIndicator, type LoadingIndicatorProps } from './LoadingIndicator';

export type SpinnerProps = LoadingIndicatorProps;

/**
 * Geriye uyum adı: `Spinner` = `LoadingIndicator` (aynı tek gösterge; bkz. değiştirme notu orada).
 * Yeni kodda renk yerine `tone` (`primary` | `inverted` | `muted`) verin.
 */
export const Spinner: React.FC<SpinnerProps> = (props) => <LoadingIndicator {...props} />;
