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
    expect(boxOf()).toMatchObject({ backgroundColor: bg, borderRadius: theme.radiusRole.badge });
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
  it('sale = danger solid, sm, kalın; köşe tüm rozetlerle aynı (radiusRole.badge)', () => {
    render(<ProductBadge testID="b" variant="sale">%20</ProductBadge>);
    expect(boxOf()).toMatchObject({ backgroundColor: colors.danger[600], borderRadius: theme.radiusRole.badge });
    expect(textOf('%20').fontWeight).toBe('700');
  });
});

describe('bilinmeyen durum → nötr outline', () => {
  const config = { paid: { label: 'Ödendi', variant: 'success' as const } };
  const boxOfText = (text: string) => {
    let node = screen.getByText(text).parent;
    while (node && StyleSheet.flatten(node.props.style)?.borderRadius === undefined) node = node.parent;
    return StyleSheet.flatten(node?.props.style);
  };

  it('StatusBadge: bilinen durum haritanın rengi, bilinmeyen outline (marka tonu DEĞİL)', () => {
    render(
      <>
        <StatusBadge status="paid" config={config} />
        <StatusBadge status="mystery" config={config} />
      </>,
    );
    expect(boxOfText('Ödendi').backgroundColor).toBe(colors.success[100]);
    expect(boxOfText('mystery')).toMatchObject({ backgroundColor: 'transparent', borderWidth: 1 });
  });

  it('Badge status modu: bilinmeyen durum outline, bilinen haritanın rengi', () => {
    render(
      <>
        <Badge status="paid" config={config} />
        <Badge status="mystery" config={config} />
      </>,
    );
    expect(boxOfText('Ödendi').backgroundColor).toBe(colors.success[100]);
    expect(boxOfText('mystery')).toMatchObject({ backgroundColor: 'transparent', borderWidth: 1 });
  });
});

describe('tek rozet köşesi (radiusRole.badge)', () => {
  it('web Badge rounded-lg = 6; sayaç dairesi ve seçim çipi ayrı rol', () => {
    expect(theme.radiusRole.badge).toBe(theme.radius.lg);
    expect(theme.radiusRole.counter).toBe(theme.radius.full);
    expect(theme.radiusRole.chip).toBe(theme.radius.full);
  });
});
