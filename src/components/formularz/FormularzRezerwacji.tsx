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
import { Ikona, type NazwaIkony } from '../ui/Ikona';
import { useKomunikaty } from '../ui/Komunikaty';
import { PoleLiczby } from '../ui/Numpad';
import { Pole } from '../ui/Pola';
import { Przelacznik } from '../ui/Przelacznik';
import { PrzyciskGlowny } from '../ui/Przyciski';
import { WyborDaty, WyborDodatkow, WyborGodziny, WyborLokalizacji } from './Wybory';

/**
 * Dodawanie / edycja / kopia rezerwacji (pola i zasady jak renderAddForm / openEdit / kopiujRez w PWA).
 * Wygląd uzgodniony z Michałem 04.11: cały ekran, „✕ Anuluj” u góry, „Zapisz” zawsze widoczny na dole, pola w grupach.
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
      <Arkusz
        widoczny={otwarte}
        onZamknij={zamknijPytaj}
        tytul={tytulFormularza(tryb, s.lokalizacja)}
        nazwa={'formularz-' + tryb.rodzaj}
        pelnyEkran={{
          tlo: C.bg,
          lewo: (
            <Pressable onPress={zamknijPytaj} hitSlop={8} style={({ pressed }) => [styles.anulujGora, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <Ikona nazwa="close" rozmiar={18} />
              <Text style={styles.anulujGoraTxt}>Anuluj</Text>
            </Pressable>
          ),
          prawo: null,
        }}
        stopka={<PrzyciskGlowny tekst={tryb.rodzaj === 'edycja' ? 'Zapisz zmiany' : 'Zapisz rezerwację'} onPress={zapisz} trwa={trwa} ponow={ponow} style={{ backgroundColor: C.green }} />}>
        <Grupa tytul="Klient">
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
        </Grupa>

        <Grupa tytul="Termin i grupa">
          <View style={styles.wiersz}>
            <Ikona nazwa="calendar-outline" rozmiar={19} kolor={C.text2} />
            <Text style={styles.wierszTxt}>Data *</Text>
            <PrzyciskDaty etykieta="DATA" wartosc={s.data ? krotkaData(s.data) : 'Wybierz'} wypelniony={!!s.data} bledny={bledy === 'Wybierz datę'} onPress={() => setOkienko('data')} szeroki />
          </View>
          <View style={styles.wiersz}>
            <Ikona nazwa="time-outline" rozmiar={19} kolor={C.text2} />
            <Text style={styles.wierszTxt}>Godzina</Text>
            <PrzyciskDaty etykieta="OD" wartosc={s.od ?? '--:--'} wypelniony={!!s.od} bledny={bledy === 'Wybierz godzinę rozpoczęcia'} onPress={() => setOkienko('od')} />
            <PrzyciskDaty etykieta="DO" wartosc={s.do ?? '--:--'} wypelniony={!!s.do} bledny={!!bledy?.startsWith('Godzina zakończenia')} onPress={() => setOkienko('do')} />
          </View>
          <View style={[styles.wiersz, { borderBottomWidth: 0 }]}>
            <Ikona nazwa="people-outline" rozmiar={19} kolor={C.text2} />
            <Text style={styles.wierszTxt}>Liczba osób *</Text>
            <View style={{ width: 110 }}>
              <PoleLiczby value={s.osoby} onChange={(t) => zmien({ osoby: t })} placeholder="np. 12" tytul="Liczba osób" />
            </View>
          </View>
        </Grupa>

        {pokazLokalizacje ? (
          <Grupa tytul="Lokalizacja">
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
          </Grupa>
        ) : null}

        <Text style={styles.grupaTytul}>ATRAKCJA *</Text>
        <View style={[styles.atrSiatka, { marginBottom: 16 }]}>
          {atrakcje.map((a) => (
            <Kafelek key={a.id} a={a} wybrany={s.atrakcjaId === a.id} onPress={() => zmien({ atrakcjaId: a.id })} />
          ))}
        </View>

        <Grupa tytul="Status">
          <Przelacznik kolor="niebieski" wlaczony={s.potwierdzona} napisWl="Rezerwacja potwierdzona" napisWyl="Niepotwierdzona" onPress={() => zmien({ potwierdzona: !s.potwierdzona })} />
          <Przelacznik wlaczony={s.zadatek} napisWl="Zadatek opłacony" napisWyl="Brak zadatku" onPress={() => zmien({ zadatek: !s.zadatek })} />
        </Grupa>

        <Grupa tytul="Więcej">
          <Pressable onPress={() => setOkienko('dodatki')} style={({ pressed }) => [styles.wiersz, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Ikona nazwa="gift-outline" rozmiar={19} kolor={C.text2} />
            <Text style={styles.wierszTxt}>Dodatki</Text>
            <Text style={styles.wierszWartosc}>{s.dodatki.length ? `wybrane: ${s.dodatki.length}` : 'brak'}</Text>
            <Ikona nazwa="chevron-forward" rozmiar={18} kolor={C.text3} />
          </Pressable>
          <Rozwijane ikona="chatbox-ellipses-outline" tytul="Uwagi" wartosc={s.uwagi}>
            <Pole value={s.uwagi} onChangeText={(t) => zmien({ uwagi: t })} placeholder="np. Kawalerski, tort po grze..." multiline autoFocus={!s.uwagi} />
          </Rozwijane>
          <Rozwijane ikona="construct-outline" tytul="Instrukcje dla instruktora" wartosc={s.instrukcje} pomaranczowe ostatnie>
            <Text style={styles.dopisek}>Widoczne tylko w panelu, nie dla klienta.</Text>
            <Pole value={s.instrukcje} onChangeText={(t) => zmien({ instrukcje: t })} placeholder="np. Uwaga — dzieci poniżej 18 lat, tort o 15:00, klient płaci gotówką..." multiline autoFocus={!s.instrukcje} />
          </Rozwijane>
        </Grupa>
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

function PrzyciskDaty({ etykieta, wartosc, wypelniony, bledny, onPress, szeroki }: { etykieta: string; wartosc: string; wypelniony: boolean; bledny?: boolean; onPress: () => void; szeroki?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${etykieta}: ${wartosc}`} style={({ pressed }) => [styles.dt, szeroki && { minWidth: 140 }, wypelniony && { borderColor: C.text }, bledny && { borderColor: C.red, backgroundColor: '#fff8f8' }, pressed && { opacity: 0.8 }]}>
      <Text style={styles.dtLbl}>{etykieta}</Text>
      <Text style={styles.dtVal}>{wartosc}</Text>
    </Pressable>
  );
}

/** Grupa pól na białym tle z szarym nagłówkiem (jak w Ustawieniach). */
function Grupa({ tytul, children }: { tytul: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.grupaTytul}>{tytul.toUpperCase()}</Text>
      <View style={styles.grupa}>{children}</View>
    </View>
  );
}

/** Wiersz, który po dotknięciu pokazuje pole (Uwagi, Instrukcje) — wypełnione są od razu rozwinięte. */
function Rozwijane({
  ikona,
  tytul,
  wartosc,
  pomaranczowe,
  ostatnie,
  children,
}: {
  ikona: NazwaIkony;
  tytul: string;
  wartosc: string;
  pomaranczowe?: boolean;
  ostatnie?: boolean;
  children: React.ReactNode;
}) {
  const [otwarte, setOtwarte] = useState(!!wartosc.trim());
  const kolor = pomaranczowe ? C.pomarancz : C.text;
  return (
    <View style={[!ostatnie && styles.kreska]}>
      <Pressable onPress={() => setOtwarte((o) => !o)} style={({ pressed }) => [styles.wiersz, { borderBottomWidth: 0 }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityState={{ expanded: otwarte }}>
        <Ikona nazwa={ikona} rozmiar={19} kolor={pomaranczowe ? C.pomarancz : C.text2} />
        <Text style={[styles.wierszTxt, { color: kolor }]}>{tytul}</Text>
        <Ikona nazwa={otwarte ? 'chevron-up' : 'chevron-forward'} rozmiar={18} kolor={C.text3} />
      </Pressable>
      {otwarte ? <View style={{ paddingBottom: 12, gap: 6 }}>{children}</View> : null}
    </View>
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
  grupaTytul: { fontFamily: Fonts.semibold, fontSize: 11, color: C.text2, letterSpacing: 0.6, paddingHorizontal: 4, paddingBottom: 6 },
  grupa: { backgroundColor: C.surface, borderRadius: Size.radius, paddingHorizontal: 14, paddingVertical: 8, gap: 10 },
  wiersz: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderBottomWidth: 1, borderBottomColor: C.border },
  wierszTxt: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, color: C.text },
  wierszWartosc: { fontFamily: Fonts.regular, fontSize: 13, color: C.text2 },
  kreska: { borderBottomWidth: 1, borderBottomColor: C.border },
  dopisek: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2 },
  anulujGora: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, borderRadius: Size.rs, paddingVertical: 9, paddingHorizontal: 12 },
  anulujGoraTxt: { fontFamily: Fonts.semibold, fontSize: 15, color: C.text },
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
});
