import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { FlatList, StyleSheet, Text, View, type ListRenderItem } from 'react-native';

import { C, cien, Fonts } from '@/constants/theme';
import { DNI_KROTKO, MIESIACE_KROTKO, zData } from '@/logika/daty';
import type { DzienHarmonogramu } from '@/logika/kalendarz';
import { czySwieto } from '@/logika/swieta';
import type { Rezerwacja } from '@/logika/typy';

import { KartaRezerwacji } from './KartaRezerwacji';

export type HarmonogramRef = { przewinDo: (ds: string, animacja?: boolean) => boolean };

/**
 * Widok „Tydzień” (.schedule): dzień po dniu — kolumna z datą (dziś w czarnym kółku, święta na czerwono)
 * i karty rezerwacji; puste dni „Brak rezerwacji”. Między dniami szary pas jak w PWA.
 */
export const Harmonogram = forwardRef<HarmonogramRef, {
  dni: DzienHarmonogramu[];
  dzis: string;
  nazwyDodatkow: Record<string, string>;
  onRezerwacja: (r: Rezerwacja) => void;
  naglowek?: React.ReactElement | null;
  pustyTekst?: string;
}>(function Harmonogram({ dni, dzis, nazwyDodatkow, onRezerwacja, naglowek, pustyTekst }, ref) {
  const lista = useRef<FlatList<DzienHarmonogramu>>(null);

  useImperativeHandle(
    ref,
    () => ({
      przewinDo: (ds, animacja = true) => {
        const i = dni.findIndex((d) => d.data === ds);
        if (i < 0) return false;
        lista.current?.scrollToIndex({ index: i, viewPosition: 0.4, animated: animacja });
        return true;
      },
    }),
    [dni],
  );

  const renderItem: ListRenderItem<DzienHarmonogramu> = useCallback(
    ({ item }) => <Wiersz dzien={item} dzis={dzis} nazwy={nazwyDodatkow} onRezerwacja={onRezerwacja} />,
    [dzis, nazwyDodatkow, onRezerwacja],
  );

  return (
    <FlatList
      ref={lista}
      data={dni}
      keyExtractor={(d) => d.data}
      renderItem={renderItem}
      ItemSeparatorComponent={Przerwa}
      ListHeaderComponent={naglowek}
      ListEmptyComponent={<Text style={styles.pusto}>{pustyTekst ?? 'Brak rezerwacji'}</Text>}
      contentContainerStyle={styles.lista}
      initialNumToRender={20}
      windowSize={11}
      onScrollToIndexFailed={(info) => {
        // wiersze mają różną wysokość — najpierw w przybliżone miejsce, potem dokładnie
        lista.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
        setTimeout(() => lista.current?.scrollToIndex({ index: info.index, viewPosition: 0.4, animated: false }), 120);
      }}
    />
  );
});

const Przerwa = () => <View style={styles.przerwa} />;

function Wiersz({
  dzien,
  dzis,
  nazwy,
  onRezerwacja,
}: {
  dzien: DzienHarmonogramu;
  dzis: string;
  nazwy: Record<string, string>;
  onRezerwacja: (r: Rezerwacja) => void;
}) {
  const d = zData(dzien.data);
  const jestDzis = dzien.data === dzis;
  const swieto = czySwieto(dzien.data);
  const kolor = swieto ? C.alarm : undefined;
  return (
    <View style={styles.wiersz}>
      <View style={[styles.data, swieto && { backgroundColor: C.swieto }]}>
        <Text style={[styles.dzienTyg, kolor && { color: kolor }]}>{DNI_KROTKO[d.getDay()]}</Text>
        <View style={[styles.num, jestDzis && styles.numDzis]}>
          <Text style={[styles.numTxt, kolor && { color: kolor }, jestDzis && { color: '#fff' }]}>{d.getDate()}</Text>
        </View>
        <Text style={[styles.mies, kolor && { color: kolor }]}>{MIESIACE_KROTKO[d.getMonth()]}</Text>
      </View>
      <View style={styles.karty}>
        {dzien.rezerwacje.length === 0 ? (
          <Text style={styles.pustyDzien}>Brak rezerwacji</Text>
        ) : (
          dzien.rezerwacje.map((r) => <KartaRezerwacji key={r.id} r={r} nazwy={nazwy} onPress={onRezerwacja} />)
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { paddingTop: 8, paddingHorizontal: 8, paddingBottom: 110 },
  przerwa: { height: 12, backgroundColor: C.border, marginHorizontal: -8, marginVertical: 6 },
  wiersz: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 8, overflow: 'hidden', ...cien(1) },
  data: { width: 54, alignItems: 'center', paddingVertical: 20, borderRightWidth: 1, borderRightColor: C.border, backgroundColor: C.surface },
  dzienTyg: { fontFamily: Fonts.bold, fontSize: 10, color: C.text3, textTransform: 'uppercase', marginBottom: 2 },
  num: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numDzis: { backgroundColor: C.text },
  numTxt: { fontFamily: Fonts.semibold, fontSize: 17, color: C.text },
  mies: { fontFamily: Fonts.regular, fontSize: 9, color: C.text3, marginTop: 2, textTransform: 'uppercase' },
  karty: { flex: 1, paddingVertical: 18, paddingHorizontal: 8, gap: 5 },
  pustyDzien: { alignSelf: 'center', color: C.text3, fontSize: 12, fontFamily: Fonts.regular, paddingVertical: 16 },
  pusto: { textAlign: 'center', color: C.text3, fontSize: 14, fontFamily: Fonts.regular, paddingVertical: 40 },
});
