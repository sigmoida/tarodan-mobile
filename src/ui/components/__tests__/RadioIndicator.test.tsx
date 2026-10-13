import React from 'react';
import { StyleSheet, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { RadioIndicator, theme } from '@/ui';

const outer = (tree: ReturnType<typeof render>) =>
  StyleSheet.flatten(tree.UNSAFE_getAllByType(View)[0].props.style);

describe('RadioIndicator', () => {
  it('seçili değil: boş border\'lı tam yuvarlak halka, nokta yok', () => {
    const tree = render(<RadioIndicator checked={false} />);
    expect(outer(tree)).toMatchObject({
      width: 20,
      height: 20,
      borderRadius: 10,
      borderColor: theme.colors.gray[300],
    });
    expect(tree.UNSAFE_getAllByType(View)).toHaveLength(1);
  });

  it('seçili: tint halka + dolu nokta', () => {
    const tree = render(<RadioIndicator checked color={theme.colors.warning[500]} />);
    expect(outer(tree).borderColor).toBe(theme.colors.warning[500]);
    const dot = StyleSheet.flatten(tree.UNSAFE_getAllByType(View)[1].props.style);
    expect(dot.backgroundColor).toBe(theme.colors.warning[500]);
  });
});
