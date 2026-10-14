import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Avatar, avatarPlaceholderColors, theme } from '@/ui';

const json = () => JSON.stringify(screen.toJSON());

describe('Avatar yer tutucu (tek renk kaynağı)', () => {
  it('marka tonu: primary-100 zemin + primary-700 baş harf', () => {
    expect(avatarPlaceholderColors).toEqual({
      background: theme.colors.primary[100],
      foreground: theme.colors.primary[700],
    });
    render(<Avatar name="Ayşe Yılmaz" size="xl" />);
    expect(json()).toContain(`"backgroundColor":"${avatarPlaceholderColors.background}"`);
    expect(StyleSheet.flatten(screen.getByText('AY').props.style).color).toBe(avatarPlaceholderColors.foreground);
  });

  it('ikon yer tutucusu (misafir) aynı zemin rengi, baş harf yok', () => {
    render(<Avatar placeholder="icon" size="2xl" />);
    expect(json()).toContain(`"backgroundColor":"${avatarPlaceholderColors.background}"`);
    expect(screen.queryByText('?')).toBeNull();
  });

  it("boş kaynak string'i baş harfe düşer", () => {
    render(<Avatar name="Mehmet" source="  " />);
    expect(screen.getByText('M')).toBeTruthy();
  });
});
