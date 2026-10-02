import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';

/** Sekcja formularza (.form-section + .section-title): nagłówek wielkimi literami z kreską pod spodem. */
export function Sekcja({ tytul, dopisek, children }: { tytul: string; dopisek?: string; children: ReactNode }) {
  return (
    <View style={styles.sekcja}>
      <View style={styles.naglowek}>
        <Text style={styles.tytul}>{tytul.toUpperCase()}</Text>
        {dopisek ? <Text style={styles.dopisek}>{dopisek}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Etykieta pola (.lbl) */
export const Etykieta = ({ tekst }: { tekst: string }) => <Text style={styles.lbl}>{tekst.toUpperCase()}</Text>;

/** Pole z etykietą (.field + .lbl + .finp). Klawiatura systemowa — tylko tekst, telefon, e-mail. */
export function Pole({ etykieta, bledne, style, ...props }: TextInputProps & { etykieta?: string; bledne?: boolean }) {
  return (
    <View style={styles.pole}>
      {etykieta ? <Etykieta tekst={etykieta} /> : null}
      <TextInput placeholderTextColor={C.text3} {...props} style={[styles.inp, props.multiline && styles.obszar, bledne && styles.blad, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  sekcja: { gap: 14, marginBottom: 18 },
  naglowek: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  tytul: { fontFamily: Fonts.bold, fontSize: 13, color: C.text2, letterSpacing: 0.5 },
  dopisek: { fontFamily: Fonts.regular, fontSize: 11, color: C.text3, flexShrink: 1 },
  pole: { gap: 5 },
  lbl: { fontFamily: Fonts.semibold, fontSize: 11, color: C.text2, letterSpacing: 0.4 },
  inp: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs, paddingVertical: 12, paddingHorizontal: 13, fontSize: 15, fontFamily: Fonts.regular, color: C.text, minHeight: 46 },
  obszar: { minHeight: 76, textAlignVertical: 'top' },
  blad: { borderColor: C.red, backgroundColor: '#fff8f8' },
});
