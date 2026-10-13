import React, { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { zIndex } from '@/theme';
import { theme } from '../lib/theme';
import { Snackbar } from './Snackbar';

/**
 * Global toast — web'deki `react-hot-toast`'un karşılığı (`toast(...)`, `toast.success(...)`,
 * `toast.error(...)`). Bilgi ve başarı mesajları için; onay isteyen ya da kullanıcının bir şey
 * yapması gereken hatalar `appAlert` diyaloğuna gider.
 *
 * `<ToastHost />` kökte BİR KEZ bağlanır (app/_layout.tsx). Aynı anda tek toast görünür; yenisi
 * eskisinin yerini alır. Süreler react-hot-toast varsayılanları: başarı 2 sn, diğerleri 4 sn.
 *
 * Not: kök görünümde çizildiği için açık bir native `Modal`'ın ALTINDA kalır — modal içinden
 * sonuç bildirirken önce modalı kapatın (ModalFreeze kuralıyla aynı sıra).
 */
export type ToastKind = 'blank' | 'success' | 'error';

export interface ToastOptions {
  /** ms; 0 = kullanıcı kapatana dek. */
  duration?: number;
}

interface ToastRequest {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
}

const DEFAULT_DURATION: Record<ToastKind, number> = { blank: 4000, success: 2000, error: 4000 };

type Listener = (request: ToastRequest | null) => void;
let listener: Listener | null = null;
let pending: ToastRequest | null = null;
let seq = 0;

function emit(kind: ToastKind, message: string, options?: ToastOptions): number {
  seq += 1;
  const request: ToastRequest = {
    id: seq,
    kind,
    message,
    duration: options?.duration ?? DEFAULT_DURATION[kind],
  };
  if (listener) listener(request);
  else pending = request; // host bağlanınca gösterilir (yalnız son mesaj)
  return request.id;
}

type ToastFn = ((message: string, options?: ToastOptions) => number) & {
  success: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  dismiss: () => void;
};

export const toast: ToastFn = Object.assign(
  (message: string, options?: ToastOptions) => emit('blank', message, options),
  {
    success: (message: string, options?: ToastOptions) => emit('success', message, options),
    error: (message: string, options?: ToastOptions) => emit('error', message, options),
    dismiss: () => {
      pending = null;
      listener?.(null);
    },
  },
);

const { colors, spacing, iconSize } = theme;

/** Sekme çubuğunun üstünde kalsın diye alt güvenli alana eklenen pay. */
const BOTTOM_OFFSET = spacing[16];

const ICON: Record<ToastKind, React.ReactNode> = {
  blank: null,
  success: <Ionicons name="checkmark-circle" size={iconSize.md} color={colors.success[500]} />,
  error: <Ionicons name="close-circle" size={iconSize.md} color={colors.danger[500]} />,
};

export const ToastHost: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastRequest | null>(null);

  useEffect(() => {
    listener = (request) => {
      setCurrent(request);
      if (request) AccessibilityInfo.announceForAccessibility?.(request.message);
    };
    if (pending) {
      listener(pending);
      pending = null;
    }
    return () => {
      listener = null;
    };
  }, []);

  const dismiss = useCallback(() => setCurrent(null), []);

  if (!current) return null;
  return (
    <Snackbar
      key={current.id}
      visible
      appearance="toast"
      icon={ICON[current.kind]}
      duration={current.duration}
      onDismiss={dismiss}
      style={{ bottom: insets.bottom + BOTTOM_OFFSET, zIndex: zIndex.toast, elevation: zIndex.toast }}
      testID="toast"
    >
      {current.message}
    </Snackbar>
  );
};

/** YALNIZ TEST: modül durumunu sıfırlar. */
export function resetToastForTests(): void {
  pending = null;
  listener = null;
}

