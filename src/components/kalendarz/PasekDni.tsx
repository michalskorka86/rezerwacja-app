import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { C, Fonts } from '@/constants/theme';
import { DNI_KROTKO, zData } from '@/logika/daty';
import { innaMarka, nazwaWLegendzie, pasekDni } from '@/logika/kalendarz';
import type { Atrakcja, Marka, Rezerwacja } from '@/logika/typy';

/** Pasek dni (.week-nav): wczoraj … +13 dni, kropka = są rezerwacje, dotknięcie = przewiń do dnia. */
export function PasekDni({ rezerwacje, dzis, onDzien }: { rezerwacje: Rezerwacja[]; dzis: string; onDzien: (ds: string) => void }) {
  const dni = useMemo(() => pasekDni(rezerwacje, dzis), [rezerwacje, dzis]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pasek} contentContainerStyle={styles.pasekTresc}>
      {dni.map((d) => {
        const data = zData(d.data);
        return (
          <Pressable key={d.data} onPress={() => onDzien(d.data)} style={({ pressed }) => [styles.pill, pressed && { backgroundColor: C.bg }]}>
            <Text style={styles.nazwa}>{DNI_KROTKO[data.getDay()]}</Text>
            <View style={[styles.num, d.dzis && styles.numDzis]}>
              <Text style={[styles.numTxt, d.dzis && styles.numDzisTxt]}>{data.getDate()}</Text>
            </View>
            <View style={[styles.kropka, !d.sa && { backgroundColor: 'transparent' }]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Legenda kolorów atrakcji (.legend) + kolor drugiej marki. */
export function Legenda({ atrakcje, marka, innyKolor }: { atrakcje: Atrakcja[]; marka: Marka; innyKolor: string }) {
  return (
    <View style={styles.legenda}>
      {atrakcje.map((a) => (
        <View key={a.id} style={styles.pozycja}>
          <View style={[styles.kolor, { backgroundColor: a.kolor }]} />
          <Text style={styles.legendaTxt}>{nazwaWLegendzie(a)}</Text>
        </View>
      ))}
      <View style={styles.pozycja}>
        <View style={[styles.kolor, { backgroundColor: innyKolor }]} />
        <Text style={styles.legendaTxt}>{innaMarka(marka)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pasek: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, flexGrow: 0 },
  pasekTresc: { gap: 4, paddingTop: 10, paddingBottom: 4, paddingHorizontal: 12 },
  pill: { alignItems: 'center', gap: 2, minWidth: 40, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 10 },
  nazwa: { fontFamily: Fonts.semibold, fontSize: 10, color: C.text3, textTransform: 'uppercase' },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numDzis: { backgroundColor: C.text },
  numTxt: { fontFamily: Fonts.medium, fontSize: 14, color: C.text },
  numDzisTxt: { color: '#fff', fontFamily: Fonts.bold },
  kropka: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.text3 },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  pozycja: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kolor: { width: 10, height: 10, borderRadius: 3 },
  legendaTxt: { fontFamily: Fonts.medium, fontSize: 10, color: C.text2 },
});
