import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import { komunikatBledu } from '@/logika/klient';
import type { UstawieniaSms, UzytkownikAdmin } from '@/logika/typy';
import { bladUzytkownika, daneUzytkownika, nowyUzytkownik, type StanUzytkownika } from '@/logika/ustawienia';
import { useDane } from '@/stan/DaneProvider';
import { klient } from '@/stan/klient';
import { zarejestrujPush } from '@/stan/push';
import { WERSJA_APLIKACJI } from '@/stan/sesja';
import { zglos, zglosProblem } from '@/stan/zglos';

import { opisWersji, pobierzIPrzeladuj } from './Aktualizacje';
import { usePodstronaArkusza } from './ui/Arkusz';
import { useKomunikaty } from './ui/Komunikaty';
import { Etykieta, Pole } from './ui/Pola';
import { Suwak } from './ui/Przelacznik';
import { PrzyciskGlowny } from './ui/Przyciski';
import { ZmianaHasla } from './ZmianaHasla';

type Zakladka = 'konto' | 'uzytkownicy' | 'powiadomienia';
type RodzajPodstrony = null | 'haslo' | 'nowy' | 'problem';

/**
 * Ustawienia (sh-ustawienia z PWA): Konto + 🔑 Zmień hasło; admin dodatkowo Użytkownicy i 🔔 Powiadomienia SMS.
 * Nowe w aplikacji (jak w SILT Lista): 📨 Zgłoś problem, wersja, ⬇️ Sprawdź aktualizację, Wyloguj.
 */
export function Ustawienia() {
  const { konto, wyloguj } = useDane();
  const { zapytaj } = useKomunikaty();
  const [zakladka, setZakladka] = useState<Zakladka>('konto');
  const [podstrona, setPodstrona] = useState<RodzajPodstrony>(null);
  const u = konto?.uzytkownik;
  if (!u) return null;
  const admin = u.rola_nazwa === 'admin';

  if (podstrona) {
    const tytul = podstrona === 'haslo' ? 'Zmień hasło' : podstrona === 'nowy' ? 'Nowy użytkownik' : 'Zgłoś problem';
    return (
      <Podstrona tytul={tytul} onWroc={() => setPodstrona(null)}>
        {podstrona === 'haslo' ? <ZmianaHasla onGotowe={() => setPodstrona(null)} /> : null}
        {podstrona === 'nowy' ? (
          <NowyUzytkownik
            onGotowe={() => {
              setPodstrona(null);
              setZakladka('uzytkownicy');
            }}
          />
        ) : null}
        {podstrona === 'problem' ? <ZglosProblem onGotowe={() => setPodstrona(null)} /> : null}
      </Podstrona>
    );
  }

  return (
    <View>
      {admin ? (
        <View style={styles.zakladki}>
          {(
            [
              ['konto', 'Konto'],
              ['uzytkownicy', 'Użytkownicy'],
              ['powiadomienia', '🔔 Powiadomienia'],
            ] as const
          ).map(([z, n]) => (
            <Pressable key={z} onPress={() => setZakladka(z)} style={[styles.zakladka, zakladka === z && styles.zakladkaOn]} accessibilityState={{ selected: zakladka === z }}>
              <Text style={[styles.zakladkaTxt, zakladka === z && styles.zakladkaTxtOn]} numberOfLines={1}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.tresc}>
        {zakladka === 'konto' || !admin ? (
          <>
            <Tytul tekst="Moje konto" />
            <View style={styles.karta}>
              <Text style={styles.imie}>{u.imie}</Text>
              <Text style={styles.maly}>
                {u.login} · {admin ? '👑 Admin' : '👤 Instruktor'} · {u.marka === 'arsenal' ? 'Arsenał' : 'SILT'}
              </Text>
            </View>
            <Przycisk tekst="🔑 Zmień hasło" onPress={() => setPodstrona('haslo')} />

            <Tytul tekst="Aplikacja" odstep />
            <View style={styles.karta}>
              <Text style={styles.maly}>Wersja</Text>
              <Text style={styles.wersja}>{opisWersji(WERSJA_APLIKACJI)}</Text>
            </View>
            <SprawdzAktualizacje />
            <TestPowiadomien />
            <Przycisk tekst="📨 Zgłoś problem" onPress={() => setPodstrona('problem')} />
            <Przycisk
              tekst="Wyloguj"
              czerwony
              onPress={() =>
                zapytaj({ tytul: 'Wylogować się?', tekst: 'Dane rezerwacji zostaną usunięte z tego telefonu.', ok: 'Wyloguj', niebezpieczne: true, onOk: () => wyloguj() })
              }
            />
          </>
        ) : null}

        {zakladka === 'uzytkownicy' && admin ? <Uzytkownicy mojeId={u.id} onDodaj={() => setPodstrona('nowy')} /> : null}
        {zakladka === 'powiadomienia' && admin ? <Powiadomienia /> : null}
      </View>
    </View>
  );
}

function Podstrona({ tytul, onWroc, children }: { tytul: string; onWroc: () => void; children: React.ReactNode }) {
  usePodstronaArkusza(onWroc);
  return (
    <View>
      <Pressable onPress={onWroc} style={styles.wroc} accessibilityRole="button" accessibilityLabel="Wróć">
        <Text style={styles.wrocStrzalka}>←</Text>
        <Text style={styles.wrocTxt}>{tytul}</Text>
      </Pressable>
      <View style={styles.tresc}>{children}</View>
    </View>
  );
}

const Tytul = ({ tekst, odstep }: { tekst: string; odstep?: boolean }) => <Text style={[styles.sekcja, odstep && { marginTop: 22 }]}>{tekst.toUpperCase()}</Text>;

function Przycisk({ tekst, onPress, czerwony, wylaczony }: { tekst: string; onPress: () => void; czerwony?: boolean; wylaczony?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={wylaczony}
      style={({ pressed }) => [styles.przycisk, czerwony && { borderColor: '#f5c0bb', backgroundColor: C.redL }, (pressed || wylaczony) && { opacity: 0.65 }]}>
      <Text style={[styles.przyciskTxt, czerwony && { color: C.red, fontFamily: Fonts.semibold }]}>{tekst}</Text>
    </Pressable>
  );
}

type Diagnoza = {
  telefon_zapisany: boolean;
  telefonow_marki: number;
  cron_ostatnio: string;
  cron_blad?: string;
  teraz: string;
  baza_teraz?: string;
  od_numeru?: number;
  ostatnia_www: { id: number; status: string; utworzona: string | null; marka: string; push_czas: string | null; push_telefonow: number | null } | null;
};

/** 🔔 Próbne powiadomienie na ten telefon — pokazuje, na którym kroku jest problem (zgoda, Firebase, serwer, cron). */
function TestPowiadomien() {
  const [trwa, setTrwa] = useState(false);
  const [linie, setLinie] = useState<string[] | null>(null);
  const testuj = async () => {
    setTrwa(true);
    setLinie(['⏳ Sprawdzam…']);
    const l: string[] = [];
    try {
      const r = await zarejestrujPush(true);
      if (!r.ok) {
        l.push(`❌ Krok „${r.krok}”: ${r.blad}`);
        setLinie(l);
        zglos(new Error(`Test powiadomień: ${r.krok}: ${r.blad}`), { dopisek: 'Test powiadomień' });
        return;
      }
      l.push('✅ Zgoda na powiadomienia i adres telefonu');
      const j = await klient<{ wyslano: boolean; wynik: string; diagnoza: Diagnoza }>('push_test', { body: {}, czasMs: 30000 });
      l.push((j.wyslano && j.wynik.startsWith('ok') ? '✅ ' : j.wyslano ? 'ℹ️ ' : '❌ ') + j.wynik);
      const d = j.diagnoza;
      l.push(`Telefonów tej marki z powiadomieniami: ${d.telefonow_marki}`);
      l.push(d.cron_ostatnio ? `Cron ostatnio: ${d.cron_ostatnio} (teraz ${d.teraz.slice(11, 16)})` : '❌ Cron jeszcze ani razu nie działał (brak wpisu w panelu LH.pl?)');
      if (d.cron_blad) l.push(`❌ Błąd crona: ${d.cron_blad}`);
      if (d.baza_teraz && d.baza_teraz.slice(11, 16) !== d.teraz.slice(11, 16)) l.push(`ℹ️ Zegar bazy: ${d.baza_teraz.slice(11, 16)}`);
      if (d.od_numeru !== undefined) l.push(`Powiadomienia o rezerwacjach od nr ${d.od_numeru + 1}`);
      const w = d.ostatnia_www;
      if (w) l.push(`Ostatnia z www: nr ${w.id}, ${w.status}, ${w.utworzona ?? '?'} → ${w.push_czas ? `push ${w.push_czas} (${w.push_telefonow ?? 0} tel.)` : 'push nie wysłany'}`);
      setLinie(l);
      if (!j.wyslano || !j.wynik.startsWith('ok')) zglos(new Error('Test powiadomień: ' + l.join(' | ')), { dopisek: 'Test powiadomień' });
    } catch (e) {
      l.push('❌ ' + komunikatBledu(e));
      setLinie(l);
    } finally {
      setTrwa(false);
    }
  };
  return (
    <>
      <Przycisk tekst={trwa ? '⏳ Wysyłam…' : '🔔 Wyślij próbne powiadomienie'} onPress={testuj} wylaczony={trwa} />
      {linie ? (
        <View style={[styles.karta, { marginTop: 8, gap: 4 }]}>
          {linie.map((t, i) => (
            <Text key={i} style={styles.maly} selectable>
              {t}
            </Text>
          ))}
        </View>
      ) : null}
    </>
  );
}

function SprawdzAktualizacje() {
  const { toast } = useKomunikaty();
  const [trwa, setTrwa] = useState(false);
  const sprawdz = async () => {
    setTrwa(true);
    try {
      const w = await pobierzIPrzeladuj();
      if (w === 'brak') toast('✅ Masz najnowszą wersję');
      if (w === 'niedostepne') toast('Aktualizacje działają tylko w zainstalowanej aplikacji');
    } catch {
      toast('❌ Nie udało się sprawdzić. Sprawdź internet i spróbuj ponownie.');
    } finally {
      setTrwa(false);
    }
  };
  return <Przycisk tekst={trwa ? '⏳ Sprawdzam…' : '⬇️ Sprawdź aktualizację'} onPress={sprawdz} wylaczony={trwa} />;
}

/** Zakładka Użytkownicy (admin): lista, Reset hasła, Dezaktywuj / Aktywuj, + Dodaj użytkownika. */
function Uzytkownicy({ mojeId, onDodaj }: { mojeId: number; onDodaj: () => void }) {
  const { toast, zapytaj } = useKomunikaty();
  const [lista, setLista] = useState<UzytkownikAdmin[] | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
  const [trwa, setTrwa] = useState<number | null>(null);

  const pobierz = useCallback(async () => {
    try {
      const j = await klient<{ uzytkownicy: UzytkownikAdmin[] }>('uzytkownicy_admin');
      setLista(j.uzytkownicy);
      setBlad(null);
    } catch (e) {
      setBlad(komunikatBledu(e));
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(pobierz);
  }, [pobierz]);

  const akcja = (x: UzytkownikAdmin, rodzaj: 'reset' | 'aktywny') =>
    zapytaj({
      tytul: rodzaj === 'reset' ? 'Zresetować hasło?' : x.aktywny ? 'Dezaktywować konto?' : 'Aktywować konto?',
      tekst:
        rodzaj === 'reset'
          ? `${x.imie} przy następnym otwarciu aplikacji będzie musiał(a) ustawić nowe hasło.`
          : x.aktywny
            ? `${x.imie} nie będzie mógł (mogła) się zalogować, a telefony z tym kontem zostaną wylogowane.`
            : `${x.imie} znów będzie mógł (mogła) się zalogować.`,
      ok: rodzaj === 'reset' ? 'Resetuj hasło' : x.aktywny ? 'Dezaktywuj' : 'Aktywuj',
      niebezpieczne: rodzaj === 'reset' || x.aktywny,
      onOk: async () => {
        setTrwa(x.id);
        try {
          if (rodzaj === 'reset') {
            await klient('haslo_reset', { body: { id: x.id } });
            toast('✅ Hasło zresetowane');
          } else {
            await klient('uzytkownik_aktywny', { body: { id: x.id, aktywny: !x.aktywny } });
            toast('✅ Zapisano');
          }
          await pobierz();
        } catch (e) {
          toast('❌ ' + komunikatBledu(e));
        } finally {
          setTrwa(null);
        }
      },
    });

  return (
    <>
      <Tytul tekst="Użytkownicy" />
      {blad ? <Text style={styles.blad}>⚠️ {blad}</Text> : null}
      {!lista && !blad ? <Text style={styles.pusto}>Ładowanie...</Text> : null}
      {(lista ?? []).map((x) => {
        const ja = x.id === mojeId;
        return (
          <View key={x.id} style={[styles.karta, { gap: 6 }]}>
            <View style={styles.wiersz}>
              <Text style={styles.imieMale}>{x.imie}</Text>
              <Text style={[styles.znaczek, x.rola_nazwa === 'admin' ? styles.znaczekAdmin : styles.znaczekInstr]}>{x.rola_nazwa === 'admin' ? 'Admin' : 'Instruktor'}</Text>
              {!x.aktywny ? <Text style={[styles.znaczek, styles.znaczekOff]}>Nieaktywny</Text> : null}
              {x.haslo_reset ? <Text style={[styles.znaczek, styles.znaczekReset]}>Hasło zresetowane</Text> : null}
            </View>
            <Text style={styles.maly}>
              {x.login} · {x.marka === 'arsenal' ? 'Arsenał' : 'SILT'}
              {ja ? ' · to Ty' : ''}
            </Text>
            {!ja ? (
              <View style={styles.akcje}>
                <Pressable
                  onPress={() => akcja(x, 'reset')}
                  disabled={trwa === x.id}
                  style={({ pressed }) => [styles.akcja, { backgroundColor: '#fff3e0', borderColor: '#ffcc80' }, pressed && { opacity: 0.7 }]}>
                  <Text style={[styles.akcjaTxt, { color: C.pomarancz }]}>Reset hasła</Text>
                </Pressable>
                <Pressable onPress={() => akcja(x, 'aktywny')} disabled={trwa === x.id} style={({ pressed }) => [styles.akcja, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.akcjaTxt}>{x.aktywny ? 'Dezaktywuj' : 'Aktywuj'}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
      <PrzyciskGlowny tekst="+ Dodaj użytkownika" onPress={onDodaj} style={{ backgroundColor: C.green, marginTop: 4 }} />
    </>
  );
}

function NowyUzytkownik({ onGotowe }: { onGotowe: () => void }) {
  const { toast, pasekBledu } = useKomunikaty();
  const [s, setS] = useState<StanUzytkownika>(nowyUzytkownik);
  const [trwa, setTrwa] = useState(false);
  const zmien = (z: Partial<StanUzytkownika>) => setS((p) => ({ ...p, ...z }));

  const zapisz = async () => {
    const b = bladUzytkownika(s);
    if (b) return toast('❌ ' + b);
    setTrwa(true);
    try {
      await klient('uzytkownik_dodaj', { body: daneUzytkownika(s) });
      pasekBledu(null);
      toast('✅ Użytkownik dodany!');
      onGotowe();
    } catch (e) {
      pasekBledu('❌ ' + komunikatBledu(e));
    } finally {
      setTrwa(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Pole etykieta="Imię *" value={s.imie} onChangeText={(t) => zmien({ imie: t })} placeholder="np. Marek" autoCapitalize="words" />
      <Pole etykieta="Login *" value={s.login} onChangeText={(t) => zmien({ login: t })} placeholder="np. marek" autoCapitalize="none" autoCorrect={false} />
      <Pole etykieta="Hasło tymczasowe *" value={s.haslo} onChangeText={(t) => zmien({ haslo: t })} placeholder="min. 6 znaków" autoCapitalize="none" autoCorrect={false} />
      <View style={{ gap: 6 }}>
        <Etykieta tekst="Rola" />
        <View style={styles.wybory}>
          <Wybor tekst="Admin" on={s.rola === 'admin'} onPress={() => zmien({ rola: 'admin' })} />
          <Wybor tekst="Instruktor" on={s.rola === 'instruktor'} onPress={() => zmien({ rola: 'instruktor' })} />
        </View>
        <Text style={styles.podpowiedz}>Instruktor tylko ogląda kalendarz — nie dodaje i nie zmienia rezerwacji.</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Etykieta tekst="Marka" />
        <View style={styles.wybory}>
          <Wybor tekst="SILT" on={s.marka === 'silt'} onPress={() => zmien({ marka: 'silt' })} />
          <Wybor tekst="Arsenał" on={s.marka === 'arsenal'} onPress={() => zmien({ marka: 'arsenal' })} />
        </View>
      </View>
      <PrzyciskGlowny tekst="Dodaj użytkownika" onPress={zapisz} trwa={trwa} style={{ backgroundColor: C.green }} />
      <Przycisk tekst="Anuluj" onPress={onGotowe} />
    </View>
  );
}

function Wybor({ tekst, on, onPress }: { tekst: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected: on }} style={[styles.wybor, on && { backgroundColor: C.text, borderColor: C.text }]}>
      <Text style={[styles.wyborTxt, on && { color: '#fff', fontFamily: Fonts.semibold }]}>{tekst}</Text>
    </Pressable>
  );
}

/** Zakładka 🔔 Powiadomienia (admin): SMS o nowych rezerwacjach z www i wynajmach. Zapis od razu po przełączeniu. */
function Powiadomienia() {
  const [sms, setSms] = useState<UstawieniaSms | null>(null);
  const [status, setStatus] = useState('');
  const [blad, setBlad] = useState<string | null>(null);

  useEffect(() => {
    klient<{ ustawienia: UstawieniaSms }>('sms_ustawienia')
      .then((j) => setSms(j.ustawienia))
      .catch((e) => setBlad(komunikatBledu(e)));
  }, []);

  const przelacz = async (k: keyof UstawieniaSms) => {
    if (!sms) return;
    const poprzednie = sms;
    const nowe = { ...sms, [k]: !sms[k] };
    setSms(nowe);
    setStatus('Zapisywanie...');
    try {
      await klient('sms_ustawienia_zapisz', { body: nowe });
      setStatus('✅ Zapisano');
    } catch (e) {
      setSms(poprzednie);
      setStatus('❌ ' + komunikatBledu(e));
    }
  };

  const wiersze: [keyof UstawieniaSms, string, string, 'zielony' | 'niebieski'][] = [
    ['sms_silt', 'SMS — SILT', 'Nowe rezerwacje i wynajem SILT', 'zielony'],
    ['sms_arsenal', 'SMS — Arsenał', 'Nowe rezerwacje Arsenał', 'niebieski'],
    ['sms_wynajem', 'SMS — Wynajem', 'Nowe wypożyczenia sprzętu', 'zielony'],
  ];

  return (
    <>
      <Tytul tekst="Powiadomienia SMS" />
      {blad ? <Text style={styles.blad}>⚠️ {blad}</Text> : null}
      {!sms && !blad ? <Text style={styles.pusto}>Ładowanie...</Text> : null}
      {sms ? (
        <View style={[styles.karta, { padding: 0, overflow: 'hidden' }]}>
          {wiersze.map(([k, t, o, kolor], i) => (
            <Pressable
              key={k}
              onPress={() => przelacz(k)}
              accessibilityRole="switch"
              accessibilityState={{ checked: sms[k] }}
              style={({ pressed }) => [styles.smsWiersz, i > 0 && styles.smsKreska, pressed && { backgroundColor: C.bg }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.imieMale}>{t}</Text>
                <Text style={styles.maly}>{o}</Text>
              </View>
              <Suwak wlaczony={sms[k]} kolor={kolor} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text style={styles.status}>{status}</Text>
    </>
  );
}

function ZglosProblem({ onGotowe }: { onGotowe: () => void }) {
  const { toast } = useKomunikaty();
  const { odswiez } = useDane();
  const [tekst, setTekst] = useState('');
  const [trwa, setTrwa] = useState(false);
  const wyslij = async () => {
    if (!tekst.trim()) return toast('❌ Opisz, co się stało');
    setTrwa(true);
    try {
      await zglosProblem(tekst);
      // zgłoszenie czeka w telefonie i idzie na serwer razem z odświeżeniem (bez zasięgu — przy najbliższym)
      const ok = await odswiez();
      toast(ok ? '✅ Wysłano. Dziękujemy!' : '✅ Zapisano — wyślemy, gdy będzie internet');
      onGotowe();
    } catch (e) {
      zglos(e, { dopisek: 'Zgłoś problem' });
      toast('❌ Nie udało się zapisać zgłoszenia');
    } finally {
      setTrwa(false);
    }
  };
  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.podpowiedz}>Napisz, co nie działa albo co było dziwne. Dołączymy model telefonu i wersję aplikacji.</Text>
      <Pole etykieta="Co się stało?" value={tekst} onChangeText={setTekst} placeholder="np. Nie mogę zapisać rezerwacji na sobotę…" multiline maxLength={450} />
      <PrzyciskGlowny tekst="📨 Wyślij zgłoszenie" onPress={wyslij} trwa={trwa} style={{ backgroundColor: C.green }} />
      <Przycisk tekst="Anuluj" onPress={onGotowe} />
    </View>
  );
}

const styles = StyleSheet.create({
  zakladki: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  zakladka: { flex: 1, paddingVertical: 13, paddingHorizontal: 6, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  zakladkaOn: { borderBottomColor: C.green },
  zakladkaTxt: { fontFamily: Fonts.regular, fontSize: 13, color: C.text2 },
  zakladkaTxtOn: { fontFamily: Fonts.bold, color: C.green },
  tresc: { padding: 16 },
  sekcja: { fontFamily: Fonts.bold, fontSize: 13, color: C.text2, letterSpacing: 0.5, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 12 },
  karta: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
  imie: { fontFamily: Fonts.semibold, fontSize: 15, color: C.text },
  imieMale: { fontFamily: Fonts.semibold, fontSize: 14, color: C.text },
  maly: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2 },
  wersja: { fontFamily: Fonts.medium, fontSize: 14, color: C.text, marginTop: 2 },
  przycisk: { minHeight: 48, borderWidth: 0.5, borderColor: C.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8, backgroundColor: C.surface },
  przyciskTxt: { fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  wiersz: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  znaczek: { fontFamily: Fonts.regular, fontSize: 11, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, overflow: 'hidden' },
  znaczekAdmin: { backgroundColor: '#e8f5e9', color: C.green },
  znaczekInstr: { backgroundColor: '#e3f2fd', color: '#1565c0' },
  znaczekOff: { backgroundColor: '#ffebee', color: '#c62828' },
  znaczekReset: { backgroundColor: '#fff3e0', color: C.pomarancz },
  akcje: { flexDirection: 'row', gap: 8, marginTop: 4 },
  akcja: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bg, justifyContent: 'center' },
  akcjaTxt: { fontFamily: Fonts.medium, fontSize: 13, color: C.text },
  blad: { fontFamily: Fonts.medium, fontSize: 13, color: C.pomarancz, marginBottom: 10 },
  pusto: { textAlign: 'center', color: C.text3, fontSize: 14, fontFamily: Fonts.regular, paddingVertical: 24 },
  wroc: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  wrocStrzalka: { fontSize: 20, color: C.text2, paddingRight: 4 },
  wrocTxt: { fontFamily: Fonts.semibold, fontSize: 16, color: C.text },
  wybory: { flexDirection: 'row', gap: 8 },
  wybor: { flex: 1, minHeight: 46, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  wyborTxt: { fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  podpowiedz: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2, lineHeight: 17 },
  smsWiersz: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  smsKreska: { borderTopWidth: 0.5, borderTopColor: C.border },
  status: { fontFamily: Fonts.regular, fontSize: 12, color: C.text3, textAlign: 'center', minHeight: 18 },
});
