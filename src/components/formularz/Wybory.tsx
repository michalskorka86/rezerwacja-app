import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import { dzisStr, DNI_TYGODNIA, MIESIACE, miesiac, siatkaMiesiaca, zData } from '@/logika/daty';
import { godzinyDoWyboru } from '@/logika/formularz';
import { czySwieto } from '@/logika/swieta';
import type { Dodatek } from '@/logika/typy';

import { Arkusz } from '../ui/Arkusz';

/** „Wybierz datę” (arkusz sh-date): ‹ miesiąc ›, siatka od poniedziałku, wybrany dzień czarny. */
export function WyborDaty({
  widoczny,
  wybrana,
  onWybierz,
  onZamknij,
}: {
  widoczny: boolean;
  wybrana: string | null;
  onWybierz: (ds: string) => void;
  onZamknij: () => void;
}) {
  const [pierwszy, setPierwszy] = useState(miesiac(wybrana ?? dzisStr()));
  const [poprzednioWybrana, setPoprzednioWybrana] = useState(wybrana);
  // nowa wybrana data z zewnątrz (np. inna rezerwacja) → pokaż jej miesiąc
  if (wybrana !== poprzednioWybrana) {
    setPoprzednioWybrana(wybrana);
    if (wybrana) setPierwszy(miesiac(wybrana));
  }
  const d = zData(pierwszy);
  const dzis = dzisStr();
  return (
    <Arkusz widoczny={widoczny} onZamknij={onZamknij} tytul="Wybierz datę" nazwa="wybor-daty">
      <View style={styles.nav}>
        <Pressable onPress={() => setPierwszy(miesiac(pierwszy, -1))} style={styles.navBtn} hitSlop={8} accessibilityLabel="Poprzedni miesiąc">
          <Text style={styles.navTxt}>‹</Text>
        </Pressable>
        <Text style={styles.tytul}>
          {MIESIACE[d.getMonth()]} {d.getFullYear()}
        </Text>
        <Pressable onPress={() => setPierwszy(miesiac(pierwszy, 1))} style={styles.navBtn} hitSlop={8} accessibilityLabel="Następny miesiąc">
          <Text style={styles.navTxt}>›</Text>
        </Pressable>
      </View>
      <View style={styles.wiersz}>
        {DNI_TYGODNIA.map((n) => (
          <Text key={n} style={styles.hdr}>
            {n}
          </Text>
        ))}
      </View>
      {siatkaMiesiaca(pierwszy).map((tydzien, i) => (
        <View key={i} style={styles.wiersz}>
          {tydzien.map((ds, j) =>
            ds ? (
              <Pressable
                key={ds}
                onPress={() => onWybierz(ds)}
                style={({ pressed }) => [styles.dzien, ds === wybrana && styles.dzienWybrany, pressed && { opacity: 0.7 }]}
                accessibilityLabel={ds}>
                <Text
                  style={[
                    styles.dzienTxt,
                    czySwieto(ds) && { color: C.alarm },
                    ds === dzis && { fontFamily: Fonts.bold, textDecorationLine: 'underline' },
                    ds === wybrana && { color: '#fff', fontFamily: Fonts.semibold },
                  ]}>
                  {zData(ds).getDate()}
                </Text>
              </Pressable>
            ) : (
              <View key={j} style={styles.puste} />
            ),
          )}
        </View>
      ))}
    </Arkusz>
  );
}

/** „Godzina rozpoczęcia / zakończenia” (arkusz sh-time): siatka 4 kolumny, 7:00–22:30 co pół godziny. */
export function WyborGodziny({
  cel,
  wybrana,
  onWybierz,
  onWyczysc,
  onZamknij,
}: {
  /** null = zamknięty */
  cel: 'od' | 'do' | null;
  wybrana: string | null;
  onWybierz: (g: string) => void;
  /** tylko „do”: bez godziny końca */
  onWyczysc?: () => void;
  onZamknij: () => void;
}) {
  return (
    <Arkusz widoczny={!!cel} onZamknij={onZamknij} tytul={cel === 'do' ? 'Godzina zakończenia' : 'Godzina rozpoczęcia'} nazwa="wybor-godziny">
      <View style={styles.godziny}>
        {godzinyDoWyboru().map((g) => (
          <Pressable key={g} onPress={() => onWybierz(g)} style={({ pressed }) => [styles.godzina, g === wybrana && styles.godzinaWybrana, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.godzinaTxt, g === wybrana && { color: '#fff' }]}>{g}</Text>
          </Pressable>
        ))}
      </View>
      {cel === 'do' && onWyczysc ? (
        <Pressable onPress={onWyczysc} style={({ pressed }) => [styles.bezKonca, pressed && { opacity: 0.7 }]}>
          <Text style={styles.bezKoncaTxt}>Bez godziny zakończenia</Text>
        </Pressable>
      ) : null}
    </Arkusz>
  );
}

/** „Dodatki” (arkusz sh-extras): lista z ceną, ✓ = wybrany, przycisk „Gotowe”. */
export function WyborDodatkow({
  widoczny,
  dodatki,
  wybrane,
  onPrzelacz,
  onZamknij,
}: {
  widoczny: boolean;
  dodatki: Dodatek[];
  wybrane: number[];
  onPrzelacz: (id: number) => void;
  onZamknij: () => void;
}) {
  return (
    <Arkusz widoczny={widoczny} onZamknij={onZamknij} tytul="Dodatki" zamknijTekst="Gotowe" nazwa="wybor-dodatkow">
      <View style={{ gap: 2 }}>
        {dodatki.map((d) => {
          const on = wybrane.includes(d.id);
          return (
            <Pressable
              key={d.id}
              onPress={() => onPrzelacz(d.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [styles.chk, pressed && { backgroundColor: C.bg }]}>
              <View style={[styles.chkBox, on && styles.chkBoxOn]}>{on ? <Text style={styles.chkZnak}>✓</Text> : null}</View>
              <Text style={styles.chkLbl}>{d.nazwa}</Text>
              <Text style={styles.chkCena}>{d.opis_ceny}</Text>
            </Pressable>
          );
        })}
      </View>
    </Arkusz>
  );
}

/** „Wybierz lokalizację” (arkusz sh-loc) — Arsenał przed nową rezerwacją. */
export function WyborLokalizacji({ widoczny, onWybierz, onZamknij }: { widoczny: boolean; onWybierz: (l: 'rembert' | 'wolomin') => void; onZamknij: () => void }) {
  return (
    <Arkusz widoczny={widoczny} onZamknij={onZamknij} tytul="Wybierz lokalizację" nazwa="wybor-lokalizacji">
      {(
        [
          ['rembert', 'Rembertów', 'Arsenał Paintball · Warszawa'],
          ['wolomin', 'Wołomin', 'Arsenał Paintball · Wołomin'],
        ] as const
      ).map(([lok, nazwa, pod]) => (
        <Pressable key={lok} onPress={() => onWybierz(lok)} style={({ pressed }) => [styles.lok, pressed && { backgroundColor: C.bg }]}>
          <View style={styles.lokIkona}>
            <Text style={{ fontSize: 20 }}>📍</Text>
          </View>
          <View>
            <Text style={styles.lokNazwa}>{nazwa}</Text>
            <Text style={styles.lokPod}>{pod}</Text>
          </View>
        </Pressable>
      ))}
    </Arkusz>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { width: 40, height: 40, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  navTxt: { fontSize: 18, color: C.text },
  tytul: { fontFamily: Fonts.semibold, fontSize: 15, color: C.text },
  wiersz: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  hdr: { flex: 1, textAlign: 'center', fontFamily: Fonts.semibold, fontSize: 10, color: C.text3, paddingVertical: 3 },
  dzien: { flex: 1, aspectRatio: 1, borderRadius: 7, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  dzienWybrany: { backgroundColor: C.text },
  dzienTxt: { fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  puste: { flex: 1, aspectRatio: 1 },
  godziny: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingVertical: 3 },
  godzina: { flexGrow: 1, flexBasis: '22%', paddingVertical: 13, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center' },
  godzinaWybrana: { backgroundColor: C.text, borderColor: C.text },
  godzinaTxt: { fontFamily: Fonts.medium, fontSize: 14, color: C.text },
  bezKonca: { marginTop: 12, paddingVertical: 13, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center' },
  bezKoncaTxt: { fontFamily: Fonts.medium, fontSize: 14, color: C.text2 },
  chk: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, paddingHorizontal: 13, borderRadius: Size.rs },
  chkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  chkBoxOn: { backgroundColor: C.text, borderColor: C.text },
  chkZnak: { color: '#fff', fontSize: 12, fontFamily: Fonts.bold },
  chkLbl: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  chkCena: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2 },
  lok: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: Size.radius, borderWidth: 2, borderColor: C.border, backgroundColor: C.surface, marginBottom: 10 },
  lokIkona: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  lokNazwa: { fontFamily: Fonts.semibold, fontSize: 15, color: C.text },
  lokPod: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2, marginTop: 1 },
});
