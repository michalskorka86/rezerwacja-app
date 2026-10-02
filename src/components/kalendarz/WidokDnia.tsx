import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts } from '@/constants/theme';
import { dodajDni, godziny, tytulDnia } from '@/logika/daty';
import { liniaKarty, rezerwacjeDnia } from '@/logika/kalendarz';
import type { Rezerwacja } from '@/logika/typy';

import { Arkusz } from '../ui/Arkusz';

/** Widok „Dzień” (arkusz sh-dzien): ‹ dzień › i karty rezerwacji tego dnia. */
export function WidokDnia({
  data,
  rezerwacje,
  onZmienDzien,
  onZamknij,
  onRezerwacja,
}: {
  /** null = zamknięty */
  data: string | null;
  rezerwacje: Rezerwacja[];
  onZmienDzien: (ds: string) => void;
  onZamknij: () => void;
  onRezerwacja: (r: Rezerwacja) => void;
}) {
  const lista = useMemo(() => (data ? rezerwacjeDnia(rezerwacje, data) : []), [rezerwacje, data]);
  return (
    <Arkusz widoczny={!!data} onZamknij={onZamknij} tytul={data ? tytulDnia(data) : ''} nazwa="dzien">
      {data ? (
        <>
          <View style={styles.nav}>
            <Pressable onPress={() => onZmienDzien(dodajDni(data, -1))} style={styles.navBtn} hitSlop={8} accessibilityLabel="Poprzedni dzień">
              <Text style={styles.navTxt}>‹</Text>
            </Pressable>
            <Text style={styles.tytul}>{tytulDnia(data)}</Text>
            <Pressable onPress={() => onZmienDzien(dodajDni(data, 1))} style={styles.navBtn} hitSlop={8} accessibilityLabel="Następny dzień">
              <Text style={styles.navTxt}>›</Text>
            </Pressable>
          </View>
          {lista.length === 0 ? (
            <Text style={styles.pusto}>Brak rezerwacji w tym dniu</Text>
          ) : (
            lista.map((r) => (
              <Pressable key={r.id} onPress={() => onRezerwacja(r)} style={({ pressed }) => [styles.karta, { backgroundColor: r.kolor_karty }, pressed && { opacity: 0.85 }]}>
                <Text style={styles.linia}>{liniaKarty(r)}</Text>
                <Text style={styles.czas}>⏰ {godziny(r.godzina_start, r.godzina_koniec)}</Text>
                <Text style={styles.atr}>
                  {r.atrakcja_nazwa}
                  {r.marka === 'arsenal' ? ' · ' + (r.lokalizacja === 'wolomin' ? 'Wołomin' : 'Rembertów') : ''}
                </Text>
              </Pressable>
            ))
          )}
        </>
      ) : null}
    </Arkusz>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  navBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  navTxt: { fontSize: 17, color: C.text },
  tytul: { fontFamily: Fonts.semibold, fontSize: 14, color: C.text },
  pusto: { textAlign: 'center', color: C.text3, fontSize: 12, fontFamily: Fonts.regular, paddingVertical: 32 },
  karta: { borderRadius: 12, padding: 12, marginBottom: 8 },
  linia: { fontFamily: Fonts.semibold, fontSize: 14, color: '#fff', marginBottom: 3 },
  czas: { fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  atr: { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.75)' },
});
