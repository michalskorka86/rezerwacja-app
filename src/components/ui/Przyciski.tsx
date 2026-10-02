import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';

type RodzajAkcji = 'zwykly' | 'mail' | 'usun' | 'zielony' | 'niebieski' | 'wyslany';

const KOLORY: Record<RodzajAkcji, { tlo: string; ramka: string; tekst: string }> = {
  zwykly: { tlo: C.bg, ramka: C.border, tekst: C.text },
  mail: { tlo: C.blueL, ramka: '#aac4f5', tekst: C.blue },
  usun: { tlo: C.redL, ramka: '#f5c0bb', tekst: C.red },
  zielony: { tlo: '#e8f5e9', ramka: '#a5d6a7', tekst: '#2e7d32' },
  niebieski: { tlo: '#e3f2fd', ramka: '#90caf9', tekst: '#1565c0' },
  wyslany: { tlo: '#e8f5e9', ramka: '#a5d6a7', tekst: '#2e7d32' },
};

/** Przycisk akcji ze szczegółów (.btn-action: mail / edit / del). */
export function PrzyciskAkcji({
  tekst,
  onPress,
  rodzaj = 'zwykly',
  wylaczony,
  trwa,
  style,
}: {
  tekst: string;
  onPress: () => void;
  rodzaj?: RodzajAkcji;
  wylaczony?: boolean;
  /** pokazuje kręciołek i blokuje przycisk (np. „Wysyłanie…”) */
  trwa?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const k = KOLORY[rodzaj];
  return (
    <Pressable
      onPress={onPress}
      disabled={wylaczony || trwa}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.akcja,
        { backgroundColor: k.tlo, borderColor: k.ramka, opacity: wylaczony ? 0.5 : pressed ? 0.75 : 1 },
        style,
      ]}>
      {trwa ? <ActivityIndicator color={k.tekst} size="small" /> : <Text style={[styles.akcjaTxt, { color: k.tekst }]}>{tekst}</Text>}
    </Pressable>
  );
}

/** Rząd przycisków akcji (.det-actions). */
export const RzadAkcji = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.rzad, style]}>{children}</View>
);

/** Duży ciemny przycisk na dole formularza (.btn-save / .fab / .btn-login). */
export function PrzyciskGlowny({
  tekst,
  onPress,
  trwa,
  wylaczony,
  ponow,
  style,
}: {
  tekst: string;
  onPress: () => void;
  trwa?: boolean;
  wylaczony?: boolean;
  /** pomarańczowy „🔄 Spróbuj ponownie” po błędzie zapisu (jak PWA) */
  ponow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={trwa || wylaczony}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.glowny,
        ponow && { backgroundColor: '#fff3e0', borderColor: '#ffb74d', borderWidth: 1.5 },
        { opacity: wylaczony ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {trwa ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.glownyTxt, ponow && { color: C.pomarancz }]}>{ponow ? '🔄 Spróbuj ponownie' : tekst}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rzad: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  akcja: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 46,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: Size.rs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  akcjaTxt: { fontFamily: Fonts.semibold, fontSize: 13, textAlign: 'center' },
  glowny: { width: '100%', minHeight: 50, backgroundColor: C.text, borderRadius: Size.rs, padding: 15, alignItems: 'center', justifyContent: 'center' },
  glownyTxt: { color: '#fff', fontFamily: Fonts.semibold, fontSize: 14 },
});
