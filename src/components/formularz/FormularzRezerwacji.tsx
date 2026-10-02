import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import { krotkaData } from '@/logika/daty';
import {
  bladFormularza,
  czyZmieniony,
  daneDoWyslania,
  przelaczDodatek,
  stanPoczatkowy,
  tytulFormularza,
  type StanFormularza,
  type TrybFormularza,
} from '@/logika/formularz';
import { dodatkiPoKolei } from '@/logika/kalendarz';
import { komunikatBledu } from '@/logika/klient';
import type { Atrakcja, Marka, Rezerwacja } from '@/logika/typy';
import { klient } from '@/stan/klient';
import { useDane } from '@/stan/DaneProvider';

import { Arkusz } from '../ui/Arkusz';
import { useKomunikaty } from '../ui/Komunikaty';
import { PoleLiczby } from '../ui/Numpad';
import { Etykieta, Pole, Sekcja } from '../ui/Pola';
import { Przelacznik } from '../ui/Przelacznik';
import { PrzyciskGlowny } from '../ui/Przyciski';
import { WyborDaty, WyborDodatkow, WyborGodziny, WyborLokalizacji } from './Wybory';

/**
 * Dodawanie / edycja / kopia rezerwacji — formularz 1:1 z PWA (renderAddForm / openEdit / kopiujRez).
 * Arsenał przy nowej rezerwacji najpierw wybiera lokalizację. Liczba osób — klawiatura aplikacji.
 * Błąd zapisu: wpisane dane zostają, przycisk „🔄 Spróbuj ponownie”.
 */
export function FormularzRezerwacji({
  tryb,
  onZamknij,
  onZapisano,
}: {
  tryb: TrybFormularza;
  /** po zamknięciu (animacja skończona) — rodzic usuwa formularz */
  onZamknij: () => void;
  onZapisano: (r: Rezerwacja, nowa: boolean) => void;
}) {
  const { slowniki, konto } = useDane();
  const marka: Marka = konto?.uzytkownik.marka ?? 'silt';
  const { toast, zapytaj, pasekBledu } = useKomunikaty();
  const [poczatek] = useState(() => stanPoczatkowy(tryb, marka));
  const [s, setS] = useState<StanFormularza>(poczatek);
  const [otwarte, setOtwarte] = useState(true);
  const [okienko, setOkienko] = useState<null | 'data' | 'od' | 'do' | 'dodatki'>(null);
  const [trwa, setTrwa] = useState(false);
  const [ponow, setPonow] = useState(false);
  const [bledy, setBledy] = useState<string | null>(null);

  const zmien = (z: Partial<StanFormularza>) => setS((p) => ({ ...p, ...z }));
  const atrakcje = slowniki?.atrakcje ?? [];
  const dodatki = dodatkiPoKolei(slowniki?.dodatki ?? []);
  const wyborLokalizacji = marka === 'arsenal' && tryb.rodzaj === 'nowa' && !s.lokalizacja;
  const pokazLokalizacje = marka === 'arsenal' && tryb.rodzaj !== 'nowa';

  const zamknij = () => {
    pasekBledu(null);
    setOtwarte(false);
    setTimeout(onZamknij, 220);
  };

  const zamknijPytaj = () => {
    if (!czyZmieniony(s, poczatek)) return zamknij();
    zapytaj({ tytul: 'Zamknąć bez zapisywania?', tekst: 'Wpisane dane zostaną utracone.', ok: 'Zamknij', niebezpieczne: true, onOk: zamknij });
  };

  const zapisz = async () => {
    const b = bladFormularza(s, marka);
    if (b) {
      setBledy(b);
      toast('⚠️ ' + b);
      return;
    }
    setBledy(null);
    setTrwa(true);
    try {
      const edycja = tryb.rodzaj === 'edycja';
      const j = await klient<{ rezerwacja: Rezerwacja }>(edycja ? 'rezerwacja_edytuj' : 'rezerwacja_dodaj', {
        body: daneDoWyslania(s, edycja ? tryb.r.id : undefined),
      });
      pasekBledu(null);
      setPonow(false);
      setOtwarte(false);
      setTimeout(() => onZapisano(j.rezerwacja, !edycja), 220);
    } catch (e) {
      setPonow(true);
      pasekBledu('❌ ' + komunikatBledu(e) + ' Dane są zachowane — spróbuj ponownie.');
    } finally {
      setTrwa(false);
    }
  };

  if (wyborLokalizacji) {
    return <WyborLokalizacji widoczny={otwarte} onZamknij={zamknij} onWybierz={(l) => zmien({ lokalizacja: l })} />;
  }

  return (
    <>
      <Arkusz widoczny={otwarte} onZamknij={zamknijPytaj} tytul={tytulFormularza(tryb, s.lokalizacja)} nazwa={'formularz-' + tryb.rodzaj}>
        <Sekcja tytul="Dane rezerwacji">
          <View style={styles.pole}>
            <Etykieta tekst="Liczba osób *" />
            <View style={styles.osobyRzad}>
              <View style={{ flex: 1 }}>
                <PoleLiczby value={s.osoby} onChange={(t) => zmien({ osoby: t })} placeholder="np. 12" tytul="Liczba osób" />
              </View>
              <View style={styles.pWrap}>
                <Etykieta tekst="Potw." />
                <Pressable
                  onPress={() => zmien({ potwierdzona: !s.potwierdzona })}
                  accessibilityRole="switch"
                  accessibilityLabel="Potwierdzona"
                  accessibilityState={{ checked: s.potwierdzona }}
                  style={[styles.p, s.potwierdzona && styles.pOn]}>
                  <Text style={[styles.pTxt, s.potwierdzona && { color: C.green }]}>P</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <Pole etykieta="Imię i Nazwisko *" value={s.imie} onChangeText={(t) => zmien({ imie: t })} placeholder="np. Jan Kowalski" autoCapitalize="words" autoComplete="off" />
          <Pole
            etykieta="Telefon *"
            value={s.telefon}
            onChangeText={(t) => zmien({ telefon: t })}
            placeholder="np. 501 234 567"
            keyboardType="phone-pad"
            bledne={bledy === 'Zły numer telefonu'}
          />
          <Pole
            etykieta="E-mail"
            value={s.email}
            onChangeText={(t) => zmien({ email: t })}
            placeholder="np. jan@email.pl"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            bledne={bledy === 'Zły adres e-mail'}
          />
        </Sekcja>

        <Sekcja tytul="Data i godzina">
          <View style={styles.dtRzad}>
            <PrzyciskDaty etykieta="DATA" wartosc={s.data ? krotkaData(s.data) : 'Wybierz'} wypelniony={!!s.data} bledny={bledy === 'Wybierz datę'} onPress={() => setOkienko('data')} />
            <PrzyciskDaty etykieta="OD" wartosc={s.od ?? '--:--'} wypelniony={!!s.od} bledny={bledy === 'Wybierz godzinę rozpoczęcia'} onPress={() => setOkienko('od')} />
            <PrzyciskDaty etykieta="DO" wartosc={s.do ?? '--:--'} wypelniony={!!s.do} bledny={!!bledy?.startsWith('Godzina zakończenia')} onPress={() => setOkienko('do')} />
          </View>
        </Sekcja>

        {pokazLokalizacje ? (
          <Sekcja tytul="Lokalizacja">
            <View style={styles.lokRzad}>
              {(
                [
                  ['rembert', 'Rembertów'],
                  ['wolomin', 'Wołomin'],
                ] as const
              ).map(([l, n]) => (
                <Pressable key={l} onPress={() => zmien({ lokalizacja: l })} style={[styles.lokBtn, s.lokalizacja === l && styles.lokBtnOn]} accessibilityState={{ selected: s.lokalizacja === l }}>
                  <Text style={[styles.lokTxt, s.lokalizacja === l && styles.lokTxtOn]}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </Sekcja>
        ) : null}

        <Sekcja tytul="Atrakcja *">
          <View style={styles.atrSiatka}>
            {atrakcje.map((a) => (
              <Kafelek key={a.id} a={a} wybrany={s.atrakcjaId === a.id} onPress={() => zmien({ atrakcjaId: a.id })} />
            ))}
          </View>
        </Sekcja>

        <Sekcja tytul="Dodatki">
          <Pressable onPress={() => setOkienko('dodatki')} style={({ pressed }) => [styles.dodatkiBtn, pressed && { opacity: 0.8 }]}>
            <Text style={styles.dodatkiTxt}>Wybierz dodatki</Text>
            <Text style={styles.licznik}>{s.dodatki.length}</Text>
          </Pressable>
        </Sekcja>

        <Sekcja tytul="Zadatek">
          <Przelacznik ikona="💵" wlaczony={s.zadatek} napisWl="Zadatek opłacony" napisWyl="Brak zadatku" onPress={() => zmien({ zadatek: !s.zadatek })} />
        </Sekcja>

        <Sekcja tytul="Uwagi">
          <Pole value={s.uwagi} onChangeText={(t) => zmien({ uwagi: t })} placeholder="np. Kawalerski, tort po grze..." multiline />
        </Sekcja>
        <Sekcja tytul="🛠 Instrukcje dla instruktora" dopisek="(widoczne tylko w panelu)">
          <Pole value={s.instrukcje} onChangeText={(t) => zmien({ instrukcje: t })} placeholder="np. Uwaga — dzieci poniżej 18 lat, tort o 15:00, klient płaci gotówką..." multiline />
        </Sekcja>

        <PrzyciskGlowny tekst={tryb.rodzaj === 'edycja' ? 'Zapisz zmiany' : 'Zapisz rezerwację'} onPress={zapisz} trwa={trwa} ponow={ponow} />
        <Pressable onPress={zamknijPytaj} style={({ pressed }) => [styles.anuluj, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Text style={styles.anulujTxt}>Anuluj</Text>
        </Pressable>
      </Arkusz>

      <WyborDaty
        widoczny={okienko === 'data'}
        wybrana={s.data}
        onWybierz={(ds) => {
          zmien({ data: ds });
          setOkienko(null);
        }}
        onZamknij={() => setOkienko(null)}
      />
      <WyborGodziny
        cel={okienko === 'od' || okienko === 'do' ? okienko : null}
        wybrana={okienko === 'do' ? s.do : s.od}
        onWybierz={(g) => {
          zmien(okienko === 'do' ? { do: g } : { od: g });
          setOkienko(null);
        }}
        onWyczysc={() => {
          zmien({ do: null });
          setOkienko(null);
        }}
        onZamknij={() => setOkienko(null)}
      />
      <WyborDodatkow
        widoczny={okienko === 'dodatki'}
        dodatki={dodatki}
        wybrane={s.dodatki}
        onPrzelacz={(id) => zmien({ dodatki: przelaczDodatek(s.dodatki, id) })}
        onZamknij={() => setOkienko(null)}
      />
    </>
  );
}

function PrzyciskDaty({ etykieta, wartosc, wypelniony, bledny, onPress }: { etykieta: string; wartosc: string; wypelniony: boolean; bledny?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${etykieta}: ${wartosc}`} style={({ pressed }) => [styles.dt, wypelniony && { borderColor: C.text }, bledny && { borderColor: C.red, backgroundColor: '#fff8f8' }, pressed && { opacity: 0.8 }]}>
      <Text style={styles.dtLbl}>{etykieta}</Text>
      <Text style={styles.dtVal}>{wartosc}</Text>
    </Pressable>
  );
}

/** Kafelek atrakcji (.atile): kolor atrakcji, ✓ i obwódka gdy wybrany. */
function Kafelek({ a, wybrany, onPress }: { a: Atrakcja; wybrany: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: wybrany }} style={[styles.kafelekRama, wybrany && { borderColor: C.text }]}>
      <View style={[styles.kafelek, { backgroundColor: a.kolor }, wybrany && { borderColor: 'rgba(255,255,255,0.7)' }]}>
        <Text style={styles.kafelekTxt}>{a.nazwa}</Text>
        {wybrany ? <Text style={styles.ck}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pole: { gap: 5 },
  osobyRzad: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  pWrap: { alignItems: 'center', gap: 3 },
  p: { width: 50, height: 46, borderRadius: Size.rs, borderWidth: 2, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  pOn: { borderColor: C.green, backgroundColor: C.greenL },
  pTxt: { fontFamily: Fonts.bold, fontSize: 17, color: C.text2 },
  dtRzad: { flexDirection: 'row', gap: 7 },
  dt: { flex: 1, paddingVertical: 11, paddingHorizontal: 6, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs, alignItems: 'center' },
  dtLbl: { fontFamily: Fonts.regular, fontSize: 9, color: C.text3, marginBottom: 2 },
  dtVal: { fontFamily: Fonts.medium, fontSize: 13, color: C.text },
  lokRzad: { flexDirection: 'row', gap: 8 },
  lokBtn: { flex: 1, paddingVertical: 12, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center' },
  lokBtnOn: { borderColor: C.text, backgroundColor: C.text },
  lokTxt: { fontFamily: Fonts.regular, fontSize: 13, color: C.text2 },
  lokTxtOn: { color: '#fff', fontFamily: Fonts.semibold },
  atrSiatka: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  kafelekRama: { flexBasis: '48%', flexGrow: 1, borderRadius: Size.rs + 2, borderWidth: 2, borderColor: 'transparent' },
  kafelek: { flexGrow: 1, borderRadius: Size.rs, paddingVertical: 12, paddingHorizontal: 11, borderWidth: 3, borderColor: 'transparent', minHeight: 50, justifyContent: 'center' },
  kafelekTxt: { color: '#fff', fontFamily: Fonts.semibold, fontSize: 12, paddingRight: 12 },
  ck: { position: 'absolute', top: 4, right: 7, color: '#fff', fontSize: 13 },
  dodatkiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 15, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: Size.rs },
  dodatkiTxt: { fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  licznik: { fontFamily: Fonts.medium, fontSize: 11, color: '#fff', backgroundColor: C.text, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8, overflow: 'hidden' },
  anuluj: { marginTop: 10, minHeight: 48, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  anulujTxt: { fontFamily: Fonts.semibold, fontSize: 14, color: C.text },
});
