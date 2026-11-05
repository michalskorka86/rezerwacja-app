import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import { dzisStr } from '@/logika/daty';
import type { Wynajem } from '@/logika/typy';
import { dataPl, domyslneUmowy, htmlUmowy, type DaneUmowy, type Podpis } from '@/logika/umowa';
import { folderUmow, nazwaFolderu, nazwaPlikuUmowy, wybierzFolderUmow, zapisDostepny, zapiszUmoweWTelefonie } from '@/stan/zapisUmowy';
import { zglos } from '@/stan/zglos';

import { WyborDaty } from '../formularz/Wybory';
import { usePodstronaArkusza } from '../ui/Arkusz';
import { Ikona, type NazwaIkony } from '../ui/Ikona';
import { useKomunikaty } from '../ui/Komunikaty';
import { PoleLiczby } from '../ui/Numpad';
import { Pole } from '../ui/Pola';
import { PrzyciskGlowny } from '../ui/Przyciski';
import { PolePodpisu } from './PolePodpisu';

type PoleDaty = 'dataUmowy' | 'od' | 'do' | 'dataPlatnosci' | 'dataZwrotu';

/**
 * Umowa najmu sprzętu (SILT): dane najemcy → podpisy palcem / rysikiem → PDF do udostępnienia lub druku.
 * Nic nie jest obowiązkowe (puste pola drukują się jako kropki). Umowa nie trafia na serwer.
 * Wygląd uzgodniony z Michałem 04.11 (tablica „Umowa najmu sprzętu — propozycja”).
 */
export function UmowaNajmu({ w, onWroc }: { w: Wynajem; onWroc: () => void }) {
  const { toast, zapytaj } = useKomunikaty();
  const [folder, setFolder] = useState<string | null>(null);
  useEffect(() => {
    folderUmow().then(setFolder).catch(() => {});
  }, []);
  const [krok, setKrok] = useState<'dane' | 'podpisy'>('dane');
  const [d, setD] = useState<DaneUmowy>(() => domyslneUmowy(w, dzisStr()));
  const [data, setData] = useState<PoleDaty | null>(null);
  const [najemca, setNajemca] = useState<Podpis | null>(null);
  const [wynajmujacy, setWynajmujacy] = useState<Podpis | null>(null);
  const [trwa, setTrwa] = useState<null | 'pdf' | 'druk'>(null);

  const wstecz = () => (krok === 'podpisy' ? setKrok('dane') : onWroc());
  usePodstronaArkusza(wstecz, krok === 'dane' ? 'Umowa najmu' : 'Podpisy');

  const zmien = (z: Partial<DaneUmowy>) => setD((p) => ({ ...p, ...z }));
  const html = () => htmlUmowy(d, { najemca: najemca ?? undefined, wynajmujacy: wynajmujacy ?? undefined });

  /** Pierwsza umowa na tym telefonie: zapytaj o folder (telefon zapamięta). */
  const upewnijSieOFolderze = async (): Promise<void> => {
    if (!zapisDostepny || (await folderUmow())) return;
    const tak = await new Promise<boolean>((ok) =>
      zapytaj({
        tytul: 'Gdzie zapisywać umowy?',
        tekst: 'Wybierz folder w telefonie (np. Pobrane → nowy folder „Umowy”). Zrobisz to tylko raz — kolejne umowy zapiszą się tam same.',
        ok: 'Wybierz folder',
        onOk: () => ok(true),
        onAnuluj: () => ok(false),
      }),
    );
    if (tak) {
      const f = await wybierzFolderUmow();
      setFolder(f);
    }
  };

  const udostepnij = async () => {
    setTrwa('pdf');
    try {
      if (Platform.OS === 'web') {
        await Print.printAsync({ html: html() });
        return;
      }
      await upewnijSieOFolderze();
      const { uri } = await Print.printToFileAsync({ html: html() });
      const zapisano = zapisDostepny ? await zapiszUmoweWTelefonie(uri, nazwaPlikuUmowy(d.imie, d.dataUmowy)) : null;
      if (zapisano) toast(`✅ Umowa zapisana w telefonie (${zapisano})`);
      else if (zapisDostepny) toast('⚠️ Nie zapisano w telefonie — wybierz folder ponownie przy następnej umowie');
      setFolder(await folderUmow());
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Umowa najmu — ' + (d.imie || 'najemca') });
    } catch (e) {
      zglos(e, { dopisek: 'Umowa najmu (PDF)' });
      toast('❌ Nie udało się przygotować umowy');
    } finally {
      setTrwa(null);
    }
  };

  const drukuj = async () => {
    setTrwa('druk');
    try {
      await Print.printAsync({ html: html() });
    } catch (e) {
      if (!/cancel|anulow/i.test(String(e))) {
        zglos(e, { dopisek: 'Umowa najmu (druk)' });
        toast('❌ Nie udało się wydrukować');
      }
    } finally {
      setTrwa(null);
    }
  };

  if (krok === 'podpisy') {
    return (
      <View style={styles.tresc}>
        <Text style={styles.opis}>Podaj telefon klientowi. Podpis palcem lub rysikiem w ramce. Podpisy nie są obowiązkowe.</Text>
        <PolePodpisu opis={'Podpis najemcy' + (d.imie ? ' — ' + d.imie : '')} onZmiana={setNajemca} />
        <PolePodpisu opis="Podpis wynajmującego — SILT" onZmiana={setWynajmujacy} />
        <PrzyciskGlowny tekst={trwa === 'pdf' ? 'Przygotowuję…' : 'Generuj umowę i udostępnij'} onPress={udostepnij} trwa={trwa === 'pdf'} wylaczony={!!trwa} style={{ backgroundColor: C.green, marginTop: 6 }} />
        <Pressable onPress={drukuj} disabled={!!trwa} style={({ pressed }) => [styles.drugi, (pressed || !!trwa) && { opacity: 0.6 }]} accessibilityRole="button">
          <Ikona nazwa="print-outline" rozmiar={18} />
          <Text style={styles.drugiTxt}>{trwa === 'druk' ? 'Otwieram druk…' : 'Drukuj'}</Text>
        </Pressable>
        {zapisDostepny ? (
          <Text style={styles.maly}>
            {folder ? `Umowy zapisują się same w folderze: ${nazwaFolderu(folder)}. ` : 'Przy pierwszej umowie wybierzesz folder, w którym umowy będą się same zapisywać. '}
            <Text style={styles.link} onPress={async () => setFolder((await wybierzFolderUmow()) ?? folder)}>
              {folder ? 'Zmień folder' : 'Wybierz teraz'}
            </Text>
          </Text>
        ) : null}
        <Text style={styles.maly}>Na serwer nic nie trafia — umowa jest tylko w tym telefonie i u klienta.</Text>
      </View>
    );
  }

  return (
    <View style={styles.tresc}>
      <Text style={styles.info}>Z wynajmu wpisane same: sprzęt, daty i kwota. Żadne pole nie jest obowiązkowe — puste wydrukują się jako kropki.</Text>

      <Grupa tytul="Najemca">
        <Pole etykieta="Imię i nazwisko" value={d.imie} onChangeText={(t) => zmien({ imie: t })} placeholder="np. Jan Kowalski" autoCapitalize="words" />
        <View style={styles.rzad}>
          <View style={{ width: 110 }}>
            <Pole etykieta="Dowód — seria" value={d.dowodSeria} onChangeText={(t) => zmien({ dowodSeria: t.toUpperCase() })} placeholder="ABC" autoCapitalize="characters" autoCorrect={false} />
          </View>
          <View style={{ flex: 1 }}>
            <Pole etykieta="Numer" value={d.dowodNumer} onChangeText={(t) => zmien({ dowodNumer: t })} placeholder="123456" autoCapitalize="characters" autoCorrect={false} />
          </View>
        </View>
        <Pole etykieta="Dowód wydany przez" value={d.dowodWydany} onChangeText={(t) => zmien({ dowodWydany: t })} placeholder="np. Burmistrz Miasta Wołomin" />
        <Pole etykieta="Adres zamieszkania" value={d.adres} onChangeText={(t) => zmien({ adres: t })} placeholder="ulica, nr, kod, miasto" />
        <Pole etykieta="Telefon" value={d.telefon} onChangeText={(t) => zmien({ telefon: t })} placeholder="np. 501 234 567" keyboardType="phone-pad" />
      </Grupa>

      <Grupa tytul="Termin i zwrot">
        <WierszDaty ikona="document-text-outline" tekst="Data umowy" wartosc={d.dataUmowy} onPress={() => setData('dataUmowy')} />
        <WierszDaty ikona="calendar-outline" tekst="Najem od" wartosc={d.od} onPress={() => setData('od')} />
        <WierszDaty ikona="calendar-outline" tekst="Najem do" wartosc={d.do} onPress={() => setData('do')} />
        <WierszDaty ikona="return-down-back-outline" tekst="Zwrot (pkt 5 i 10)" wartosc={d.dataZwrotu} onPress={() => setData('dataZwrotu')} ostatni />
      </Grupa>

      <Grupa tytul="Pieniądze">
        <WierszKwoty tekst="Koszt najmu (pkt 4)" wartosc={d.kwota} onChange={(t) => zmien({ kwota: t })} />
        <WierszDaty ikona="cash-outline" tekst="Płatne w dniu" wartosc={d.dataPlatnosci} onPress={() => setData('dataPlatnosci')} />
        <WierszKwoty tekst="Za dzień zwłoki (pkt 6)" wartosc={d.zaDzienZwloki} onChange={(t) => zmien({ zaDzienZwloki: t })} />
        <WierszKwoty tekst="Wartość sprzętu (pkt 8)" wartosc={d.wartoscSprzetu} onChange={(t) => zmien({ wartoscSprzetu: t })} ostatni />
      </Grupa>

      <Grupa tytul="Załącznik nr 1 — sprzęt">
        <Pole value={d.sprzet} onChangeText={(t) => zmien({ sprzet: t })} placeholder="np. 4× maska, 4× marker" multiline />
      </Grupa>

      <PrzyciskGlowny tekst="Dalej: podpisy" onPress={() => setKrok('podpisy')} style={{ backgroundColor: C.green }} />

      <WyborDaty
        widoczny={!!data}
        wybrana={data ? d[data] : null}
        onWybierz={(ds) => {
          if (data) zmien({ [data]: ds } as Partial<DaneUmowy>);
          setData(null);
        }}
        onZamknij={() => setData(null)}
      />
    </View>
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

function WierszDaty({ ikona, tekst, wartosc, onPress, ostatni }: { ikona: NazwaIkony; tekst: string; wartosc: string | null; onPress: () => void; ostatni?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wiersz, ostatni && { borderBottomWidth: 0 }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`${tekst}: ${dataPl(wartosc) || 'nie wybrano'}`}>
      <Ikona nazwa={ikona} rozmiar={19} kolor={C.text2} />
      <Text style={styles.wierszTxt}>{tekst}</Text>
      <Text style={[styles.wartosc, !wartosc && { color: C.text3 }]}>{dataPl(wartosc) || 'Wybierz'}</Text>
      <Ikona nazwa="chevron-forward" rozmiar={18} kolor={C.text3} />
    </Pressable>
  );
}

function WierszKwoty({ tekst, wartosc, onChange, ostatni }: { tekst: string; wartosc: string; onChange: (t: string) => void; ostatni?: boolean }) {
  return (
    <View style={[styles.wiersz, ostatni && { borderBottomWidth: 0 }]}>
      <Text style={styles.wierszTxt}>{tekst}</Text>
      <View style={{ width: 120 }}>
        <PoleLiczby value={wartosc} onChange={onChange} placeholder="zł" tytul={tekst} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tresc: { padding: 14, gap: 14 },
  info: { fontFamily: Fonts.regular, fontSize: 13, color: C.green, backgroundColor: C.greenL, borderRadius: 12, padding: 12, lineHeight: 18 },
  opis: { fontFamily: Fonts.regular, fontSize: 13, color: C.text2, lineHeight: 18, paddingHorizontal: 4 },
  link: { fontFamily: Fonts.semibold, color: C.green, textDecorationLine: 'underline' },
  maly: { fontFamily: Fonts.regular, fontSize: 12, color: C.text3, textAlign: 'center', lineHeight: 17 },
  grupaTytul: { fontFamily: Fonts.semibold, fontSize: 11, color: C.text2, letterSpacing: 0.6, paddingHorizontal: 4, paddingBottom: 6 },
  grupa: { backgroundColor: C.surface, borderRadius: Size.radius, paddingHorizontal: 14, paddingVertical: 8, gap: 10 },
  rzad: { flexDirection: 'row', gap: 10 },
  wiersz: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderBottomWidth: 1, borderBottomColor: C.border },
  wierszTxt: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, color: C.text },
  wartosc: { fontFamily: Fonts.semibold, fontSize: 14, color: C.text },
  drugi: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  drugiTxt: { fontFamily: Fonts.semibold, fontSize: 15, color: C.text },
});
