import { StyleSheet, Text, View } from 'react-native';

import { C, Fonts } from '@/constants/theme';

/** Tymczasowa treść okien, które powstają w kolejnych etapach (Wynajem, Zadania, Ustawienia, formularz). */
export function WBudowie({ co }: { co: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.ikona}>🛠️</Text>
      <Text style={styles.tytul}>{co} — w budowie</Text>
      <Text style={styles.tekst}>Ta część aplikacji jest jeszcze robiona. Do tego czasu skorzystaj z panelu w przeglądarce (PWA).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  ikona: { fontSize: 40 },
  tytul: { fontFamily: Fonts.semibold, fontSize: 16, color: C.text },
  tekst: { fontFamily: Fonts.regular, fontSize: 13, color: C.text2, textAlign: 'center', lineHeight: 19, maxWidth: 320 },
});
