import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { C, Fonts, Size } from '@/constants/theme';
import { czytajPamiec, zapiszPamiec } from '@/db/baza';
import { dataZRokiem, dzisStr } from '@/logika/daty';
import { komunikatBledu, toBrakSieci } from '@/logika/klient';
import type { Wynajem } from '@/logika/typy';
import {
  bladWynajmu,
  daneWynajmu,
  filtrujWynajmy,
  kwotaZl,
  moznaZmieniacWynajem,
  nowyWynajem,
  statusWynajmu,
  tekstSprzetu,
  wynajemDoEdycji,
  zmienIlosc,
  type FiltrMarki,
  type FiltrStatusu,
  type StanWynajmu,
} from '@/logika/wynajem';
import { klient } from '@/stan/klient';
import { useDane } from '@/stan/DaneProvider';
import { zglos } from '@/stan/zglos';

import { WyborDaty } from '../formularz/Wybory';
import { usePodstronaArkusza } from '../ui/Arkusz';
import { useKomunikaty } from '../ui/Komunikaty';
import { PoleLiczby } from '../ui/Numpad';
import { Etykieta, Pole, Sekcja } from '../ui/Pola';
import { Przelacznik } from '../ui/Przelacznik';
import { PrzyciskGlowny } from '../ui/Przyciski';

type Widok = { rodzaj: 'lista' } | { rodzaj: 'nowy' } | { rodzaj: 'edycja'; w: Wynajem };

/**
 * Wynajem sprzętu (arkusz sh-wynajem z PWA): lista z filtrami, dodawanie, edycja, „✓ Zwrócono”, usuwanie, 📤 obrazek.
 * Lista pobierana w całości i zapisywana w telefonie — filtry działają od razu i bez zasięgu.
 */
export function WynajemSprzetu() {
  const db = useSQLiteContext();
  const { konto } = useDane();
  const { toast, zapytaj } = useKomunikaty();
  const [lista, setLista] = useState<Wynajem[] | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
  const [status, setStatus] = useState<FiltrStatusu>('aktywne');
  const [marka, setMarka] = useState<FiltrMarki>('wszystkie');
  const [widok, setWidok] = useState<Widok>({ rodzaj: 'lista' });
  const [trwa, setTrwa] = useState<number | null>(null);
  const [doObrazka, setDoObrazka] = useState<Wynajem | null>(null);
  const obrazek = useRef<View>(null);

  const uzytkownik = konto?.uzytkownik;
  const sprzetLista = konto?.ustawienia.sprzet_wynajem ?? [];

  const pobierz = useCallback(async () => {
    try {
      const j = await klient<{ wynajmy: Wynajem[] }>('wynajmy', { parametry: { status: 'wszystkie', marka: 'wszystkie' } });
      setLista(j.wynajmy);
      setBlad(null);
      await zapiszPamiec(db, 'wynajmy', j.wynajmy);
    } catch (e) {
      setBlad(komunikatBledu(e));
      if (!toBrakSieci(e)) zglos(e, { dopisek: 'Wynajem' });
    }
  }, [db]);

  useEffect(() => {
    czytajPamiec<Wynajem[]>(db, 'wynajmy')
      .then((p) => p && setLista((l) => l ?? p.wartosc))
      .catch(() => {})
      .finally(() => pobierz());
  }, [db, pobierz]);

  const podmien = (w: Wynajem) => setLista((l) => (l ? (l.some((x) => x.id === w.id) ? l.map((x) => (x.id === w.id ? w : x)) : [w, ...l]) : [w]));

  const zwroc = (w: Wynajem) =>
    zapytaj({
      tytul: 'Oznaczyć jako zwrócony?',
      tekst: `${w.klient_imie_nazwisko} · ${tekstSprzetu(w.sprzet) || 'sprzęt'}`,
      ok: '✓ Zwrócono',
      onOk: async () => {
        setTrwa(w.id);
        try {
          const j = await klient<{ wynajem: Wynajem }>('wynajem_zwroc', { body: { id: w.id } });
          podmien(j.wynajem);
          toast('✓ Zwrócony');
        } catch (e) {
          toast('❌ ' + komunikatBledu(e));
        } finally {
          setTrwa(null);
        }
      },
    });

  const usun = (w: Wynajem) =>
    zapytaj({
      tytul: 'Usunąć wynajem?',
      tekst: `${w.klient_imie_nazwisko} · ${w.data_wynajmu}. Tego nie da się cofnąć.`,
      ok: '🗑 Usuń',
      niebezpieczne: true,
      onOk: async () => {
        setTrwa(w.id);
        try {
          await klient('wynajem_usun', { body: { id: w.id } });
          setLista((l) => l?.filter((x) => x.id !== w.id) ?? null);
          toast('Wynajem usunięty');
        } catch (e) {
          toast('❌ ' + komunikatBledu(e));
        } finally {
          setTrwa(null);
        }
      },
    });

  // obrazek do udostępnienia: najpierw narysuj (poza ekranem), potem zrób zdjęcie
  useEffect(() => {
    if (!doObrazka) return;
    const t = setTimeout(async () => {
      try {
        const uri = await captureRef(obrazek, { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Wynajem SILT Paintball' });
      } catch (e) {
        zglos(e, { dopisek: 'Obrazek wynajmu' });
        toast('❌ Nie udało się przygotować obrazka');
      } finally {
        setDoObrazka(null);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [doObrazka, toast]);

  if (!uzytkownik) return null;

  if (widok.rodzaj !== 'lista') {
    return (
      <FormularzWynajmu
        edycja={widok.rodzaj === 'edycja' ? widok.w : null}
        sprzetLista={sprzetLista}
        onWroc={() => setWidok({ rodzaj: 'lista' })}
        onZapisano={(w, nowy) => {
          podmien(w);
          setWidok({ rodzaj: 'lista' });
          toast(nowy ? '✅ Wynajem zapisany!' : '✅ Zapisano!');
        }}
      />
    );
  }

  const moze = uzytkownik.rola !== 'podglad';
  const widoczne = lista ? filtrujWynajmy(lista, status, marka) : [];

  return (
    <View>
      <View style={styles.filtry}>
        {(
          [
            ['aktywne', 'Aktywne'],
            ['zwrocone', 'Zwrócone'],
            ['wszystkie', 'Wszystkie'],
          ] as const
        ).map(([f, n]) => (
          <Chip key={f} tekst={n} aktywny={status === f} kolor={C.green} onPress={() => setStatus(f)} />
        ))}
        {moze ? (
          <Pressable onPress={() => setWidok({ rodzaj: 'nowy' })} style={({ pressed }) => [styles.dodaj, pressed && { opacity: 0.8 }]}>
            <Text style={styles.dodajTxt}>+ Dodaj</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.filtry}>
        {(
          [
            ['wszystkie', 'Wszystkie'],
            ['silt', 'SILT'],
            ['arsenal', 'Arsenał'],
          ] as const
        ).map(([f, n]) => (
          <Chip key={f} tekst={n} aktywny={marka === f} kolor={C.text} onPress={() => setMarka(f)} />
        ))}
      </View>

      {blad ? <Text style={styles.blad}>⚠️ {blad}{lista ? ' Pokazuję ostatnio pobrane.' : ''}</Text> : null}
      {lista === null && !blad ? <Text style={styles.pusto}>Ładowanie...</Text> : null}
      {lista && widoczne.length === 0 ? <Text style={styles.pusto}>Brak wynajmów</Text> : null}

      {widoczne.map((w) => {
        const st = statusWynajmu(w);
        const zmiana = moznaZmieniacWynajem(w, uzytkownik.marka, uzytkownik.rola);
        const sprzet = tekstSprzetu(w.sprzet);
        return (
          <View key={w.id} style={styles.pozycja}>
            <View style={styles.gora}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nazwa}>
                  {w.klient_imie_nazwisko}{' '}
                  <Text style={[styles.marka, w.marka === 'arsenal' ? styles.markaA : styles.markaS]}> {w.marka === 'arsenal' ? 'Arsenał' : 'SILT'} </Text>
                </Text>
                <Text style={styles.tel}>{w.klient_telefon}</Text>
              </View>
              <Text style={[styles.status, { backgroundColor: st.tlo, color: st.kolor }]}>{st.tekst}</Text>
            </View>
            <Text style={styles.daty}>
              📅 Wynajem: {w.data_wynajmu}
              {w.data_zwrotu ? ' · Zwrot: ' + w.data_zwrotu : ''}
            </Text>
            {sprzet ? <Text style={styles.sprzet}>{sprzet}</Text> : null}
            <View style={styles.dol}>
              <Text style={styles.kwota}>
                <Text style={{ color: C.text2 }}>Kwota: </Text>
                <Text style={{ fontFamily: Fonts.semibold }}>{kwotaZl(w.kwota)}</Text>
                {w.zaplacono ? <Text style={styles.zaplacono}> ✅ Zapłacono</Text> : <Text style={styles.niezaplacono}> ⏳ Nieopłacony</Text>}
              </Text>
            </View>
            <View style={styles.akcje}>
              {zmiana && !w.zwrocono ? <Maly tekst="✓ Zwrócono" tlo="#e8f5e9" kolor={C.green} ramka="#a5d6a7" onPress={() => zwroc(w)} wylaczony={trwa === w.id} /> : null}
              {zmiana ? <Maly tekst="✏️ Edytuj" tlo="#fff3e0" kolor={C.pomarancz} ramka="#ffcc80" onPress={() => setWidok({ rodzaj: 'edycja', w })} /> : null}
              <Maly tekst="📤" tlo="#e3f2fd" kolor="#1565c0" ramka="#90caf9" onPress={() => setDoObrazka(w)} wylaczony={!!doObrazka} opis="Udostępnij" />
              {zmiana ? <Maly tekst="🗑" tlo={C.redL} kolor={C.red} ramka="#f5c0bb" onPress={() => usun(w)} wylaczony={trwa === w.id} opis="Usuń" /> : null}
            </View>
            {w.uwagi ? <Text style={styles.uwagi}>💬 {w.uwagi}</Text> : null}
          </View>
        );
      })}

      {doObrazka ? <ObrazekWynajmu ref={obrazek} w={doObrazka} /> : null}
    </View>
  );
}

function Chip({ tekst, aktywny, kolor, onPress }: { tekst: string; aktywny: boolean; kolor: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected: aktywny }} style={[styles.chip, aktywny && { backgroundColor: kolor, borderColor: kolor }]}>
      <Text style={[styles.chipTxt, aktywny && { color: '#fff' }]}>{tekst}</Text>
    </Pressable>
  );
}

function Maly({ tekst, tlo, kolor, ramka, onPress, wylaczony, opis }: { tekst: string; tlo: string; kolor: string; ramka: string; onPress: () => void; wylaczony?: boolean; opis?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={wylaczony}
      accessibilityLabel={opis ?? tekst}
      style={({ pressed }) => [styles.maly, { backgroundColor: tlo, borderColor: ramka, opacity: wylaczony ? 0.5 : pressed ? 0.75 : 1 }]}>
      <Text style={[styles.malyTxt, { color: kolor }]}>{tekst}</Text>
    </Pressable>
  );
}

/** Obrazek wynajmu do wysłania — zielony nagłówek #00FF7F jak w PWA. */
const ObrazekWynajmu = ({ ref, w }: { ref: React.Ref<View>; w: Wynajem }) => (
  <View style={styles.pozaEkranem} pointerEvents="none">
    <View ref={ref} collapsable={false} style={styles.obrKarta}>
      <View style={styles.obrHdr}>
        <Text style={styles.obrZrodlo}>SILT PAINTBALL · WYNAJEM SPRZĘTU</Text>
        <Text style={styles.obrNazwa}>{w.klient_imie_nazwisko}</Text>
        <Text style={styles.obrTel}>{w.klient_telefon}</Text>
      </View>
      <View style={styles.obrTresc}>
        {[
          ['📅 Wynajem', w.data_wynajmu],
          ...(w.data_zwrotu ? [['🔄 Zwrot', w.data_zwrotu]] : []),
          ['🎯 Sprzęt', tekstSprzetu(w.sprzet, ', ') || '—'],
          ['💵 Kwota', kwotaZl(w.kwota)],
          ...(w.uwagi ? [['💬 Uwagi', w.uwagi]] : []),
        ].map(([a, b], i) => (
          <View key={i} style={[styles.obrWiersz, i > 0 && { borderTopWidth: 0.5, borderTopColor: '#eee' }]}>
            <Text style={styles.obrEt}>{a}</Text>
            <Text style={[styles.obrWart, a === '💵 Kwota' && { fontWeight: '600' }]}>{b}</Text>
          </View>
        ))}
        <Text style={styles.obrStopka}>paintball.silt.pl · 503 41 41 75</Text>
      </View>
    </View>
  </View>
);

/** Formularz wynajmu (renderWynajemForm / renderWynajemEdit): ← wróć, dane, termin, sprzęt − / +, płatność, faktura, uwagi. */
function FormularzWynajmu({
  edycja,
  sprzetLista,
  onWroc,
  onZapisano,
}: {
  edycja: Wynajem | null;
  sprzetLista: string[];
  onWroc: () => void;
  onZapisano: (w: Wynajem, nowy: boolean) => void;
}) {
  const { toast, zapytaj, pasekBledu } = useKomunikaty();
  const [poczatek] = useState<StanWynajmu>(() => (edycja ? wynajemDoEdycji(edycja) : nowyWynajem(dzisStr())));
  const [s, setS] = useState<StanWynajmu>(poczatek);
  const [data, setData] = useState<null | 'wynajem' | 'zwrot'>(null);
  const [trwa, setTrwa] = useState(false);
  const [ponow, setPonow] = useState(false);
  const zmien = (z: Partial<StanWynajmu>) => setS((p) => ({ ...p, ...z }));
  // sprzęt spoza listy (np. dopisany kiedyś w PWA) też pokazujemy
  const pozycje = [...sprzetLista, ...Object.keys(s.sprzet).filter((n) => !sprzetLista.includes(n))];

  const wroc = () => {
    if (JSON.stringify(s) === JSON.stringify(poczatek)) return onWroc();
    zapytaj({ tytul: 'Wyjść bez zapisywania?', tekst: 'Wpisane dane zostaną utracone.', ok: 'Wyjdź', niebezpieczne: true, onOk: onWroc });
  };
  usePodstronaArkusza(wroc);

  const zapisz = async () => {
    const b = bladWynajmu(s);
    if (b) return toast('❌ ' + b);
    setTrwa(true);
    try {
      const j = await klient<{ wynajem: Wynajem }>(edycja ? 'wynajem_edytuj' : 'wynajem_dodaj', { body: daneWynajmu(s, edycja?.id) });
      pasekBledu(null);
      onZapisano(j.wynajem, !edycja);
    } catch (e) {
      setPonow(true);
      pasekBledu('❌ ' + komunikatBledu(e) + ' Dane są zachowane — spróbuj ponownie.');
    } finally {
      setTrwa(false);
    }
  };

  return (
    <View>
      <Pressable onPress={wroc} style={styles.wroc} accessibilityRole="button" accessibilityLabel="Wróć do listy">
        <Text style={styles.wrocStrzalka}>←</Text>
        <Text style={styles.wrocTxt}>{edycja ? `Edytuj wynajem #${edycja.id}` : 'Nowy wynajem'}</Text>
      </Pressable>

      <Sekcja tytul="Dane klienta">
        <Pole etykieta="Imię i nazwisko *" value={s.imie} onChangeText={(t) => zmien({ imie: t })} placeholder="Jan Kowalski" autoCapitalize="words" />
        <Pole etykieta="Telefon *" value={s.telefon} onChangeText={(t) => zmien({ telefon: t })} placeholder="501 234 567" keyboardType="phone-pad" />
      </Sekcja>

      <Sekcja tytul="Termin">
        <View style={styles.dwa}>
          <View style={{ flex: 1, gap: 5 }}>
            <Etykieta tekst="Data wynajmu *" />
            <PrzyciskPola tekst={s.dataWynajmu ? dataZRokiem(s.dataWynajmu) : 'Wybierz'} onPress={() => setData('wynajem')} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Etykieta tekst="Planowany zwrot" />
            <PrzyciskPola tekst={s.dataZwrotu ? dataZRokiem(s.dataZwrotu) : '—'} onPress={() => setData('zwrot')} />
          </View>
        </View>
        {s.dataZwrotu ? (
          <Pressable onPress={() => zmien({ dataZwrotu: null })} hitSlop={8}>
            <Text style={styles.link}>Usuń datę zwrotu</Text>
          </Pressable>
        ) : null}
      </Sekcja>

      <Sekcja tytul="Sprzęt">
        <View>
          {pozycje.map((n) => (
            <View key={n} style={styles.sprzetWiersz}>
              <Text style={styles.sprzetNazwa}>{n}</Text>
              <View style={styles.licznik}>
                <Pressable onPress={() => zmien({ sprzet: zmienIlosc(s.sprzet, n, -1) })} style={styles.pm} accessibilityLabel={`Mniej: ${n}`} hitSlop={6}>
                  <Text style={styles.pmTxt}>−</Text>
                </Pressable>
                <Text style={[styles.ile, !s.sprzet[n] && { color: C.text3 }]}>{s.sprzet[n] ?? 0}</Text>
                <Pressable onPress={() => zmien({ sprzet: zmienIlosc(s.sprzet, n, 1) })} style={styles.pm} accessibilityLabel={`Więcej: ${n}`} hitSlop={6}>
                  <Text style={styles.pmTxt}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </Sekcja>

      <Sekcja tytul="Płatność">
        <View style={{ gap: 5 }}>
          <Etykieta tekst="Kwota (zł)" />
          <PoleLiczby value={s.kwota} onChange={(t) => zmien({ kwota: t })} tytul="Kwota (zł)" ulamki />
        </View>
        <View style={{ gap: 5 }}>
          <Etykieta tekst="Forma płatności" />
          <View style={styles.dwa}>
            {(['Gotówka', 'Przelew', 'Karta'] as const).map((p) => (
              <Pressable key={p} onPress={() => zmien({ platnosc: p })} style={[styles.platnosc, s.platnosc === p && styles.platnoscOn]} accessibilityState={{ selected: s.platnosc === p }}>
                <Text style={[styles.platnoscTxt, s.platnosc === p && { color: '#fff', fontFamily: Fonts.semibold }]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Przelacznik wlaczony={s.zaplacono} napisWl="Zapłacono" napisWyl="Nie zapłacono" onPress={() => zmien({ zaplacono: !s.zaplacono })} />
        {edycja ? <Przelacznik wlaczony={s.zwrocono} napisWl="Zwrócono" napisWyl="Nie zwrócono" onPress={() => zmien({ zwrocono: !s.zwrocono })} /> : null}
      </Sekcja>

      {!edycja ? (
        <Sekcja tytul="Dane do faktury" dopisek="(opcjonalne)">
          <Pole etykieta="Nazwa firmy / Imię i nazwisko" value={s.fakturaNazwa} onChangeText={(t) => zmien({ fakturaNazwa: t })} placeholder="ACME Sp. z o.o." />
          <Pole etykieta="NIP" value={s.fakturaNip} onChangeText={(t) => zmien({ fakturaNip: t })} placeholder="123-456-78-90" keyboardType="phone-pad" />
          <Pole
            etykieta="E-mail do faktury"
            value={s.fakturaEmail}
            onChangeText={(t) => zmien({ fakturaEmail: t })}
            placeholder="faktury@firma.pl"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Sekcja>
      ) : null}

      <Sekcja tytul="Uwagi">
        <Pole value={s.uwagi} onChangeText={(t) => zmien({ uwagi: t })} placeholder="Dodatkowe informacje..." multiline />
      </Sekcja>

      <PrzyciskGlowny tekst={edycja ? 'Zapisz zmiany' : 'Zapisz wynajem'} onPress={zapisz} trwa={trwa} ponow={ponow} style={{ backgroundColor: ponow ? undefined : C.green }} />
      <Pressable onPress={wroc} style={({ pressed }) => [styles.anuluj, pressed && { opacity: 0.7 }]}>
        <Text style={styles.anulujTxt}>Anuluj</Text>
      </Pressable>

      <WyborDaty
        widoczny={!!data}
        wybrana={data === 'zwrot' ? s.dataZwrotu ?? s.dataWynajmu : s.dataWynajmu}
        onWybierz={(ds) => {
          zmien(data === 'zwrot' ? { dataZwrotu: ds } : { dataWynajmu: ds });
          setData(null);
        }}
        onZamknij={() => setData(null)}
      />
    </View>
  );
}

const PrzyciskPola = ({ tekst, onPress }: { tekst: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.przyciskPola, pressed && { borderColor: C.text }]}>
    <Text style={styles.przyciskPolaTxt}>{tekst}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  filtry: { flexDirection: 'row', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bg },
  chipTxt: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2 },
  dodaj: { marginLeft: 'auto', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, backgroundColor: C.green },
  dodajTxt: { color: '#fff', fontFamily: Fonts.semibold, fontSize: 12 },
  blad: { fontFamily: Fonts.medium, fontSize: 12, color: C.pomarancz, paddingVertical: 10 },
  pusto: { textAlign: 'center', color: C.text3, fontSize: 14, fontFamily: Fonts.regular, paddingVertical: 32 },
  pozycja: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  gora: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  nazwa: { fontFamily: Fonts.semibold, fontSize: 14, color: C.text },
  marka: { fontFamily: Fonts.bold, fontSize: 9 },
  markaS: { backgroundColor: '#e8f5e9', color: C.green },
  markaA: { backgroundColor: '#e3f2fd', color: '#1565c0' },
  tel: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2 },
  status: { fontFamily: Fonts.bold, fontSize: 10, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, overflow: 'hidden' },
  daty: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2, marginBottom: 4 },
  sprzet: { fontFamily: Fonts.regular, fontSize: 12, color: C.text, marginBottom: 4 },
  dol: { flexDirection: 'row', alignItems: 'center' },
  kwota: { fontFamily: Fonts.regular, fontSize: 13, color: C.text },
  zaplacono: { color: C.green, fontSize: 11 },
  niezaplacono: { color: C.pomarancz, fontSize: 11 },
  akcje: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  maly: { minHeight: 38, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 6, borderWidth: 0.5, justifyContent: 'center' },
  malyTxt: { fontFamily: Fonts.semibold, fontSize: 12 },
  uwagi: { fontFamily: Fonts.regular, fontSize: 11, color: C.text2, marginTop: 6 },
  wroc: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  wrocStrzalka: { fontSize: 20, color: C.text2, paddingRight: 4 },
  wrocTxt: { fontFamily: Fonts.semibold, fontSize: 16, color: C.text },
  dwa: { flexDirection: 'row', gap: 8 },
  przyciskPola: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 15 },
  przyciskPolaTxt: { fontFamily: Fonts.regular, fontSize: 15, color: C.text },
  link: { fontFamily: Fonts.medium, fontSize: 13, color: C.text2, textDecorationLine: 'underline' },
  sprzetWiersz: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  sprzetNazwa: { fontFamily: Fonts.regular, fontSize: 14, color: C.text, flex: 1 },
  licznik: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pm: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  pmTxt: { fontSize: 20, color: C.text, lineHeight: 22 },
  ile: { width: 34, textAlign: 'center', fontFamily: Fonts.semibold, fontSize: 15, color: C.text },
  platnosc: { flex: 1, paddingVertical: 12, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center' },
  platnoscOn: { backgroundColor: C.text, borderColor: C.text },
  platnoscTxt: { fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  anuluj: { marginTop: 10, marginBottom: 10, minHeight: 48, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  anulujTxt: { fontFamily: Fonts.semibold, fontSize: 14, color: C.text },
  pozaEkranem: { position: 'absolute', left: -10000, top: 0 },
  obrKarta: { width: 360, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  obrHdr: { backgroundColor: '#00FF7F', paddingTop: 18, paddingHorizontal: 20, paddingBottom: 14 },
  obrZrodlo: { fontSize: 11, color: 'rgba(26,26,26,0.7)', marginBottom: 4 },
  obrNazwa: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  obrTel: { fontSize: 13, color: 'rgba(26,26,26,0.8)' },
  obrTresc: { paddingVertical: 14, paddingHorizontal: 18 },
  obrWiersz: { flexDirection: 'row', paddingVertical: 5 },
  obrEt: { width: 120, fontSize: 13, color: '#888' },
  obrWart: { flex: 1, fontSize: 13, color: '#1a1a1a' },
  obrStopka: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 10, paddingTop: 8, textAlign: 'center', fontSize: 11, color: '#999' },
});
