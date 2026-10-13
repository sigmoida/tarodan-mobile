import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  Badge,
  Button,
  Chip,
  CountBadge,
  IconButton,
  Input,
  ListRowCard,
  Pill,
  RawText,
  SectionCardAction,
  SegmentedButtons,
  Text,
  theme,
} from '@/ui';

const { maxFontScale } = theme.typography;

const maxOf = (text: string) => screen.getByText(text).props.maxFontSizeMultiplier;

describe('dinamik yazı boyutu sınırı (maxFontSizeMultiplier, rol bazlı tek kaynak)', () => {
  it('roller: gövde 1.35, başlık 1.25, kontrol 1.2', () => {
    expect(maxFontScale).toEqual({ body: 1.35, heading: 1.25, control: 1.2 });
  });

  it('Text: başlık varyantları heading, kalanı body', () => {
    render(
      <>
        <Text variant="h1">B1</Text>
        <Text variant="h3">B3</Text>
        <Text variant="displayLg">D</Text>
        <Text>Gövde</Text>
        <Text variant="caption">Not</Text>
        <Text variant="label">Etiket</Text>
      </>,
    );
    expect(maxOf('B1')).toBe(maxFontScale.heading);
    expect(maxOf('B3')).toBe(maxFontScale.heading);
    expect(maxOf('D')).toBe(maxFontScale.heading);
    expect(maxOf('Gövde')).toBe(maxFontScale.body);
    expect(maxOf('Not')).toBe(maxFontScale.body);
    expect(maxOf('Etiket')).toBe(maxFontScale.body);
  });

  it('RawText varsayılanı body; açık prop (sayı ya da null) kazanır', () => {
    render(
      <>
        <RawText>Ham</RawText>
        <RawText maxFontSizeMultiplier={2}>İki</RawText>
        <Text maxFontSizeMultiplier={0}>Sınırsız</Text>
      </>,
    );
    expect(maxOf('Ham')).toBe(maxFontScale.body);
    expect(maxOf('İki')).toBe(2);
    expect(maxOf('Sınırsız')).toBe(0);
  });

  it('iç içe metin sınır vermez (RN ebeveynden miras alır)', () => {
    render(
      <RawText maxFontSizeMultiplier={maxFontScale.control}>
        Toplam <RawText testID="inner">kalın</RawText>
      </RawText>,
    );
    expect(screen.getByTestId('inner').props.maxFontSizeMultiplier).toBeUndefined();
  });

  it('kontrol etiketleri 1.2: Button, Chip, Pill, CountBadge, Badge, SegmentedButtons, SectionCardAction', () => {
    render(
      <>
        <Button title="Kaydet" count={3} countTestID="btn-count" />
        <Chip label="Yeni" onPress={jest.fn()} />
        <Pill>Kapak</Pill>
        <CountBadge count={5} inline />
        <Badge>Aktif</Badge>
        <SegmentedButtons value="a" onValueChange={jest.fn()} options={[{ value: 'a', label: 'Bir' }]} />
        <SectionCardAction onPress={jest.fn()} label="Tümünü gör" />
      </>,
    );
    for (const label of ['Kaydet', 'Yeni', 'Kapak', '5', 'Aktif', 'Bir', 'Tümünü gör', '3']) {
      expect([label, maxOf(label)]).toEqual([label, maxFontScale.control]);
    }
  });

  it('Input/Textarea metni kontrol sınırında', () => {
    render(<Input testID="in" placeholder="Ad" />);
    expect(screen.getByTestId('in').props.maxFontSizeMultiplier).toBe(maxFontScale.control);
  });
});

describe('sabit yükseklikli kontroller: asgari yükseklik + dikey dolgu (kırpılma yok)', () => {
  const pressableStyle = (node: { props: { style: unknown } }) => {
    const style = node.props.style as ((s: { pressed: boolean }) => unknown) | unknown;
    return StyleSheet.flatten(
      (typeof style === 'function' ? style({ pressed: false }) : style) as StyleProp<ViewStyle>,
    );
  };

  it('Button sm: minHeight 32 + dikey dolgu; çağıranın sabit height\'ı korunur', () => {
    const { rerender } = render(<Button size="sm" title="A" />);
    expect(pressableStyle(screen.getByRole('button'))).toMatchObject({
      minHeight: theme.controlHeight.sm,
      paddingVertical: theme.spacing[1],
    });
    rerender(<Button size="sm" title="A" style={{ height: 28 }} />);
    const s = pressableStyle(screen.getByRole('button'));
    expect(s.height).toBe(28);
    expect(s.minHeight).toBeUndefined();
  });

  it('Chip sm: minHeight 24 + dikey dolgu', () => {
    render(<Chip testID="c" label="X" onPress={jest.fn()} />);
    expect(pressableStyle(screen.getByTestId('c'))).toMatchObject({
      minHeight: 24,
      paddingVertical: theme.spacing[0.5],
    });
  });

  it('CountBadge: asgari 18 (Pill count), sabit yükseklik yok', () => {
    render(<CountBadge count={7} inline testID="cb" />);
    const s = StyleSheet.flatten(screen.getByTestId('cb').props.style);
    expect(s.minHeight).toBe(18);
    expect(s.height).toBeUndefined();
  });

  it('SegmentedButtons: satır asgari yükseklikli', () => {
    render(
      <SegmentedButtons
        density="small"
        value="a"
        onValueChange={jest.fn()}
        options={[{ value: 'a', label: 'Bir' }]}
      />,
    );
    const row = screen
      .UNSAFE_getAllByType(View)
      .map((v) => StyleSheet.flatten(v.props.style) ?? {})
      .find((st) => st.flexDirection === 'row' && st.borderWidth === 1);
    expect(row?.minHeight).toBe(36);
    expect(row?.height).toBeUndefined();
  });
});

describe('Android basma geri bildirimi (ripple) — iOS opaklığı aynı kalır', () => {
  afterEach(() => jest.restoreAllMocks());

  // Bileşik Pressable (host View'da android_ripple native prop'a çevrilir; stil fonksiyonu burada).
  // Host düğümden yukarı çıkıp stil fonksiyonunu taşıyan bileşik Pressable'ı bulur.
  const pressable = (testID?: string) => {
    let node: ReturnType<typeof screen.getByRole> | null = testID
      ? screen.getByTestId(testID)
      : screen.getByRole('button');
    while (node && typeof node.props.style !== 'function') node = node.parent;
    return node!;
  };
  const pressedStyle = (node: { props: { style: unknown } }) =>
    StyleSheet.flatten((node.props.style as (s: { pressed: boolean }) => unknown)({ pressed: true }) as StyleProp<ViewStyle>);

  it('iOS: ripple yok, basılı opaklık var', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    render(<Button title="Kaydet" />);
    const btn = pressable();
    expect(btn.props.android_ripple).toBeUndefined();
    expect(pressedStyle(btn).opacity).toBe(0.85);
    expect(pressedStyle(btn).overflow).toBeUndefined();
  });

  it('Android: dolu düğmede açık ton ön plan dalga + köşe kırpma; basılı opaklık yok', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    render(<Button title="Kaydet" />);
    const btn = pressable();
    expect(btn.props.android_ripple).toMatchObject({ color: theme.colors.overlay.white20, foreground: true });
    expect(pressedStyle(btn)).toMatchObject({ opacity: 1, overflow: 'hidden' });
  });

  it('Android: outline/ghost düğmede koyu ton', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    render(<Button variant="outline" title="Vazgeç" />);
    expect(pressable().props.android_ripple).toMatchObject({
      color: theme.colors.overlay.black10,
    });
  });

  it('Android: zeminsiz IconButton sınırsız daire (dokunma alanı kadar), zeminli sınırlı', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const { rerender } = render(<IconButton icon="x-mark" accessibilityLabel="Kapat" size="sm" />);
    expect(pressable().props.android_ripple).toMatchObject({
      borderless: true,
      radius: theme.minTouchTarget / 2,
    });
    rerender(<IconButton icon="plus" accessibilityLabel="Ekle" variant="primary" />);
    expect(pressable().props.android_ripple).toMatchObject({
      borderless: false,
      foreground: true,
      color: theme.colors.overlay.white20,
    });
  });

  it('Android: Chip (dokunulabilir), ListRowCard ve SectionCardAction ripple alır; salt gösterim çip almaz', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    render(
      <>
        <Chip testID="chip-press" label="A" onPress={jest.fn()} />
        <Chip testID="chip-tag" label="B" />
        <ListRowCard testID="row" onPress={jest.fn()}>
          <RawText>Satır</RawText>
        </ListRowCard>
        <SectionCardAction testID="act" onPress={jest.fn()} label="Tümü" />
      </>,
    );
    expect(pressable('chip-press').props.android_ripple).toMatchObject({ foreground: true });
    expect(pressable('chip-tag').props.android_ripple).toBeUndefined();
    expect(pressable('row').props.android_ripple).toMatchObject({ foreground: true });
    expect(pressable('act').props.android_ripple).toMatchObject({ foreground: true });
  });
});
