import { useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import { FILTRY } from '@/logika/kalendarz';
import type { Filtr } from '@/logika/typy';

export type Widok = 'tydzien' | 'miesiac' | 'dzien';

/**
 * Górny pasek jak .topbar w kalendarz.php: logo marki, filtr ▾ (z czerwonym licznikiem nowych), 🔍, 📅, 🔄, 📄 (Arsenał),
 * 👤 imię; pod spodem 📦 Wynajem / 📋 Zadania; zakładki Tydzień / Miesiąc / Dzień; pole szukania.
 */
export function GornyPasek({
  logo,
  imie,
  arsenal,
  filtr,
  ileNowych,
  ileZadan,
  widok,
  szukanieOtwarte,
  zapytanie,
  odswiezam,
  onFiltr,
  onSzukaj,
  onZapytanie,
  onDzisiaj,
  onOdswiez,
  onRozpiski,
  onKonto,
  onWynajem,
  onZadania,
  onWidok,
}: {
  logo: string | null;
  imie: string;
  arsenal: boolean;
  filtr: Filtr;
  ileNowych: number;
  ileZadan: number;
  widok: Widok;
  szukanieOtwarte: boolean;
  zapytanie: string;
  odswiezam: boolean;
  /** pozycja przycisku filtra na ekranie — lista rozwija się pod nim */
  onFiltr: (p: { x: number; y: number; w: number; h: number }) => void;
  onSzukaj: () => void;
  onZapytanie: (t: string) => void;
  onDzisiaj: () => void;
  onOdswiez: () => void;
  onRozpiski: () => void;
  onKonto: () => void;
  onWynajem: () => void;
  onZadania: () => void;
  onWidok: (w: Widok) => void;
}) {
  const etykieta = FILTRY.find((f) => f.filtr === filtr)?.etykieta ?? 'Wszystkie';
  const filtrRef = useRef<View>(null);
  const otworzFiltr = () => filtrRef.current?.measureInWindow((x, y, w, h) => onFiltr({ x, y, w, h }));
  return (
    <View style={styles.pasek}>
      <View style={styles.r1}>
        <View style={styles.logoWrap}>
          {logo ? <Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo" /> : null}
        </View>
        <View style={styles.prawa}>
          <View ref={filtrRef} collapsable={false} style={{ flexShrink: 1 }}>
            <Pressable onPress={otworzFiltr} style={({ pressed }) => [styles.filtr, filtr !== 'all' && styles.filtrOn, pressed && styles.wcisniety]} accessibilityLabel={`Filtr: ${etykieta}`}>
              <Text style={[styles.filtrTxt, filtr !== 'all' && { color: '#fff' }]} numberOfLines={1}>
                {etykieta} ▾
              </Text>
            </Pressable>
            {ileNowych > 0 ? (
              <View style={styles.licznikNowych} pointerEvents="none">
                <Text style={styles.licznikTxt}>{ileNowych}</Text>
              </View>
            ) : null}
          </View>
          <Ikona znak="🔍" opis="Szukaj" aktywna={szukanieOtwarte} onPress={onSzukaj} />
          <Ikona znak="📅" opis="Dzisiaj" onPress={onDzisiaj} />
          <Ikona znak={odswiezam ? '⏳' : '🔄'} opis="Odśwież" onPress={onOdswiez} />
          {arsenal ? <Ikona znak="📄" opis="Rozpiski" onPress={onRozpiski} /> : null}
          <Pressable onPress={onKonto} style={({ pressed }) => [styles.chip, pressed && styles.wcisniety]} accessibilityLabel="Konto i wylogowanie">
            <Text style={styles.chipTxt}>👤</Text>
            <Text style={styles.chipTxt} numberOfLines={1}>
              {imie}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.r2}>
        <Pressable onPress={onWynajem} style={({ pressed }) => [styles.duzy, pressed && styles.wcisniety]}>
          <Text style={styles.duzyTxt}>📦 Wynajem</Text>
        </Pressable>
        <Pressable onPress={onZadania} style={({ pressed }) => [styles.duzy, ileZadan > 0 && { borderColor: C.alarm }, pressed && styles.wcisniety]}>
          <Text style={styles.duzyTxt}>📋 Zadania</Text>
          {ileZadan > 0 ? (
            <View style={styles.licznikZadan} pointerEvents="none">
              <Text style={styles.licznikTxt}>{ileZadan}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

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

function Ikona({ znak, opis, onPress, aktywna }: { znak: string; opis: string; onPress: () => void; aktywna?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={opis}
      hitSlop={4}
      style={({ pressed }) => [styles.ikona, aktywna && { backgroundColor: C.text, borderColor: C.text }, pressed && styles.wcisniety]}>
      <Text style={styles.ikonaTxt}>{znak}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pasek: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 8 },
  r1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 6 },
  logoWrap: { flex: 1, minWidth: 0, maxWidth: 90 },
  logo: { height: 28, width: '100%' },
  prawa: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  filtr: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs, paddingVertical: 5, paddingHorizontal: 10, maxWidth: 104, flexShrink: 1 },
  filtrOn: { backgroundColor: C.text, borderColor: C.text },
  filtrTxt: { fontFamily: Fonts.medium, fontSize: 12, color: C.text },
  licznikNowych: {
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
  ikona: { width: 34, height: 34, borderRadius: Size.rs, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  ikonaTxt: { fontSize: 15 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs, paddingVertical: 5, paddingHorizontal: 9, flexShrink: 0 },
  chipTxt: { fontFamily: Fonts.semibold, fontSize: 12, color: C.text },
  r2: { flexDirection: 'row', gap: 8, marginBottom: 8, marginHorizontal: -2 },
  duzy: { flex: 1, paddingVertical: 9, paddingHorizontal: 8, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  duzyTxt: { fontFamily: Fonts.semibold, fontSize: 13, color: C.text },
  licznikZadan: { position: 'absolute', top: -7, right: -7, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.alarm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  zakladki: { flexDirection: 'row', gap: 4, backgroundColor: C.bg, borderRadius: Size.rs, padding: 3 },
  zakladka: { flex: 1, paddingVertical: 5, borderRadius: 7, alignItems: 'center' },
  zakladkaOn: { backgroundColor: C.surface, elevation: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  zakladkaTxt: { fontFamily: Fonts.medium, fontSize: 12, color: C.text2 },
  szukaj: { paddingTop: 8, paddingBottom: 2 },
  szukajInp: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs, paddingVertical: 9, paddingLeft: 12, paddingRight: 36, fontSize: 14, fontFamily: Fonts.regular, color: C.text },
  szukajX: { position: 'absolute', right: 6, top: 8, bottom: 2, width: 34, alignItems: 'center', justifyContent: 'center' },
  szukajXTxt: { fontSize: 15, color: C.text3 },
  wcisniety: { opacity: 0.75 },
});
