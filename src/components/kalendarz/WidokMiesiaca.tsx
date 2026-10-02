import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { C, Fonts } from '@/constants/theme';
import { DNI_TYGODNIA, MIESIACE, miesiac, siatkaMiesiaca, zData } from '@/logika/daty';
import { wpisMiesiaca } from '@/logika/kalendarz';
import { czySwieto } from '@/logika/swieta';
import type { Rezerwacja } from '@/logika/typy';

/**
 * Widok „Miesiąc” (.gcal) jak Kalendarz Google: siatka od poniedziałku, w dniu do 3 rezerwacji + „+N więcej”.
 * Dotknięcie rezerwacji — szczegóły; dotknięcie dnia — widok dnia.
 */
export function WidokMiesiaca({
  pierwszy,
  rezerwacje,
  dzis,
  onZmienMiesiac,
  onDzien,
  onRezerwacja,
}: {
  /** RRRR-MM-01 */
  pierwszy: string;
  rezerwacje: Rezerwacja[];
  dzis: string;
  onZmienMiesiac: (pierwszy: string) => void;
  onDzien: (ds: string) => void;
  onRezerwacja: (r: Rezerwacja) => void;
}) {
  const tygodnie = useMemo(() => siatkaMiesiaca(pierwszy), [pierwszy]);
  const poDniach = useMemo(() => {
    const m = new Map<string, Rezerwacja[]>();
    for (const r of rezerwacje) {
      const l = m.get(r.data_rezerwacji);
      if (l) l.push(r);
      else m.set(r.data_rezerwacji, [r]);
    }
    return m;
  }, [rezerwacje]);
  const d = zData(pierwszy);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={styles.nav}>
        <Pressable onPress={() => onZmienMiesiac(miesiac(pierwszy, -1))} style={styles.navBtn} hitSlop={10} accessibilityLabel="Poprzedni miesiąc">
          <Text style={styles.navTxt}>‹</Text>
        </Pressable>
        <Text style={styles.tytul}>
          {MIESIACE[d.getMonth()]} {d.getFullYear()}
        </Text>
        <Pressable onPress={() => onZmienMiesiac(miesiac(pierwszy, 1))} style={styles.navBtn} hitSlop={10} accessibilityLabel="Następny miesiąc">
          <Text style={styles.navTxt}>›</Text>
        </Pressable>
      </View>
      <View style={styles.wiersz}>
        {DNI_TYGODNIA.map((n, i) => (
          <Text key={n} style={[styles.th, i === 6 && { borderRightWidth: 0 }]}>
            {n}
          </Text>
        ))}
      </View>
      {tygodnie.map((tydzien, ti) => (
        <View key={ti} style={styles.wiersz}>
          {tydzien.map((ds, i) => {
            if (!ds) return <View key={i} style={[styles.td, styles.inny, i === 6 && { borderRightWidth: 0 }]} />;
            const dnia = (poDniach.get(ds) ?? []).slice().sort((a, b) => a.godzina_start.localeCompare(b.godzina_start));
            const jestDzis = ds === dzis;
            const swieto = czySwieto(ds);
            return (
              <Pressable
                key={ds}
                onPress={() => onDzien(ds)}
                style={({ pressed }) => [styles.td, swieto && { backgroundColor: C.swieto }, pressed && { backgroundColor: C.border }, i === 6 && { borderRightWidth: 0 }]}>
                <View style={[styles.num, jestDzis && { backgroundColor: C.text }]}>
                  <Text style={[styles.numTxt, ds < dzis && { color: C.text3 }, swieto && !jestDzis && { color: C.alarm }, jestDzis && styles.numDzis]}>
                    {zData(ds).getDate()}
                  </Text>
                </View>
                {dnia.slice(0, 3).map((r) => (
                  <Pressable key={r.id} onPress={() => onRezerwacja(r)} style={[styles.ev, { backgroundColor: r.kolor_karty }]}>
                    <Text style={styles.evTxt} numberOfLines={1}>
                      {wpisMiesiaca(r)}
                    </Text>
                  </Pressable>
                ))}
                {dnia.length > 3 ? <Text style={styles.wiecej}>+{dnia.length - 3} więcej</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingHorizontal: 8, paddingBottom: 4 },
  navBtn: { paddingHorizontal: 12 },
  navTxt: { fontSize: 28, color: C.text2, lineHeight: 32 },
  tytul: { flex: 1, textAlign: 'center', fontFamily: Fonts.bold, fontSize: 15, color: C.text },
  wiersz: { flexDirection: 'row' },
  th: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.semibold,
    fontSize: 10,
    color: C.text3,
    textTransform: 'uppercase',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
  },
  td: { flex: 1, minHeight: 72, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingTop: 1, paddingHorizontal: 1, paddingBottom: 2, overflow: 'hidden' },
  inny: { backgroundColor: C.surface },
  num: { width: 18, height: 18, borderRadius: 9, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  numTxt: { fontFamily: Fonts.regular, fontSize: 11, color: C.text },
  numDzis: { color: '#fff', fontFamily: Fonts.bold },
  ev: { borderRadius: 2, paddingVertical: 1, paddingHorizontal: 2, margin: 1 },
  evTxt: { fontFamily: Fonts.semibold, fontSize: 9, color: '#fff', lineHeight: 13 },
  wiecej: { fontFamily: Fonts.semibold, fontSize: 9, color: C.text3, paddingHorizontal: 2, lineHeight: 13 },
});
