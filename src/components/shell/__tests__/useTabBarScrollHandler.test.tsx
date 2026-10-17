import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  TabBarCollapseProvider,
  useTabBarCollapsed,
  useTabBarPageScroll,
  useTabBarScrollHandler,
} from '../TabBarCollapse';

function setup() {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TabBarCollapseProvider>{children}</TabBarCollapseProvider>
  );
  return renderHook(() => ({ collapsed: useTabBarCollapsed(), scroll: useTabBarScrollHandler() }), { wrapper });
}

const layout = (height: number) => ({ nativeEvent: { layout: { height } } }) as never;

describe('useTabBarScrollHandler — kaydırma olayı gelmeyen ölçüm değişimleri', () => {
  it('kısa içerik ölçülünce (öğe silinip liste ekrana sığınca) daralmış menü açılır', () => {
    const { result } = setup();
    act(() => {
      result.current.scroll.onLayout(layout(800));
      result.current.collapsed.value = true;
      result.current.scroll.onContentSizeChange(0, 790);
    });
    expect(result.current.collapsed.value).toBe(false);
  });

  it('yeni (başta duran) ScrollView ilk ölçümde uzun içerikte de menüyü açar (Profil üye -> misafir)', () => {
    const { result } = setup();
    act(() => {
      result.current.collapsed.value = true;
      result.current.scroll.onContentSizeChange(0, 5000);
    });
    expect(result.current.collapsed.value).toBe(false);
  });

  it('menü zaten açıkken ölçüm değişimi bir şey yapmaz', () => {
    const { result } = setup();
    act(() => {
      result.current.scroll.onContentSizeChange(0, 5000);
      result.current.scroll.onLayout(layout(800));
    });
    expect(result.current.collapsed.value).toBe(false);
  });
});

describe('useTabBarPageScroll — menülü yığın ekranının tek liste sinyali', () => {
  it('listProps: alt menü handler\'ı (onScroll + ölçüm geri çağrıları) + kenar sinyali + üst inset', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TabBarCollapseProvider>{children}</TabBarCollapseProvider>
    );
    const { result } = renderHook(() => ({ collapsed: useTabBarCollapsed(), page: useTabBarPageScroll() }), { wrapper });
    const { page } = result.current;
    expect(page.listProps.onScroll).toBe(page.onScroll);
    expect(page.listProps.scrollEventThrottle).toBe(16);
    expect(page.listProps.progressViewOffset).toBe(page.topInset);
    expect(page.scrollY.value).toBe(0);
    // Ölçüm geri çağrıları aynı sağlayıcının menüsünü sürer (kısa içerik -> açık).
    act(() => {
      result.current.collapsed.value = true;
      page.listProps.onLayout?.(layout(800));
      page.listProps.onContentSizeChange?.(0, 790);
    });
    expect(result.current.collapsed.value).toBe(false);
  });
});
