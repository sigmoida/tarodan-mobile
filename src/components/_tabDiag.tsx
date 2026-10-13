import React from 'react';
import { View, ScrollView } from 'react-native';
import { colors } from '@/theme';
import { SHOW_DIAGNOSTICS } from '@/config/diagnostics';
import { ErrorBoundary } from './ErrorBoundary';
import { RawText } from '@/ui';

// TANI (geçici): her tab ekranını kendi hata sınırına sarar. Çöken tab tüm
// app'i düşürmek yerine adını + hatasını gösterir → hangi tab bozuk anlaşılır.
// Kök neden bulununca bu dosya ve sarmalar geri alınacak.
//
// Ham teşhis YALNIZ geliştirme/staging'de (`SHOW_DIAGNOSTICS`). Production'da
// sekme yine kendi hata sınırında kalır ama çevrilmiş "tekrar dene" ekranını
// (ErrorBoundary) gösterir — kullanıcıya ve App Review'a stack trace değil.
export function tabDiag(
  name: string,
  Comp: React.ComponentType<any>,
  showDiagnostics: boolean = SHOW_DIAGNOSTICS,
) {
  if (!showDiagnostics) {
    return function TabBoundary(props: any) {
      return (
        <ErrorBoundary showDiagnostics={false}>
          <Comp {...props} />
        </ErrorBoundary>
      );
    };
  }
  return class TabDiagBoundary extends React.Component<any, { err: Error | null }> {
    state = { err: null as Error | null };
    static getDerivedStateFromError(err: Error) {
      return { err };
    }
    render() {
      if (this.state.err) {
        return (
          <View style={{ flex: 1, padding: 40, paddingTop: 80, backgroundColor: colors.danger[50] }}>
            <RawText style={{ color: colors.danger[700], fontSize: 18, fontWeight: 'bold' }}>
              ### TAB CRASHED: {name} ###
            </RawText>
            <ScrollView style={{ marginTop: 16 }}>
              <RawText style={{ color: colors.danger[800], fontFamily: 'Courier', fontSize: 12 }}>
                {this.state.err?.message}
                {'\n\n'}
                {this.state.err?.stack ?? ''}
              </RawText>
            </ScrollView>
          </View>
        );
      }
      return <Comp {...this.props} />;
    }
  };
}
