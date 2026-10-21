import { useEffect, useState } from 'react';
import { isAppleAvailable } from '@/services/appleSignin';

/**
 * Can this device show Sign in with Apple? `false` until the async check resolves, and
 * always `false` off iOS (ADR 0012). One source for the login, register and step-up screens.
 */
export function useAppleAvailability(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    isAppleAvailable().then((value) => {
      if (active) setAvailable(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return available;
}
