import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import { dataZRokiem, dzisStr } from '@/logika/daty';
import { dataKropki, htmlRozpiski, nazwaLokalizacji, obliczSprzet, rezerwacjeRozpiski, uwagiBezTelefonow, type LokRozpiski } from '@/logika/rozpiska';
import { useDane } from '@/stan/DaneProvider';
import { zglos } from '@/stan/zglos';

import { WyborDaty } from './formularz/Wybory';
import { useKomunikaty } from './ui/Komunikaty';

const NIEBIESKI = '#1A73E8';

/**
 * Rozpiski dnia dla instruktorów Arsenału (pdf_dzien.php): wybór dnia i lokalizacji, podsumowanie, grupy,
 * zapotrzebowanie na sprzęt. Liczone w telefonie z zapisanych rezerwacji — działa też bez zasięgu.
 * 🖨️ Drukuj i 📤 Wyślij PDF — ten sam wygląd co strona w PWA.
 */
export function Rozpiski() {
  const { rezerwacje, slowniki, pobrano } = useDane();
  const { toast } = useKomunikaty();
  const [data, setData] = useState(dzisStr);
  const [lok, setLok] = useState<LokRozpiski>('all');
  const [kalendarz, setKalendarz] = useState(false);
  const [trwa, setTrwa] = useState<null | 'druk' | 'pdf'>(null);

  const lista = rezerwacjeRozpiski(rezerwacje, data, lok);
  const sprzet = obliczSprzet(lista);
  const osob = lista.reduce((s, r) => s + r.liczba_osob, 0);
  const nazwy = slowniki?.nazwy_dodatkow ?? {};
  const html = () => htmlRozpiski(lista, data, lok, nazwy);

  const drukuj = async () => {
    setTrwa('druk');
    try {
      await Print.printAsync({ html: html() });
    } catch (e) {
      if (!String(e).includes('cancel')) {
        zglos(e, { dopisek: 'Drukowanie rozpiski' });
        toast('❌ Nie udało się otworzyć drukowania');
      }
    } finally {
      setTrwa(null);
    }
  };

  const pdf = async () => {
    setTrwa('pdf');
    try {
      const { uri } = await Print.printToFileAsync({ html: html() });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Rozpiski ${dataKropki(data)}`, UTI: 'com.adobe.pdf' });
    } catch (e) {
      zglos(e, { dopisek: 'PDF rozpiski' });
      toast('❌ Nie udało się przygotować PDF');
    } finally {
      setTrwa(null);
    }
  };

  return (
    <View>
      <View style={styles.wybory}>
        <Pressable onPress={() => setKalendarz(true)} style={({ pressed }) => [styles.data, pressed && { opacity: 0.8 }]} accessibilityLabel="Wybierz dzień">
          <Text style={styles.dataEt}>DZIEŃ</Text>
          <Text style={styles.dataTxt}>📅 {dataZRokiem(data)}</Text>
        </Pressable>
        <View style={styles.lokalizacje}>
          {(['all', 'rembert', 'wolomin'] as const).map((l) => (
            <Pressable key={l} onPress={() => setLok(l)} style={[styles.lok, lok === l && styles.lokOn]} accessibilityState={{ selected: lok === l }}>
              <Text style={[styles.lokTxt, lok === l && styles.lokTxtOn]}>{l === 'all' ? 'Obie' : nazwaLokalizacji(l)}</Text>
            </Pressable>
          ))}
        </View>
        {lista.length ? (
          <View style={styles.akcje}>
            <Pressable onPress={drukuj} disabled={!!trwa} style={({ pressed }) => [styles.akcja, (pressed || !!trwa) && { opacity: 0.7 }]}>
              <Text style={styles.akcjaTxt}>{trwa === 'druk' ? '⏳' : '🖨️'} Drukuj</Text>
            </Pressable>
            <Pressable onPress={pdf} disabled={!!trwa} style={({ pressed }) => [styles.akcja, (pressed || !!trwa) && { opacity: 0.7 }]}>
              <Text style={styles.akcjaTxt}>{trwa === 'pdf' ? '⏳' : '📤'} Wyślij PDF</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {!lista.length ? (
        <Text style={styles.pusto}>
          Brak rezerwacji na {dataKropki(data)} ({nazwaLokalizacji(lok)})
        </Text>
      ) : (
        <>
          <View style={styles.podsumowanie}>
            <View style={styles.kafel}>
              <Text style={styles.wartosc}>{lista.length}</Text>
              <Text style={styles.podpis}>Grup łącznie</Text>
            </View>
            <View style={styles.kafel}>
              <Text style={styles.wartosc}>{osob}</Text>
              <Text style={styles.podpis}>Graczy łącznie</Text>
            </View>
          </View>

          <Text style={styles.naglowek}>Grupy</Text>
          {lista.map((r, i) => {
            const dod = r.dodatki.map((id) => nazwy[String(id)]).filter(Boolean);
            const uw = uwagiBezTelefonow(r.uwagi);
            return (
              <View key={r.id} style={[styles.grupa, i % 2 === 1 && { backgroundColor: '#f8f9fa' }]}>
                <View style={styles.grupaGora}>
                  <Text style={styles.nr}>{i + 1}</Text>
                  <Text style={styles.godz}>{r.godzina_start.slice(0, 5)}</Text>
                  <Text style={[styles.lokZnak, r.lokalizacja === 'wolomin' && styles.lokZnakWol]}>{r.lokalizacja === 'wolomin' ? 'Woł' : 'Rem'}</Text>
                  <Text style={styles.atrakcja} numberOfLines={1}>
                    {r.atrakcja_nazwa ?? '—'}
                  </Text>
                  <Text style={styles.osob}>{r.liczba_osob} os.</Text>
                </View>
                <Text style={styles.org}>
                  {r.klient_imie_nazwisko || '—'}
                  <Text style={styles.zadatek}>{r.zadatek_status === 'oplacony' ? '  · zadatek ✅' : '  · zadatek —'}</Text>
                </Text>
                {dod.length ? <Text style={styles.dodatki}>✅ {dod.join(', ')}</Text> : null}
                {uw ? <Text style={styles.uwagi}>{uw}</Text> : null}
              </View>
            );
          })}

          <Text style={styles.naglowek}>Zapotrzebowanie na sprzęt</Text>
          <Text style={styles.przypis}>Szacunek — ~3 h na grupę</Text>
          <View style={styles.tabela}>
            <View style={[styles.wiersz, styles.wierszNagl]}>
              <Text style={[styles.kol1, styles.th]}>Atrakcja</Text>
              <Text style={[styles.kol, styles.th]}>Grup</Text>
              <Text style={[styles.kol, styles.th]}>Max naraz</Text>
              <Text style={[styles.kol, styles.th]}>Łącznie</Text>
            </View>
            {sprzet.map((s, i) => (
              <View key={s.atrakcja} style={[styles.wiersz, i % 2 === 1 && { backgroundColor: '#f5f5f5' }]}>
                <Text style={[styles.kol1, styles.td]}>{s.atrakcja}</Text>
                <Text style={[styles.kol, styles.td]}>{s.grup}</Text>
                <Text style={[styles.kol, styles.td, styles.max]}>{s.max_osob} szt.</Text>
                <Text style={[styles.kol, styles.td]}>{s.osob_lacznie} os.</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {pobrano ? (
        <Text style={styles.stopka}>
          Z rezerwacji pobranych o {new Date(pobrano).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      ) : null}

      <WyborDaty
        widoczny={kalendarz}
        wybrana={data}
        onWybierz={(ds) => {
          setData(ds);
          setKalendarz(false);
        }}
        onZamknij={() => setKalendarz(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wybory: { gap: 10, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: NIEBIESKI, marginBottom: 14 },
  data: { backgroundColor: NIEBIESKI, borderRadius: Size.rs, paddingVertical: 10, paddingHorizontal: 14 },
  dataEt: { fontFamily: Fonts.bold, fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  dataTxt: { fontFamily: Fonts.semibold, fontSize: 16, color: '#fff', marginTop: 2 },
  lokalizacje: { flexDirection: 'row', gap: 8 },
  lok: { flex: 1, minHeight: 44, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  lokOn: { backgroundColor: C.blueL, borderColor: NIEBIESKI },
  lokTxt: { fontFamily: Fonts.regular, fontSize: 13, color: C.text },
  lokTxtOn: { fontFamily: Fonts.semibold, color: NIEBIESKI },
  akcje: { flexDirection: 'row', gap: 8 },
  akcja: { flex: 1, minHeight: 46, borderRadius: 6, borderWidth: 1, borderColor: '#a5d6a7', backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
  akcjaTxt: { fontFamily: Fonts.bold, fontSize: 14, color: '#2e7d32' },
  pusto: { textAlign: 'center', color: '#999', fontSize: 14, fontFamily: Fonts.regular, paddingVertical: 40 },
  podsumowanie: { flexDirection: 'row', gap: 8, backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 2 },
  kafel: { flex: 1, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0', paddingVertical: 10, paddingHorizontal: 12 },
  wartosc: { fontFamily: Fonts.bold, fontSize: 22, color: NIEBIESKI },
  podpis: { fontFamily: Fonts.regular, fontSize: 11, color: '#666', marginTop: 2 },
  naglowek: { fontFamily: Fonts.bold, fontSize: 14, color: '#333', marginBottom: 8, marginTop: 14 },
  grupa: { paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 3 },
  grupaGora: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nr: { width: 18, fontFamily: Fonts.regular, fontSize: 12, color: '#666' },
  godz: { fontFamily: Fonts.bold, fontSize: 14, color: '#222' },
  lokZnak: { fontFamily: Fonts.bold, fontSize: 10, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e3f2fd', color: '#1565c0' },
  lokZnakWol: { backgroundColor: '#fce4ec', color: '#880e4f' },
  atrakcja: { flex: 1, fontFamily: Fonts.regular, fontSize: 13, color: '#222' },
  osob: { fontFamily: Fonts.bold, fontSize: 14, color: '#222' },
  org: { fontFamily: Fonts.regular, fontSize: 13, color: '#222', marginLeft: 26 },
  zadatek: { fontSize: 12, color: '#666' },
  dodatki: { fontFamily: Fonts.regular, fontSize: 12, color: '#2e7d32', marginLeft: 26 },
  uwagi: { fontFamily: Fonts.regular, fontSize: 12, color: '#666', marginLeft: 26 },
  przypis: { fontFamily: Fonts.regular, fontSize: 11, color: '#666', marginTop: -4, marginBottom: 8 },
  tabela: { marginBottom: 16, borderRadius: 4, overflow: 'hidden' },
  wiersz: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 8, paddingHorizontal: 8 },
  wierszNagl: { backgroundColor: '#37474f', borderBottomWidth: 0 },
  kol1: { flex: 1.6 },
  kol: { flex: 1 },
  th: { fontFamily: Fonts.bold, fontSize: 11, color: '#fff' },
  td: { fontFamily: Fonts.regular, fontSize: 12, color: '#222' },
  max: { fontFamily: Fonts.bold, fontSize: 15, color: NIEBIESKI },
  stopka: { fontFamily: Fonts.regular, fontSize: 11, color: C.text3, textAlign: 'center', marginTop: 4 },
});
