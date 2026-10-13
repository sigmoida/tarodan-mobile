import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Badge, ProductBadge, StatusBadge, theme } from '@/ui';

const { colors } = theme;

const boxOf = () => StyleSheet.flatten(screen.getByTestId('b').props.style);
const textOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

describe('Badge (web @tarodan/ui)', () => {
  it.each([
    ['default', colors.primary[100], colors.primary[800]],
    ['success', colors.success[100], colors.success[800]],
    ['warning', colors.warning[100], colors.warning[800]],
    ['danger', colors.danger[100], colors.danger[800]],
  ] as const)('%s soft = X-100 / X-800', (variant, bg, fg) => {
    render(<Badge testID="b" variant={variant}>Etiket</Badge>);
    expect(boxOf()).toMatchObject({ backgroundColor: bg, borderRadius: theme.radius.lg });
    expect(textOf('Etiket').color).toBe(fg);
  });

  it('outline: çerçeveli, zeminsiz', () => {
    render(<Badge testID="b" variant="outline">Ç</Badge>);
    expect(boxOf()).toMatchObject({ backgroundColor: 'transparent', borderWidth: 1 });
  });

  it('fazla varyantlar çalışmaya devam eder', () => {
    for (const v of ['info', 'primary', 'secondary', 'destructive'] as const) {
      const { unmount } = render(<Badge variant={v}>{v}</Badge>);
      expect(screen.getByText(v)).toBeTruthy();
      unmount();
    }
  });

  it('solid görünüm güçlü dolgu', () => {
    render(<Badge testID="b" variant="danger" appearance="solid">İndirim</Badge>);
    expect(boxOf().backgroundColor).toBe(colors.danger[600]);
    expect(textOf('İndirim').color).toBe(colors.text.inverted);
  });

  it('durum modu ve aktif/pasif ön ayarı', () => {
    const config = { shipped: { label: 'Kargoda', variant: 'warning' as const } };
    render(
      <>
        <Badge status="shipped" config={config} />
        <Badge active={false} />
        <StatusBadge status="shipped" config={config} />
      </>,
    );
    expect(screen.getAllByText('Kargoda')).toHaveLength(2);
    expect(screen.getByText('Pasif')).toBeTruthy();
  });
});

describe('ProductBadge', () => {
  it('sale = danger solid, sm, kalın', () => {
    render(<ProductBadge testID="b" variant="sale">%20</ProductBadge>);
    expect(boxOf()).toMatchObject({ backgroundColor: colors.danger[600], borderRadius: theme.radius.md });
    expect(textOf('%20').fontWeight).toBe('700');
  });
});
