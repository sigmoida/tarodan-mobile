import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/ui';

/** Ana sayfa arama kutusu — AppShell'in arama satırı (web Header araması). */
export function HomeSearch({
  value,
  onChange,
  onSearch,
}: {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Input
      placeholder={t('nav.searchPlaceholder')}
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSearch}
      returnKeyType="search"
      leftIconName="magnifying-glass"
      testID="home-search-input"
    />
  );
}
