import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import { czytajPamiec, zapiszPamiec } from '@/db/baza';
import { dataZRokiem, dzisStr } from '@/logika/daty';
import { komunikatBledu, toBrakSieci } from '@/logika/klient';
import type { Osoba, Zadanie } from '@/logika/typy';
import { bladZadania, daneZadania, noweZadanie, podzielZadania, wygladPriorytetu, type Priorytet, type StanZadania } from '@/logika/zadania';
import { useDane } from '@/stan/DaneProvider';
import { klient } from '@/stan/klient';
import { zglos } from '@/stan/zglos';

import { WyborDaty } from '../formularz/Wybory';
import { usePodstronaArkusza } from '../ui/Arkusz';
import { useKomunikaty } from '../ui/Komunikaty';
import { Etykieta, Pole } from '../ui/Pola';
import { PrzyciskGlowny } from '../ui/Przyciski';

type Pamiec = { osoby: Osoba[]; zadania: Zadanie[] };

/**
 * Zadania (arkusz sh-zadania z PWA): zakładki z osobami, „+ Dodaj”, lista wg priorytetu, kółko = wykonane, 🗑.
 * Pobieramy zadania wszystkich osób naraz i trzymamy w telefonie — zakładki przełączają się od razu i bez zasięgu.
 */
export function Zadania() {
  const db = useSQLiteContext();
  const { konto, odswiez } = useDane();
  const { toast, zapytaj } = useKomunikaty();
  const [dane, setDane] = useState<Pamiec | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
  const [osoba, setOsoba] = useState<number | null>(null);
  const [formularz, setFormularz] = useState(false);
  const [trwa, setTrwa] = useState<number | null>(null);

  const pobierz = useCallback(async () => {
    try {
      const [o, z] = await Promise.all([
        klient<{ uzytkownicy: Osoba[] }>('uzytkownicy'),
        klient<{ zadania: Zadanie[] }>('zadania', { parametry: { dla_kogo: 0 } }),
      ]);
      const nowe = { osoby: o.uzytkownicy, zadania: z.zadania };
      setDane(nowe);
      setBlad(null);
      await zapiszPamiec(db, 'zadania', nowe);
    } catch (e) {
      setBlad(komunikatBledu(e));
      if (!toBrakSieci(e)) zglos(e, { dopisek: 'Zadania' });
    }
  }, [db]);

  useEffect(() => {
    czytajPamiec<Pamiec>(db, 'zadania')
      .then((p) => p && setDane((d) => d ?? p.wartosc))
      .catch(() => {})
      .finally(() => pobierz());
  }, [db, pobierz]);

  // jak w PWA: na start pierwsza osoba z listy
  const aktywna = osoba ?? dane?.osoby[0]?.id ?? null;

  const poZmianie = async () => {
    await pobierz();
    odswiez(); // licznik zadań na przycisku 📋
  };

  const przelacz = async (z: Zadanie) => {
    setTrwa(z.id);
    // od razu na ekranie, serwer potwierdza w tle
    setDane((d) => d && { ...d, zadania: d.zadania.map((x) => (x.id === z.id ? { ...x, wykonane: !z.wykonane } : x)) });
    try {
      await klient('zadanie_wykonane', { body: { id: z.id, wykonane: !z.wykonane } });
      await poZmianie();
    } catch (e) {
      setDane((d) => d && { ...d, zadania: d.zadania.map((x) => (x.id === z.id ? z : x)) });
      toast('❌ ' + komunikatBledu(e));
    } finally {
      setTrwa(null);
    }
  };

  const usun = (z: Zadanie) =>
    zapytaj({
      tytul: 'Usunąć zadanie?',
      tekst: z.tytul,
      ok: '🗑 Usuń',
      niebezpieczne: true,
      onOk: async () => {
        setTrwa(z.id);
        try {
          await klient('zadanie_usun', { body: { id: z.id } });
          setDane((d) => d && { ...d, zadania: d.zadania.filter((x) => x.id !== z.id) });
          toast('Zadanie usunięte');
          await poZmianie();
        } catch (e) {
          toast('❌ ' + komunikatBledu(e));
        } finally {
          setTrwa(null);
        }
      },
    });

  if (!konto) return null;

  if (formularz && dane) {
    return (
      <FormularzZadania
        osoby={dane.osoby}
        dlaKogo={aktywna}
        onWroc={() => setFormularz(false)}
        onZapisano={async (dla) => {
          setOsoba(dla);
          setFormularz(false);
          toast('✅ Zadanie dodane!');
          await poZmianie();
        }}
      />
    );
  }

  const zadaniaOsoby = dane ? dane.zadania.filter((z) => z.dla_kogo === aktywna) : [];
  const { aktywne, wykonane } = podzielZadania(zadaniaOsoby);

  return (
    <View>
      <View style={styles.zakladki}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          {(dane?.osoby ?? []).map((o) => {
            const on = o.id === aktywna;
            return (
              <Pressable key={o.id} onPress={() => setOsoba(o.id)} style={[styles.zakladka, on && styles.zakladkaOn]} accessibilityState={{ selected: on }}>
                <Text style={[styles.zakladkaTxt, on && styles.zakladkaTxtOn]}>{o.imie}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {dane ? (
          <Pressable onPress={() => setFormularz(true)} style={({ pressed }) => [styles.dodaj, pressed && { opacity: 0.8 }]}>
            <Text style={styles.dodajTxt}>+ Dodaj</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.lista}>
        {blad ? (
          <Text style={styles.blad}>
            ⚠️ {blad}
            {dane ? ' Pokazuję ostatnio pobrane.' : ''}
          </Text>
        ) : null}
        {!dane && !blad ? <Text style={styles.pusto}>Ładowanie...</Text> : null}
        {dane && !aktywne.length && !wykonane.length ? <Text style={styles.pusto}>Brak zadań</Text> : null}

        {aktywne.map((z) => {
          const k = wygladPriorytetu(z.priorytet);
          return (
            <View key={z.id} style={[styles.karta, { backgroundColor: k.tlo, borderColor: k.ramka }]}>
              <View style={styles.gora}>
                <Pressable
                  onPress={() => przelacz(z)}
                  disabled={trwa === z.id}
                  hitSlop={10}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: false }}
                  accessibilityLabel={`Oznacz jako wykonane: ${z.tytul}`}
                  style={[styles.kolko, { borderColor: k.znaczek }]}
                />
                <Text style={[styles.tytul, { color: k.tekst }]}>{z.tytul}</Text>
                <Text style={[styles.znaczek, { backgroundColor: k.znaczek }]}>{k.etykieta}</Text>
              </View>
              {z.opis ? <Text style={[styles.opis, { color: k.tekst }]}>{z.opis}</Text> : null}
              <View style={styles.dol}>
                <Text style={[styles.info, { color: k.tekst }]}>
                  {z.termin ? `⏰ Do: ${z.termin}` : ''}
                  {z.termin ? '  ·  ' : ''}Od: {z.od_imie}
                </Text>
                <Pressable onPress={() => usun(z)} disabled={trwa === z.id} hitSlop={8} accessibilityLabel="Usuń zadanie" style={styles.kosz}>
                  <Text style={styles.koszTxt}>🗑</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {wykonane.length ? <Text style={styles.wykonaneNaglowek}>Wykonane ({wykonane.length})</Text> : null}
        {wykonane.map((z) => (
          <View key={z.id} style={[styles.karta, styles.kartaWyk]}>
            <View style={[styles.gora, { marginBottom: 0, alignItems: 'center' }]}>
              <Pressable
                onPress={() => przelacz(z)}
                disabled={trwa === z.id}
                hitSlop={10}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: true }}
                accessibilityLabel={`Przywróć zadanie: ${z.tytul}`}
                style={[styles.kolko, styles.kolkoWyk]}>
                <Text style={styles.ptaszek}>✓</Text>
              </Pressable>
              <Text style={styles.tytulWyk}>{z.tytul}</Text>
              <Pressable onPress={() => usun(z)} disabled={trwa === z.id} hitSlop={8} accessibilityLabel="Usuń zadanie" style={styles.kosz}>
                <Text style={styles.koszTxt}>🗑</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const PRIORYTETY: [Priorytet, string][] = [
  ['normalne', 'Normalne'],
  ['wazne', 'Ważne'],
  ['pilne', 'Pilne'],
];

/** Nowe zadanie (renderZadaniaForm): dla kogo, tytuł, priorytet, do kiedy, opis. */
function FormularzZadania({
  osoby,
  dlaKogo,
  onWroc,
  onZapisano,
}: {
  osoby: Osoba[];
  dlaKogo: number | null;
  onWroc: () => void;
  onZapisano: (dla: number) => void;
}) {
  const { toast, zapytaj, pasekBledu } = useKomunikaty();
  const [poczatek] = useState<StanZadania>(() => noweZadanie(dlaKogo));
  const [s, setS] = useState<StanZadania>(poczatek);
  const [kalendarz, setKalendarz] = useState(false);
  const [trwa, setTrwa] = useState(false);
  const [ponow, setPonow] = useState(false);
  const zmien = (z: Partial<StanZadania>) => setS((p) => ({ ...p, ...z }));

  const wroc = () => {
    if (JSON.stringify(s) === JSON.stringify(poczatek)) return onWroc();
    zapytaj({ tytul: 'Wyjść bez zapisywania?', tekst: 'Wpisane dane zostaną utracone.', ok: 'Wyjdź', niebezpieczne: true, onOk: onWroc });
  };
  usePodstronaArkusza(wroc);

  const zapisz = async () => {
    const b = bladZadania(s);
    if (b) return toast('❌ ' + b);
    setTrwa(true);
    try {
      await klient('zadanie_dodaj', { body: daneZadania(s) });
      pasekBledu(null);
      onZapisano(s.dlaKogo!);
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
        <Text style={styles.wrocTxt}>Nowe zadanie</Text>
      </Pressable>

      <View style={styles.formularz}>
        <View style={styles.grupa}>
          <Etykieta tekst="Dla kogo *" />
          <View style={styles.wybory}>
            {osoby.map((o) => (
              <Wybor key={o.id} tekst={o.imie} on={s.dlaKogo === o.id} onPress={() => zmien({ dlaKogo: o.id })} />
            ))}
          </View>
        </View>

        <Pole etykieta="Tytuł *" value={s.tytul} onChangeText={(t) => zmien({ tytul: t })} placeholder="Co trzeba zrobić?" maxLength={200} />

        <View style={styles.grupa}>
          <Etykieta tekst="Priorytet" />
          <View style={styles.wybory}>
            {PRIORYTETY.map(([p, n]) => (
              <Wybor key={p} tekst={n} on={s.priorytet === p} kolor={p === 'normalne' ? C.text : wygladPriorytetu(p).znaczek} onPress={() => zmien({ priorytet: p })} rowne />
            ))}
          </View>
        </View>

        <View style={styles.grupa}>
          <Etykieta tekst="Do kiedy" />
          <Pressable onPress={() => setKalendarz(true)} style={({ pressed }) => [styles.przyciskPola, pressed && { borderColor: C.text }]}>
            <Text style={[styles.przyciskPolaTxt, !s.termin && { color: C.text3 }]}>{s.termin ? dataZRokiem(s.termin) : 'Bez terminu'}</Text>
          </Pressable>
          {s.termin ? (
            <Pressable onPress={() => zmien({ termin: null })} hitSlop={8}>
              <Text style={styles.link}>Usuń termin</Text>
            </Pressable>
          ) : null}
        </View>

        <Pole etykieta="Opis" value={s.opis} onChangeText={(t) => zmien({ opis: t })} placeholder="Opcjonalne szczegóły..." multiline />

        <PrzyciskGlowny tekst="Zapisz zadanie" onPress={zapisz} trwa={trwa} ponow={ponow} style={{ backgroundColor: ponow ? undefined : C.green }} />
        <Pressable onPress={wroc} style={({ pressed }) => [styles.anuluj, pressed && { opacity: 0.7 }]}>
          <Text style={styles.anulujTxt}>Anuluj</Text>
        </Pressable>
      </View>

      <WyborDaty
        widoczny={kalendarz}
        wybrana={s.termin ?? dzisStr()}
        onWybierz={(ds) => {
          zmien({ termin: ds });
          setKalendarz(false);
        }}
        onZamknij={() => setKalendarz(false)}
      />
    </View>
  );
}

function Wybor({ tekst, on, onPress, kolor = C.text, rowne }: { tekst: string; on: boolean; onPress: () => void; kolor?: string; rowne?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.wybor, rowne && { flex: 1 }, on && { backgroundColor: kolor, borderColor: kolor }, pressed && !on && { borderColor: C.text }]}>
      <Text style={[styles.wyborTxt, on && { color: '#fff', fontFamily: Fonts.semibold }]}>{tekst}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zakladki: { flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: C.border },
  zakladka: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  zakladkaOn: { borderBottomColor: C.green },
  zakladkaTxt: { fontFamily: Fonts.medium, fontSize: 13, color: C.text2 },
  zakladkaTxtOn: { fontFamily: Fonts.bold, color: C.green },
  dodaj: { paddingHorizontal: 14, backgroundColor: C.green, justifyContent: 'center' },
  dodajTxt: { color: '#fff', fontFamily: Fonts.semibold, fontSize: 12 },
  lista: { paddingVertical: 10, paddingHorizontal: 12, gap: 8 },
  blad: { fontFamily: Fonts.medium, fontSize: 12, color: C.pomarancz, paddingVertical: 4 },
  pusto: { textAlign: 'center', color: C.text3, fontSize: 14, fontFamily: Fonts.regular, paddingVertical: 32 },
  karta: { borderWidth: 0.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
  kartaWyk: { backgroundColor: C.surface, borderColor: C.border, paddingVertical: 10, opacity: 0.65 },
  gora: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  kolko: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  kolkoWyk: { backgroundColor: C.green, borderColor: C.green },
  ptaszek: { color: '#fff', fontSize: 13, fontFamily: Fonts.bold, lineHeight: 15 },
  tytul: { flex: 1, fontFamily: Fonts.semibold, fontSize: 14, paddingTop: 3 },
  tytulWyk: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: C.text2, textDecorationLine: 'line-through' },
  znaczek: { color: '#fff', fontFamily: Fonts.bold, fontSize: 10, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, overflow: 'hidden', marginTop: 3 },
  opis: { fontFamily: Fonts.regular, fontSize: 12, opacity: 0.8, marginBottom: 6, marginLeft: 34 },
  dol: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 34 },
  info: { flex: 1, fontFamily: Fonts.regular, fontSize: 11, opacity: 0.7 },
  kosz: { paddingHorizontal: 6, paddingVertical: 2 },
  koszTxt: { fontSize: 14, color: '#bbb' },
  wykonaneNaglowek: { fontFamily: Fonts.medium, fontSize: 12, color: C.text3, paddingVertical: 6, paddingHorizontal: 2 },
  wroc: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  wrocStrzalka: { fontSize: 20, color: C.text2, paddingRight: 4 },
  wrocTxt: { fontFamily: Fonts.semibold, fontSize: 16, color: C.text },
  formularz: { padding: 16, gap: 14 },
  grupa: { gap: 6 },
  wybory: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wybor: { minHeight: 46, paddingVertical: 11, paddingHorizontal: 16, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  wyborTxt: { fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  przyciskPola: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 15 },
  przyciskPolaTxt: { fontFamily: Fonts.regular, fontSize: 15, color: C.text },
  link: { fontFamily: Fonts.medium, fontSize: 13, color: C.text2, textDecorationLine: 'underline' },
  anuluj: { marginBottom: 14, minHeight: 48, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  anulujTxt: { fontFamily: Fonts.semibold, fontSize: 14, color: C.text },
});
