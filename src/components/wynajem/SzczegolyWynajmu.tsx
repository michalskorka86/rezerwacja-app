import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import { komunikatBledu } from '@/logika/klient';
import type { Wynajem } from '@/logika/typy';
import { htmlUmowy, type ZapisanaUmowa } from '@/logika/umowa';
import { kwotaZl, statusWynajmu } from '@/logika/wynajem';
import { klient } from '@/stan/klient';
import { zglos } from '@/stan/zglos';

import { usePodstronaArkusza } from '../ui/Arkusz';
import { Ikona, type NazwaIkony } from '../ui/Ikona';
import { useKomunikaty } from '../ui/Komunikaty';

/**
 * Wynajem na cały ekran (uzgodnione z Michałem 05.11): najemca, daty, status, sprzęt, płatność, uwagi
 * i sekcja Umowa (podgląd / udostępnienie podpisanej umowy z serwera albo „Przygotuj umowę”).
 */
export function SzczegolyWynajmu({
  w,
  zmiana,
  umowaMozliwa,
  onWroc,
  onZwroc,
  onEdytuj,
  onUsun,
  onUdostepnij,
  onUmowa,
}: {
  w: Wynajem;
  /** wolno zmieniać (własna marka, pełna rola) */
  zmiana: boolean;
  /** umowa dla tej marki (na razie SILT) */
  umowaMozliwa: boolean;
  onWroc: () => void;
  onZwroc: () => void;
  onEdytuj: () => void;
  onUsun: () => void;
  onUdostepnij: () => void;
  onUmowa: () => void;
}) {
  usePodstronaArkusza(onWroc, 'Wynajem');
  const { toast } = useKomunikaty();
  const [trwa, setTrwa] = useState<null | 'podglad' | 'udostepnij'>(null);
  const st = statusWynajmu(w);
  const sprzet = Object.entries(w.sprzet ?? {}).filter(([, n]) => n > 0);
  const tel = (w.klient_telefon ?? '').replace(/[^\d+]/g, '');

  /** Umowa z serwera → HTML (ta sama treść i podpisy co przy podpisaniu). */
  const pobierzUmowe = async (): Promise<{ html: string; imie: string } | null> => {
    const j = await klient<{ umowa: { dane: ZapisanaUmowa } | null }>('umowa', { parametry: { wynajem_id: w.id }, czasMs: 30000 });
    if (!j.umowa) return null;
    const d = j.umowa.dane;
    return { html: htmlUmowy({ ...d, pozycje: d.pozycje ?? [] }, d.podpisy ?? {}), imie: d.imie };
  };

  const umowa = async (jak: 'podglad' | 'udostepnij') => {
    setTrwa(jak);
    try {
      const u = await pobierzUmowe();
      if (!u) {
        toast('Nie ma zapisanej umowy');
        return;
      }
      if (jak === 'podglad' || Platform.OS === 'web') {
        await Print.printAsync({ html: u.html });
      } else {
        const { uri } = await Print.printToFileAsync({ html: u.html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Umowa najmu — ' + (u.imie || w.klient_imie_nazwisko) });
      }
    } catch (e) {
      if (/cancel|anulow/i.test(String(e))) return;
      zglos(e, { dopisek: 'Umowa przy wynajmie' });
      toast('❌ ' + komunikatBledu(e));
    } finally {
      setTrwa(null);
    }
  };

  return (
    <View style={styles.tresc}>
      <View style={[styles.hdr, { backgroundColor: w.marka === 'arsenal' ? C.blue : C.green }]}>
        <Text style={styles.zrodlo}>WYNAJEM SPRZĘTU · {w.marka === 'arsenal' ? 'ARSENAŁ' : 'SILT'}</Text>
        <Text style={styles.nazwa}>{w.klient_imie_nazwisko || 'Bez nazwy'}</Text>
        <Text style={styles.czas}>
          {w.data_wynajmu}
          {w.data_zwrotu ? ' → zwrot ' + w.data_zwrotu : ''}
        </Text>
        <View style={styles.plakietki}>
          <Text style={styles.plakietka}>{st.tekst}</Text>
          <Text style={styles.plakietka}>
            {kwotaZl(w.kwota)} · {w.zaplacono ? 'zapłacono' : 'nieopłacony'}
          </Text>
        </View>
      </View>

      <View style={styles.szybkie}>
        <Szybka ikona="call-outline" tekst="Zadzwoń" wylaczona={!tel} onPress={() => Linking.openURL('tel:' + tel)} />
        <Szybka ikona="chatbubble-outline" tekst="SMS" wylaczona={!tel} onPress={() => Linking.openURL('sms:' + tel)} />
        <Szybka ikona="share-outline" tekst="Udostępnij" onPress={onUdostepnij} />
      </View>

      <Grupa tytul="Sprzęt">
        {sprzet.length ? (
          sprzet.map(([nazwa, n], i) => <Wiersz key={nazwa} lewo={nazwa} prawo={`${n}×`} ostatni={i === sprzet.length - 1} />)
        ) : (
          <Wiersz lewo="Brak sprzętu" ostatni />
        )}
      </Grupa>

      <Grupa tytul="Płatność i uwagi">
        <Wiersz lewo="Kwota" prawo={`${kwotaZl(w.kwota)} · ${w.platnosc}`} />
        <Wiersz lewo="Zapłacono" prawo={w.zaplacono ? 'tak' : 'nie'} ostatni={!w.faktura_nazwa && !w.uwagi && !w.klient_telefon} />
        {w.klient_telefon ? <Wiersz lewo="Telefon" prawo={w.klient_telefon} ostatni={!w.faktura_nazwa && !w.uwagi} /> : null}
        {w.faktura_nazwa ? <Wiersz lewo="Faktura" prawo={[w.faktura_nazwa, w.faktura_nip, w.faktura_email].filter(Boolean).join(' · ')} ostatni={!w.uwagi} /> : null}
        {w.uwagi ? <Text style={styles.uwagi}>{w.uwagi}</Text> : null}
      </Grupa>

      {umowaMozliwa || w.umowa_czas ? (
        <Grupa tytul="Umowa">
          {w.umowa_czas ? (
            <>
              <View style={[styles.wiersz, { gap: 10 }]}>
                <Ikona nazwa="document-text-outline" rozmiar={22} kolor={C.green} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.umowaTytul}>Umowa podpisana</Text>
                  <Text style={styles.maly}>{w.umowa_czas.slice(0, 16)}</Text>
                </View>
              </View>
              <View style={styles.rzad}>
                <Przycisk tekst={trwa === 'podglad' ? 'Otwieram…' : 'Podgląd / druk'} ikona="eye-outline" zielony onPress={() => umowa('podglad')} wylaczony={!!trwa} />
                <Przycisk tekst={trwa === 'udostepnij' ? 'Chwila…' : 'Udostępnij'} ikona="share-outline" onPress={() => umowa('udostepnij')} wylaczony={!!trwa} />
              </View>
              {zmiana && umowaMozliwa ? (
                <Pressable onPress={onUmowa} style={({ pressed }) => [styles.nowa, pressed && { opacity: 0.6 }]} accessibilityRole="button">
                  <Text style={styles.link}>Przygotuj nową umowę</Text>
                </Pressable>
              ) : null}
            </>
          ) : zmiana ? (
            <View style={[styles.rzad, { paddingVertical: 10 }]}>
              <Przycisk tekst="📝 Przygotuj umowę" zielony onPress={onUmowa} />
            </View>
          ) : (
            <Wiersz lewo="Brak podpisanej umowy" ostatni />
          )}
        </Grupa>
      ) : null}

      {zmiana ? (
        <View style={styles.rzad}>
          {!w.zwrocono ? <Przycisk tekst="✓ Zwrócono" zielony onPress={onZwroc} /> : null}
          <Przycisk tekst="Edytuj" ikona="create-outline" onPress={onEdytuj} />
          <Przycisk tekst="Usuń" ikona="trash-outline" czerwony onPress={onUsun} />
        </View>
      ) : null}
    </View>
  );
}

function Szybka({ ikona, tekst, onPress, wylaczona }: { ikona: NazwaIkony; tekst: string; onPress: () => void; wylaczona?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={wylaczona} accessibilityRole="button" accessibilityLabel={tekst} style={({ pressed }) => [styles.szybka, (pressed || wylaczona) && { opacity: wylaczona ? 0.35 : 0.7 }]}>
      <View style={styles.kolko}>
        <Ikona nazwa={ikona} rozmiar={22} kolor={C.green} />
      </View>
      <Text style={styles.szybkaTxt}>{tekst}</Text>
    </Pressable>
  );
}

function Grupa({ tytul, children }: { tytul: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.grupaTytul}>{tytul.toUpperCase()}</Text>
      <View style={styles.grupa}>{children}</View>
    </View>
  );
}

function Wiersz({ lewo, prawo, ostatni }: { lewo: string; prawo?: string; ostatni?: boolean }) {
  return (
    <View style={[styles.wiersz, ostatni && { borderBottomWidth: 0 }]}>
      <Text style={styles.lewo}>{lewo}</Text>
      {prawo ? <Text style={styles.prawo}>{prawo}</Text> : null}
    </View>
  );
}

function Przycisk({ tekst, ikona, onPress, zielony, czerwony, wylaczony }: { tekst: string; ikona?: NazwaIkony; onPress: () => void; zielony?: boolean; czerwony?: boolean; wylaczony?: boolean }) {
  const kolor = czerwony ? C.red : zielony ? C.green : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={wylaczony}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.przycisk,
        zielony && { backgroundColor: C.greenL, borderColor: '#a5d6a7' },
        czerwony && { borderColor: '#f5c0bb' },
        (pressed || wylaczony) && { opacity: 0.6 },
      ]}>
      {ikona ? <Ikona nazwa={ikona} rozmiar={17} kolor={kolor} /> : null}
      <Text style={[styles.przyciskTxt, { color: kolor }]}>{tekst}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tresc: { padding: 14, gap: 14 },
  hdr: { borderRadius: Size.radius, padding: 16 },
  zrodlo: { fontFamily: Fonts.semibold, fontSize: 11, letterSpacing: 0.4, color: 'rgba(255,255,255,0.85)' },
  nazwa: { fontFamily: Fonts.bold, fontSize: 20, color: '#fff', marginTop: 2 },
  czas: { fontFamily: Fonts.regular, fontSize: 14, color: 'rgba(255,255,255,0.92)' },
  plakietki: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  plakietka: { fontFamily: Fonts.semibold, fontSize: 12, color: '#fff', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, overflow: 'hidden' },
  szybkie: { flexDirection: 'row', justifyContent: 'space-around' },
  szybka: { alignItems: 'center', gap: 5, minWidth: 72 },
  kolko: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.greenL, alignItems: 'center', justifyContent: 'center' },
  szybkaTxt: { fontFamily: Fonts.medium, fontSize: 12, color: C.green },
  grupaTytul: { fontFamily: Fonts.semibold, fontSize: 11, color: C.text2, letterSpacing: 0.6, paddingHorizontal: 4, paddingBottom: 6 },
  grupa: { backgroundColor: C.surface, borderRadius: Size.radius, paddingHorizontal: 14 },
  wiersz: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  lewo: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, color: C.text },
  prawo: { fontFamily: Fonts.semibold, fontSize: 14, color: C.text, flexShrink: 1, textAlign: 'right' },
  uwagi: { fontFamily: Fonts.regular, fontSize: 14, color: C.text2, paddingVertical: 10 },
  umowaTytul: { fontFamily: Fonts.semibold, fontSize: 15, color: C.text },
  maly: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2 },
  rzad: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  nowa: { alignSelf: 'center', paddingVertical: 10 },
  link: { fontFamily: Fonts.semibold, fontSize: 14, color: C.green, textDecorationLine: 'underline' },
  przycisk: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, backgroundColor: C.surface, paddingHorizontal: 6 },
  przyciskTxt: { fontFamily: Fonts.semibold, fontSize: 14 },
});
