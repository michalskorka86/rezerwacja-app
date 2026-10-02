import * as Sharing from 'expo-sharing';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { godziny } from '@/logika/daty';
import { nazwyDodatkow } from '@/logika/kalendarz';
import type { Rezerwacja } from '@/logika/typy';

export type ObrazekRef = { udostepnij: () => Promise<'ok' | 'anulowano'> };

/**
 * Obrazek rezerwacji do wysłania (WhatsApp, SMS…) — ten sam wygląd co html2canvas w PWA:
 * nagłówek w kolorze karty, tabelka z osobami, atrakcją, dodatkami, uwagami, instrukcjami i zadatkiem.
 * Rysowany poza ekranem, „fotografowany” i przekazywany do menu udostępniania Androida.
 */
export const ObrazekRezerwacji = forwardRef<ObrazekRef, { r: Rezerwacja; nazwy: Record<string, string> }>(function ObrazekRezerwacji({ r, nazwy }, ref) {
  const widok = useRef<View>(null);
  useImperativeHandle(ref, () => ({
    udostepnij: async () => {
      const uri = await captureRef(widok, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Udostępnianie niedostępne na tym telefonie');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Rezerwacja SILT Paintball' });
      return 'ok';
    },
  }));
  const dod = nazwyDodatkow(r.dodatki, nazwy);
  const wiersze: [string, string, object?][] = [
    ['👥', `${r.liczba_osob} osób`, { fontWeight: '600' }],
    ['🎯', r.atrakcja_nazwa ?? ''],
  ];
  if (dod.length) wiersze.push(['🎁', dod.join(', ')]);
  if (r.uwagi) wiersze.push(['💬', r.uwagi, { color: '#555' }]);
  if (r.instrukcje) wiersze.push(['⚙️', 'Instruktor: ' + r.instrukcje, { color: '#e65100' }]);
  wiersze.push(['💵', r.zadatek_status === 'oplacony' ? '✅ Zadatek opłacony' : '⏳ Zadatek oczekuje']);

  return (
    <View style={styles.pozaEkranem} pointerEvents="none">
      <View ref={widok} collapsable={false} style={styles.karta}>
        <View style={[styles.hdr, { backgroundColor: r.kolor_karty || '#2C6E3F' }]}>
          <Text style={styles.zrodlo}>SILT PAINTBALL  ·  {(r.atrakcja_nazwa ?? '').toUpperCase()}</Text>
          <Text style={styles.nazwa}>{r.klient_imie_nazwisko || 'Brak nazwy'}</Text>
          <Text style={styles.data}>
            {r.data_rezerwacji}  ·  {godziny(r.godzina_start, null)}
          </Text>
        </View>
        <View style={styles.tresc}>
          {wiersze.map(([ikona, tekst, styl], i) => (
            <View key={i} style={styles.wiersz}>
              <Text style={styles.ikona}>{ikona}</Text>
              <Text style={[styles.tekst, styl]}>{tekst}</Text>
            </View>
          ))}
          <Text style={styles.stopka}>paintball.silt.pl  ·  503 41 41 75</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  pozaEkranem: { position: 'absolute', left: -10000, top: 0 },
  karta: { width: 360, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  hdr: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16 },
  zrodlo: { fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5, marginBottom: 4 },
  nazwa: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 2 },
  data: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  tresc: { paddingVertical: 16, paddingHorizontal: 20 },
  wiersz: { flexDirection: 'row', paddingVertical: 5 },
  ikona: { width: 30, fontSize: 14, color: '#888' },
  tekst: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  stopka: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 12, paddingTop: 10, textAlign: 'center', fontSize: 12, color: '#999' },
});
