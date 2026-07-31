import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { colors } from '@/theme';

// TANI (geçici): her tab ekranını kendi hata sınırına sarar. Çöken tab tüm
// app'i düşürmek yerine adını + hatasını gösterir → hangi tab bozuk anlaşılır.
// Kök neden bulununca bu dosya ve sarmalar geri alınacak.
export function tabDiag(name: string, Comp: React.ComponentType<any>) {
  return class TabDiagBoundary extends React.Component<any, { err: Error | null }> {
    state = { err: null as Error | null };
    static getDerivedStateFromError(err: Error) {
      return { err };
    }
    render() {
      if (this.state.err) {
        return (
          <View style={{ flex: 1, padding: 40, paddingTop: 80, backgroundColor: colors.danger[50] }}>
            <Text style={{ color: colors.danger[700], fontSize: 18, fontWeight: 'bold' }}>
              ### TAB CRASHED: {name} ###
            </Text>
            <ScrollView style={{ marginTop: 16 }}>
              <Text style={{ color: colors.danger[800], fontFamily: 'Courier', fontSize: 12 }}>
                {this.state.err?.message}
                {'\n\n'}
                {this.state.err?.stack ?? ''}
              </Text>
            </ScrollView>
          </View>
        );
      }
      return <Comp {...this.props} />;
    }
  };
}
