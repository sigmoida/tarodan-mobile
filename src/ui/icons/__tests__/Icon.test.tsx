import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Icon, isIconName } from '../Icon';
import { ICON_PATHS } from '../icon-paths.generated';
import { ioniconToIcon, IONICON_TARGET_NAMES } from '../ionicons-compat';
import { resolveIcon } from '../resolve';
import { theme } from '../../lib/theme';

describe('Icon (Heroicons)', () => {
  it('web adıyla çizilir; testID icon-<ad>', () => {
    render(<Icon name="heart" />);
    expect(screen.getByTestId('icon-heart')).toBeTruthy();
  });

  it('varsayılan boyut iconSize.md, renk verilen renk', () => {
    render(<Icon name="check-circle" variant="solid" color={theme.colors.success[600]} />);
    const svg = screen.getByTestId('icon-check-circle');
    expect(svg.props.width).toBe(theme.iconSize.md);
    expect(svg.props.fill).toBe(theme.colors.success[600]);
  });

  it('outline: çizgi, solid: dolgu', () => {
    const { rerender } = render(<Icon name="star" color={theme.colors.black} />);
    expect(screen.getByTestId('icon-star').props.stroke).toBe(theme.colors.black);
    expect(screen.getByTestId('icon-star').props.fill).toBe('none');
    rerender(<Icon name="star" variant="solid" color={theme.colors.black} />);
    expect(screen.getByTestId('icon-star').props.fill).toBe(theme.colors.black);
  });

  it('accessibilityLabel yoksa süs, varsa erişilebilir görüntü', () => {
    const { rerender } = render(<Icon name="bell" />);
    expect(screen.getByTestId('icon-bell').props.accessible).toBe(false);
    rerender(<Icon name="bell" accessibilityLabel="Bildirimler" />);
    expect(screen.getByLabelText('Bildirimler')).toBeTruthy();
  });

  it('bilinmeyen ad: çökmez, null döner, dev\'de uyarır', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Icon name={'yok-boyle-ikon' as never} testID="x" />);
    expect(screen.queryByTestId('x')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('bilinmeyen ikon'));
    warn.mockRestore();
  });

  it('her ikonun iki varyantı da dolu', () => {
    for (const [name, def] of Object.entries(ICON_PATHS)) {
      expect(def.outline.length).toBeGreaterThan(0);
      expect(def.solid.length).toBeGreaterThan(0);
      expect(isIconName(name)).toBe(true);
    }
    expect(isIconName('nope')).toBe(false);
  });
});

describe('Ionicons -> Heroicons uyumluluk tablosu', () => {
  it('tüm hedef adlar gömülü ikon setinde var', () => {
    for (const n of IONICON_TARGET_NAMES) expect(isIconName(n)).toBe(true);
  });

  it('çıplak ad solid, -outline outline, glifler her zaman outline', () => {
    expect(ioniconToIcon('heart')).toEqual({ name: 'heart', variant: 'solid' });
    expect(ioniconToIcon('heart-outline')).toEqual({ name: 'heart', variant: 'outline' });
    expect(ioniconToIcon('checkmark-circle')).toEqual({ name: 'check-circle', variant: 'solid' });
    expect(ioniconToIcon('close')).toEqual({ name: 'x-mark', variant: 'outline' });
    expect(ioniconToIcon('chevron-forward')).toEqual({ name: 'chevron-right', variant: 'outline' });
    expect(ioniconToIcon('bilinmeyen')).toBeNull();
  });

  it('resolveIcon: Heroicons adı önce, açık variant çeviriyi ezer', () => {
    expect(resolveIcon('heart')).toEqual({ name: 'heart', variant: 'outline' });
    expect(resolveIcon('heart-outline', 'solid')).toEqual({ name: 'heart', variant: 'solid' });
    expect(resolveIcon('share-outline')).toEqual({ name: 'share', variant: 'outline' });
  });
});
