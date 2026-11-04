import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import { FILTRY } from '@/logika/kalendarz';
import type { Filtr } from '@/logika/typy';

export type Widok = 'tydzien' | 'miesiac' | 'dzien';

/**
 * Górny pasek kalendarza (wariant „C”, uzgodniony z Michałem 04.11):
 * ☰ (menu z boku, z czerwonym licznikiem zadań) · nazwa miesiąca · filtr ▾ (licznik nowych) · 🔍;
 * pod spodem Tydzień / Miesiąc / Dzień + „Dziś”; pole szukania. Odświeżanie: pociągnięcie listy w dół.
 */
export function GornyPasek({
  tytul,
  filtr,
  ileNowych,
  ileZadan,
  widok,
  szukanieOtwarte,
  zapytanie,
  onMenu,
  onFiltr,
  onSzukaj,
  onZapytanie,
  onDzisiaj,
  onWidok,
}: {
  /** np. „Listopad 2026” */
  tytul: string;
  filtr: Filtr;
  ileNowych: number;
  ileZadan: number;
  widok: Widok;
  szukanieOtwarte: boolean;
  zapytanie: string;
  onMenu: () => void;
  /** pozycja przycisku filtra na ekranie — lista rozwija się pod nim */
  onFiltr: (p: { x: number; y: number; w: number; h: number }) => void;
  onSzukaj: () => void;
  onZapytanie: (t: string) => void;
  onDzisiaj: () => void;
  onWidok: (w: Widok) => void;
}) {
  const etykieta = FILTRY.find((f) => f.filtr === filtr)?.etykieta ?? 'Wszystkie';
  const filtrRef = useRef<View>(null);
  const otworzFiltr = () => filtrRef.current?.measureInWindow((x, y, w, h) => onFiltr({ x, y, w, h }));
  return (
    <View style={styles.pasek}>
      <View style={styles.r1}>
        <PrzyciskMenu ile={ileZadan} onPress={onMenu} />
        <Text style={styles.tytul} numberOfLines={1}>
          {tytul}
        </Text>
        <View ref={filtrRef} collapsable={false} style={{ flexShrink: 1 }}>
          <Pressable onPress={otworzFiltr} style={({ pressed }) => [styles.filtr, filtr !== 'all' && styles.filtrOn, pressed && styles.wcisniety]} accessibilityLabel={`Filtr: ${etykieta}`}>
            <Text style={[styles.filtrTxt, filtr !== 'all' && { color: '#fff' }]} numberOfLines={1}>
              {etykieta} ▾
            </Text>
          </Pressable>
          {ileNowych > 0 ? <Licznik ile={ileNowych} /> : null}
        </View>
        <Pressable
          onPress={onSzukaj}
          accessibilityLabel="Szukaj"
          hitSlop={4}
          style={({ pressed }) => [styles.ikona, szukanieOtwarte && { backgroundColor: C.text, borderColor: C.text }, pressed && styles.wcisniety]}>
          <Text style={styles.ikonaTxt}>🔍</Text>
        </Pressable>
      </View>

      <View style={styles.r2}>
        <View style={styles.zakladki}>
          {(
            [
              ['tydzien', 'Tydzień'],
              ['miesiac', 'Miesiąc'],
              ['dzien', 'Dzień'],
            ] as const
          ).map(([w, napis]) => (
            <Pressable key={w} onPress={() => onWidok(w)} style={[styles.zakladka, widok === w && styles.zakladkaOn]} accessibilityState={{ selected: widok === w }}>
              <Text style={[styles.zakladkaTxt, widok === w && { color: C.text }]}>{napis}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onDzisiaj} style={({ pressed }) => [styles.dzis, pressed && styles.wcisniety]} accessibilityLabel="Przewiń na dzisiaj">
          <Text style={styles.dzisTxt}>Dziś</Text>
        </Pressable>
      </View>

      {szukanieOtwarte ? (
        <View style={styles.szukaj}>
          <TextInput
            value={zapytanie}
            onChangeText={onZapytanie}
            placeholder="Szukaj po nazwisku lub telefonie..."
            placeholderTextColor={C.text3}
            autoFocus
            autoCorrect={false}
            style={styles.szukajInp}
            returnKeyType="search"
          />
          {zapytanie ? (
            <Pressable onPress={() => onZapytanie('')} style={styles.szukajX} hitSlop={10} accessibilityLabel="Wyczyść">
              <Text style={styles.szukajXTxt}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** ☰ — otwiera menu z boku; czerwony licznik = niewykonane zadania (także na ekranach Wynajem / Zadania). */
export function PrzyciskMenu({ ile, onPress }: { ile: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityLabel={ile > 0 ? `Menu, zadania do zrobienia: ${ile}` : 'Menu'}
      style={({ pressed }) => [styles.ikona, pressed && styles.wcisniety]}>
      <Text style={styles.menuTxt}>☰</Text>
      {ile > 0 ? <Licznik ile={ile} /> : null}
    </Pressable>
  );
}

function Licznik({ ile }: { ile: number }) {
  return (
    <View style={styles.licznik} pointerEvents="none">
      <Text style={styles.licznikTxt}>{ile > 99 ? '99+' : ile}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pasek: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 10 },
  r1: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tytul: { flex: 1, minWidth: 0, fontFamily: Fonts.bold, fontSize: 17, color: C.text, letterSpacing: -0.3 },
  filtr: { height: 40, justifyContent: 'center', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs, paddingHorizontal: 10, maxWidth: 124 },
  filtrOn: { backgroundColor: C.text, borderColor: C.text },
  filtrTxt: { fontFamily: Fonts.medium, fontSize: 13, color: C.text },
  licznik: {
    position: 'absolute',
    top: -7,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.alarm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  licznikTxt: { color: '#fff', fontFamily: Fonts.bold, fontSize: 11 },
  ikona: { width: 40, height: 40, borderRadius: Size.rs, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  ikonaTxt: { fontSize: 16 },
  menuTxt: { fontSize: 19, color: C.text, marginTop: -1 },
  r2: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zakladki: { flex: 1, flexDirection: 'row', gap: 4, backgroundColor: C.bg, borderRadius: Size.rs, padding: 3 },
  zakladka: { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' },
  zakladkaOn: { backgroundColor: C.surface, elevation: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  zakladkaTxt: { fontFamily: Fonts.medium, fontSize: 13, color: C.text2 },
  dzis: { height: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.green, backgroundColor: C.surface },
  dzisTxt: { fontFamily: Fonts.semibold, fontSize: 13, color: C.green },
  szukaj: { paddingTop: 10 },
  szukajInp: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs, paddingVertical: 9, paddingLeft: 12, paddingRight: 36, fontSize: 14, fontFamily: Fonts.regular, color: C.text },
  szukajX: { position: 'absolute', right: 6, top: 10, bottom: 0, width: 34, alignItems: 'center', justifyContent: 'center' },
  szukajXTxt: { fontSize: 15, color: C.text3 },
  wcisniety: { opacity: 0.75 },
});
