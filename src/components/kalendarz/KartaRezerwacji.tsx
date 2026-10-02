import { memo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts } from '@/constants/theme';
import { godziny } from '@/logika/daty';
import { emojiDodatkow, etykietaMarki, liniaKarty, liniaMiniKarty, nazwyDodatkow } from '@/logika/kalendarz';
import type { Rezerwacja } from '@/logika/typy';

/**
 * Karta rezerwacji w kalendarzu (.rcard): kolor atrakcji, „P12 os · Imię · telefon”, ⏰ godziny, atrakcja + emoji dodatków,
 * ▼ rozwija odznaki i uwagi; nowa z www — czerwona ramka i NEW. Cudza marka — mała karta (.rcard-mini).
 */
export const KartaRezerwacji = memo(function KartaRezerwacji({
  r,
  nazwy,
  onPress,
}: {
  r: Rezerwacja;
  nazwy: Record<string, string>;
  onPress: (r: Rezerwacja) => void;
}) {
  const [rozwinieta, setRozwinieta] = useState(false);

  if (!r.wlasna) {
    return (
      <Pressable onPress={() => onPress(r)} style={({ pressed }) => [styles.mini, { backgroundColor: r.kolor_karty }, pressed && styles.wcisnieta]}>
        <Text style={styles.miniTxt}>{liniaMiniKarty(r)}</Text>
        <Text style={styles.miniPod}>
          {godziny(r.godzina_start, r.godzina_koniec)} · {etykietaMarki(r)}
        </Text>
      </Pressable>
    );
  }

  const nowa = r.nowa && !r.mail_zadatek_wyslany;
  const dodatki = emojiDodatkow(nazwyDodatkow(r.dodatki, nazwy));
  const odznaki: string[] = [];
  if (r.zadatek_status === 'oplacony') odznaki.push('✓ Zadatek');
  if (r.status === 'potwierdzona') odznaki.push('✓ Potw.');
  if (r.nowa) odznaki.push('🌐 WWW');
  const maDodatkowe = odznaki.length > 0 || !!dodatki || !!r.uwagi;

  return (
    <Pressable
      onPress={() => onPress(r)}
      style={({ pressed }) => [styles.karta, { backgroundColor: r.kolor_karty }, nowa && styles.nowa, pressed && styles.wcisnieta]}>
      {nowa ? (
        <View style={styles.new} pointerEvents="none">
          <Text style={styles.newTxt}>NEW</Text>
        </View>
      ) : null}
      <Text style={[styles.linia, r.marka === 'arsenal' && { paddingRight: 84 }]}>
        {liniaKarty(r)}
        {r.klient_telefon ? (
          <Text>
            {' · '}
            <Text onPress={() => Linking.openURL('tel:' + r.klient_telefon.replace(/\s/g, ''))} suppressHighlighting>
              {r.klient_telefon}
            </Text>
          </Text>
        ) : null}
      </Text>
      <Text style={styles.czas}>⏰ {godziny(r.godzina_start, r.godzina_koniec)}</Text>
      <View style={styles.dol}>
        <Text style={styles.atrakcja}>
          {r.atrakcja_nazwa}
          {dodatki ? '  ' + dodatki : ''}
        </Text>
        {maDodatkowe ? (
          <Pressable onPress={() => setRozwinieta((x) => !x)} style={styles.rozwin} hitSlop={12} accessibilityLabel={rozwinieta ? 'Zwiń' : 'Rozwiń'}>
            <Text style={styles.rozwinTxt}>{rozwinieta ? '▲' : '▼'}</Text>
          </Pressable>
        ) : null}
      </View>
      {r.marka === 'arsenal' ? (
        <View style={[styles.lok, nowa && { top: 26 }]} pointerEvents="none">
          <Text style={styles.lokTxt}>{r.lokalizacja === 'wolomin' ? 'WOŁOMIN' : 'REMBERTÓW'}</Text>
        </View>
      ) : null}
      {rozwinieta ? (
        <View style={{ paddingTop: 2 }}>
          {odznaki.length ? (
            <View style={styles.odznaki}>
              {odznaki.map((o) => (
                <Text key={o} style={[styles.odznaka, o.startsWith('✓ Z') && { backgroundColor: 'rgba(255,255,255,0.38)' }]}>
                  {o}
                </Text>
              ))}
            </View>
          ) : null}
          {r.uwagi ? <Text style={[styles.atrakcja, { marginTop: 4, fontSize: 11 }]}>💬 {r.uwagi}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  karta: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 2.5, borderColor: 'transparent' },
  nowa: { borderColor: C.alarm },
  wcisnieta: { transform: [{ scale: 0.98 }] },
  linia: { fontFamily: Fonts.semibold, fontSize: 14, color: '#fff', marginBottom: 3, lineHeight: 18, letterSpacing: -0.1 },
  czas: { fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.92)', marginBottom: 2 },
  dol: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  atrakcja: { flex: 1, fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  rozwin: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  rozwinTxt: { color: '#fff', fontSize: 9 },
  odznaki: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  odznaka: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 20,
    overflow: 'hidden',
  },
  lok: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.15)', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 20 },
  lokTxt: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 0.5, color: '#fff' },
  new: { position: 'absolute', top: 0, right: 0, backgroundColor: C.alarm, paddingVertical: 3, paddingHorizontal: 8, borderTopRightRadius: 9, borderBottomLeftRadius: 6, zIndex: 10 },
  newTxt: { color: '#fff', fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 0.6 },
  mini: { borderRadius: 10, paddingVertical: 7, paddingHorizontal: 11, opacity: 0.82 },
  miniTxt: { fontFamily: Fonts.semibold, fontSize: 12, color: '#fff' },
  miniPod: { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
});
