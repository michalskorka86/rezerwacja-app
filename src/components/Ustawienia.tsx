import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Fonts, Size } from '@/constants/theme';
import { komunikatBledu } from '@/logika/klient';
import type { UstawieniaSms, UzytkownikAdmin } from '@/logika/typy';
import { bladUzytkownika, daneUzytkownika, nowyUzytkownik, type StanUzytkownika } from '@/logika/ustawienia';
import { useDane } from '@/stan/DaneProvider';
import { klient } from '@/stan/klient';
import { zarejestrujPush } from '@/stan/push';
import { idUrzadzenia, MODEL, WERSJA_APLIKACJI } from '@/stan/sesja';
import { zglos, zglosProblem } from '@/stan/zglos';

import { opisWersji, pobierzIPrzeladuj } from './Aktualizacje';
import { usePodstronaArkusza } from './ui/Arkusz';
import { Ikona, type NazwaIkony } from './ui/Ikona';
import { useKomunikaty } from './ui/Komunikaty';
import { Etykieta, Pole } from './ui/Pola';
import { Suwak } from './ui/Przelacznik';
import { PrzyciskGlowny } from './ui/Przyciski';
import { ZmianaHasla } from './ZmianaHasla';

type Strona =
  | { rodzaj: 'haslo' }
  | { rodzaj: 'uzytkownicy' }
  | { rodzaj: 'uzytkownik'; x: UzytkownikAdmin }
  | { rodzaj: 'tymczasowe'; x: UzytkownikAdmin }
  | { rodzaj: 'nowy' }
  | { rodzaj: 'sms' }
  | { rodzaj: 'powiadomienia' }
  | { rodzaj: 'aktualizacje' }
  | { rodzaj: 'problem' };

const TYTULY: Record<Strona['rodzaj'], string> = {
  haslo: 'Zmień hasło',
  uzytkownicy: 'Użytkownicy',
  uzytkownik: '',
  tymczasowe: 'Hasło tymczasowe',
  nowy: 'Nowy użytkownik',
  sms: 'Powiadomienia SMS',
  powiadomienia: 'Powiadomienia',
  aktualizacje: 'Aktualizacje',
  problem: 'Zgłoś problem',
};

const nazwaMarki = (m: string) => (m === 'arsenal' ? 'Arsenał' : 'SILT');
const nazwaRoli = (r: string) => (r === 'admin' ? '👑 Admin' : '👤 Instruktor');

/**
 * Ustawienia (uzgodnione z Michałem 04.11) — lista w grupach jak w Ustawieniach telefonu; każda pozycja otwiera
 * osobny ekran („← Wstecz” wraca o jeden krok): Konto (Zmień hasło), Zespół — tylko admin (Użytkownicy, Powiadomienia SMS),
 * Ten telefon (Powiadomienia, Aktualizacje), Pomoc (Zgłoś problem), Wyloguj.
 */
export function Ustawienia() {
  const { konto, wyloguj } = useDane();
  const { zapytaj } = useKomunikaty();
  const [stos, setStos] = useState<Strona[]>([]);
  const u = konto?.uzytkownik;
  if (!u) return null;
  const admin = u.rola_nazwa === 'admin';
  const idz = (s: Strona) => setStos((st) => [...st, s]);
  const wroc = () => setStos((st) => st.slice(0, -1));
  /** podmień bieżący ekran (np. użytkownik po zmianie) */
  const podmien = (s: Strona) => setStos((st) => [...st.slice(0, -1), s]);

  const s = stos[stos.length - 1];
  if (s) {
    const tytul = s.rodzaj === 'uzytkownik' ? s.x.imie : TYTULY[s.rodzaj];
    return (
      <Podstrona key={stos.length} tytul={tytul} onWroc={wroc}>
        {s.rodzaj === 'haslo' ? <ZmianaHasla onGotowe={wroc} /> : null}
        {s.rodzaj === 'uzytkownicy' ? <Uzytkownicy mojeId={u.id} onWybierz={(x) => idz({ rodzaj: 'uzytkownik', x })} onDodaj={() => idz({ rodzaj: 'nowy' })} /> : null}
        {s.rodzaj === 'uzytkownik' ? (
          <Uzytkownik x={s.x} onZmiana={(x) => podmien({ rodzaj: 'uzytkownik', x })} onTymczasowe={() => idz({ rodzaj: 'tymczasowe', x: s.x })} />
        ) : null}
        {s.rodzaj === 'tymczasowe' ? (
          <HasloTymczasowe
            x={s.x}
            onGotowe={(x) =>
              setStos((st) => {
                const bez = st.slice(0, -1);
                return [...bez.slice(0, -1), { rodzaj: 'uzytkownik', x }];
              })
            }
            onAnuluj={wroc}
          />
        ) : null}
        {s.rodzaj === 'nowy' ? <NowyUzytkownik onGotowe={wroc} /> : null}
        {s.rodzaj === 'sms' ? <Powiadomienia /> : null}
        {s.rodzaj === 'powiadomienia' ? (
          <>
            <Text style={styles.opisStrony}>
              Telefon dostaje powiadomienie o nowej rezerwacji z formularza www (i o rezerwacjach dodanych przez innych z zespołu). Jeśli nie
              przychodzą — wyślij próbne i pokaż wynik Michałowi.
            </Text>
            <TestPowiadomien />
          </>
        ) : null}
        {s.rodzaj === 'aktualizacje' ? (
          <>
            <Grupa>
              <Wiersz tekst="Wersja" wartosc={opisWersji(WERSJA_APLIKACJI)} ostatni />
            </Grupa>
            <Text style={styles.opisStrony}>Poprawki przychodzą same, przy uruchomieniu aplikacji. Tu możesz sprawdzić od razu.</Text>
            <SprawdzAktualizacje />
          </>
        ) : null}
        {s.rodzaj === 'problem' ? <ZglosProblem onGotowe={wroc} /> : null}
      </Podstrona>
    );
  }

  return (
    <View style={styles.tresc}>
      <View style={styles.profil}>
        <Kolko imie={u.imie} marka={u.marka} rozmiar={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.imie} numberOfLines={1}>
            {u.imie}
          </Text>
          <Text style={styles.maly} numberOfLines={1}>
            {u.login} · {nazwaRoli(u.rola_nazwa)} · {nazwaMarki(u.marka)}
          </Text>
        </View>
      </View>

      <Grupa tytul="Konto">
        <Wiersz ikona="key-outline" tekst="Zmień hasło" onPress={() => idz({ rodzaj: 'haslo' })} ostatni />
      </Grupa>

      {admin ? (
        <Grupa tytul="Zespół">
          <Wiersz ikona="people-outline" tekst="Użytkownicy" onPress={() => idz({ rodzaj: 'uzytkownicy' })} />
          <Wiersz ikona="chatbubble-ellipses-outline" tekst="Powiadomienia SMS" onPress={() => idz({ rodzaj: 'sms' })} ostatni />
        </Grupa>
      ) : null}

      <Grupa tytul="Ten telefon">
        <Wiersz ikona="notifications-outline" tekst="Powiadomienia" onPress={() => idz({ rodzaj: 'powiadomienia' })} />
        <Wiersz ikona="download-outline" tekst="Aktualizacje" wartosc={opisWersji(WERSJA_APLIKACJI)} onPress={() => idz({ rodzaj: 'aktualizacje' })} ostatni />
      </Grupa>

      <Grupa tytul="Pomoc">
        <Wiersz ikona="help-buoy-outline" tekst="Zgłoś problem" onPress={() => idz({ rodzaj: 'problem' })} ostatni />
      </Grupa>

      <Grupa>
        <Wiersz
          tekst="Wyloguj"
          czerwony
          srodek
          ostatni
          onPress={() =>
            zapytaj({ tytul: 'Wylogować się?', tekst: 'Dane rezerwacji zostaną usunięte z tego telefonu.', ok: 'Wyloguj', niebezpieczne: true, onOk: () => wyloguj() })
          }
        />
      </Grupa>
      <Text style={styles.stopka}>Rezerwacje · {opisWersji(WERSJA_APLIKACJI)}</Text>
    </View>
  );
}

function Podstrona({ tytul, onWroc, children }: { tytul: string; onWroc: () => void; children: React.ReactNode }) {
  usePodstronaArkusza(onWroc, tytul);
  return <View style={styles.tresc}>{children}</View>;
}

/** Grupa wierszy na białym tle (jak w Ustawieniach telefonu), z szarym nagłówkiem nad nią. */
function Grupa({ tytul, children }: { tytul?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {tytul ? <Text style={styles.grupaTytul}>{tytul.toUpperCase()}</Text> : null}
      <View style={styles.grupa}>{children}</View>
    </View>
  );
}

function Wiersz({
  ikona,
  tekst,
  podpis,
  wartosc,
  onPress,
  czerwony,
  pomaranczowy,
  srodek,
  ostatni,
  wylaczony,
  lewo,
}: {
  ikona?: NazwaIkony;
  tekst: string;
  podpis?: string;
  wartosc?: string;
  onPress?: () => void;
  czerwony?: boolean;
  pomaranczowy?: boolean;
  srodek?: boolean;
  ostatni?: boolean;
  wylaczony?: boolean;
  lewo?: React.ReactNode;
}) {
  const kolor = czerwony ? C.red : pomaranczowy ? C.pomarancz : C.text;
  const tresc = (
    <>
      {lewo}
      {ikona ? <Ikona nazwa={ikona} rozmiar={20} kolor={pomaranczowy ? C.pomarancz : C.text2} /> : null}
      <View style={srodek ? undefined : { flex: 1 }}>
        <Text style={[styles.wierszTxt, { color: kolor }, (czerwony || pomaranczowy) && { fontFamily: Fonts.semibold }]} numberOfLines={1}>
          {tekst}
        </Text>
        {podpis ? (
          <Text style={styles.maly} numberOfLines={1}>
            {podpis}
          </Text>
        ) : null}
      </View>
      {wartosc ? (
        <Text style={styles.wierszWartosc} numberOfLines={1}>
          {wartosc}
        </Text>
      ) : null}
      {onPress && !srodek ? <Ikona nazwa="chevron-forward" rozmiar={18} kolor={C.text3} /> : null}
    </>
  );
  const styl = [styles.wiersz, srodek && { justifyContent: 'center' as const }, !ostatni && styles.wierszKreska];
  if (!onPress) return <View style={styl}>{tresc}</View>;
  return (
    <Pressable onPress={onPress} disabled={wylaczony} accessibilityRole="button" style={({ pressed }) => [...styl, (pressed || wylaczony) && { backgroundColor: C.bg }]}>
      {tresc}
    </Pressable>
  );
}

/** Kółko z pierwszą literą imienia — zielone SILT, niebieskie Arsenał, szare dla wyłączonego konta. */
function Kolko({ imie, marka, rozmiar = 36, szare }: { imie: string; marka: string; rozmiar?: number; szare?: boolean }) {
  return (
    <View
      style={{
        width: rozmiar,
        height: rozmiar,
        borderRadius: rozmiar / 2,
        backgroundColor: szare ? C.border : marka === 'arsenal' ? C.blue : C.green,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color: szare ? C.text2 : '#fff', fontFamily: Fonts.bold, fontSize: rozmiar * 0.42 }}>{imie.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

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

/** Użytkownicy (admin): sama lista — aktywne i wyłączone osobno; dotknięcie otwiera ekran użytkownika. */
function Uzytkownicy({ mojeId, onWybierz, onDodaj }: { mojeId: number; onWybierz: (x: UzytkownikAdmin) => void; onDodaj: () => void }) {
  const [lista, setLista] = useState<UzytkownikAdmin[] | null>(null);
  const [blad, setBlad] = useState<string | null>(null);

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

  const wiersz = (x: UzytkownikAdmin, i: number, n: number) => {
    const ja = x.id === mojeId;
    return (
      <Wiersz
        key={x.id}
        lewo={<Kolko imie={x.imie} marka={x.marka} szare={!x.aktywny} />}
        tekst={x.imie + (ja ? ' (to Ty)' : '')}
        podpis={`${nazwaRoli(x.rola_nazwa)} · ${nazwaMarki(x.marka)}${x.haslo_reset ? ' · czeka na nowe hasło' : ''}`}
        onPress={ja ? undefined : () => onWybierz(x)}
        ostatni={i === n - 1}
      />
    );
  };
  const aktywni = (lista ?? []).filter((x) => x.aktywny);
  const wylaczeni = (lista ?? []).filter((x) => !x.aktywny);

  return (
    <>
      {blad ? <Text style={styles.blad}>⚠️ {blad}</Text> : null}
      {!lista && !blad ? <Text style={styles.pusto}>Ładowanie...</Text> : null}
      {aktywni.length ? <Grupa tytul="Aktywne konta">{aktywni.map((x, i) => wiersz(x, i, aktywni.length))}</Grupa> : null}
      {wylaczeni.length ? <Grupa tytul="Wyłączone">{wylaczeni.map((x, i) => wiersz(x, i, wylaczeni.length))}</Grupa> : null}
      <PrzyciskGlowny tekst="＋ Dodaj użytkownika" onPress={onDodaj} style={{ backgroundColor: C.green, marginTop: 4 }} />
    </>
  );
}

/** Ekran jednego użytkownika (admin): dane, hasło (tymczasowe / wymuś zmianę), włącz / wyłącz konto. */
function Uzytkownik({ x, onZmiana, onTymczasowe }: { x: UzytkownikAdmin; onZmiana: (x: UzytkownikAdmin) => void; onTymczasowe: () => void }) {
  const { toast, zapytaj } = useKomunikaty();
  const [trwa, setTrwa] = useState(false);

  const wykonaj = async (f: () => Promise<unknown>, po: UzytkownikAdmin, komunikat: string) => {
    setTrwa(true);
    try {
      await f();
      toast(komunikat);
      onZmiana(po);
    } catch (e) {
      toast('❌ ' + komunikatBledu(e));
    } finally {
      setTrwa(false);
    }
  };

  const wymus = () =>
    zapytaj({
      tytul: 'Wymusić zmianę hasła?',
      tekst: `${x.imie} zaloguje się dotychczasowym hasłem, a aplikacja od razu poprosi o nowe. Jeśli nie pamięta hasła — użyj „Nadaj hasło tymczasowe”.`,
      ok: 'Wymuś zmianę',
      onOk: () => wykonaj(() => klient('haslo_reset', { body: { id: x.id } }), { ...x, haslo_reset: true }, '✅ Przy następnym logowaniu poprosi o nowe hasło'),
    });

  const wlacz = () =>
    zapytaj({
      tytul: x.aktywny ? 'Wyłączyć konto?' : 'Włączyć konto?',
      tekst: x.aktywny ? `${x.imie} nie będzie mógł (mogła) się zalogować, a telefony z tym kontem zostaną wylogowane.` : `${x.imie} znów będzie mógł (mogła) się zalogować.`,
      ok: x.aktywny ? 'Wyłącz' : 'Włącz',
      niebezpieczne: x.aktywny,
      onOk: () => wykonaj(() => klient('uzytkownik_aktywny', { body: { id: x.id, aktywny: !x.aktywny } }), { ...x, aktywny: !x.aktywny }, '✅ Zapisano'),
    });

  return (
    <>
      <View style={[styles.profil, styles.profilSrodek]}>
        <Kolko imie={x.imie} marka={x.marka} rozmiar={64} szare={!x.aktywny} />
        <Text style={styles.imie}>{x.imie}</Text>
        <Text style={styles.maly}>
          login: {x.login}
          {!x.aktywny ? ' · konto wyłączone' : ''}
        </Text>
      </View>
      <Grupa tytul="Dane">
        <Wiersz tekst="Rola" wartosc={nazwaRoli(x.rola_nazwa)} />
        <Wiersz tekst="Firma" wartosc={nazwaMarki(x.marka)} ostatni />
      </Grupa>
      <Grupa tytul="Hasło">
        <Wiersz ikona="key-outline" tekst="Nadaj hasło tymczasowe" pomaranczowy onPress={onTymczasowe} wylaczony={trwa} />
        <Wiersz ikona="refresh" tekst="Wymuś zmianę hasła" podpis={x.haslo_reset ? 'Już ustawione — czeka na nowe hasło' : undefined} onPress={wymus} wylaczony={trwa} ostatni />
      </Grupa>
      <Grupa>
        <Wiersz tekst={x.aktywny ? 'Wyłącz konto' : 'Włącz konto'} czerwony={x.aktywny} srodek ostatni onPress={wlacz} wylaczony={trwa} />
      </Grupa>
    </>
  );
}

/** Admin wpisuje hasło tymczasowe i podaje je pracownikowi; po zalogowaniu aplikacja prosi o nowe. */
function HasloTymczasowe({ x, onGotowe, onAnuluj }: { x: UzytkownikAdmin; onGotowe: (x: UzytkownikAdmin) => void; onAnuluj: () => void }) {
  const { toast, pasekBledu } = useKomunikaty();
  const [haslo, setHaslo] = useState('');
  const [trwa, setTrwa] = useState(false);
  const zapisz = async () => {
    if (haslo.trim().length < 6) return toast('❌ Hasło min. 6 znaków');
    setTrwa(true);
    try {
      await klient('haslo_tymczasowe', { body: { id: x.id, haslo: haslo.trim() } });
      pasekBledu(null);
      toast(`✅ Hasło tymczasowe ustawione — podaj je: ${x.imie}`);
      onGotowe({ ...x, haslo_reset: true });
    } catch (e) {
      pasekBledu('❌ ' + komunikatBledu(e));
    } finally {
      setTrwa(false);
    }
  };
  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.opisStrony}>
        Wpisz hasło i podaj je osobie: {x.imie} (login: {x.login}). Po zalogowaniu aplikacja od razu poprosi o ustawienie własnego hasła. Telefony z
        tym kontem zostaną wylogowane.
      </Text>
      <Pole etykieta="Hasło tymczasowe" value={haslo} onChangeText={setHaslo} placeholder="min. 6 znaków" autoCapitalize="none" autoCorrect={false} />
      <PrzyciskGlowny tekst="Zapisz hasło" onPress={zapisz} trwa={trwa} style={{ backgroundColor: C.green }} />
      <Przycisk tekst="Anuluj" onPress={onAnuluj} />
    </View>
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
      <Text style={styles.opisStrony}>SMS na telefon firmowy, gdy przyjdzie nowa rezerwacja z formularza www albo nowy wynajem. Dotyczy całej firmy.</Text>
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
      // pamięć telefonu nie działa — wyślij od razu na serwer, z opisem tego błędu
      try {
        await klient('blad', {
          body: { komunikat: `Zgłoszenie: ${tekst.trim()}`.slice(0, 500), stos: String(e).slice(0, 2000), ekran: 'ustawienia', urzadzenie: await idUrzadzenia(), model: MODEL },
        });
        toast('✅ Wysłano. Dziękujemy!');
        onGotowe();
      } catch (e2) {
        toast('❌ Nie udało się wysłać zgłoszenia: ' + komunikatBledu(e2));
      }
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
  profil: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: Size.radius, padding: 14, marginBottom: 16 },
  profilSrodek: { flexDirection: 'column', gap: 6, paddingVertical: 18 },
  grupaTytul: { fontFamily: Fonts.semibold, fontSize: 11, color: C.text2, letterSpacing: 0.6, paddingHorizontal: 4, paddingBottom: 6 },
  grupa: { backgroundColor: C.surface, borderRadius: Size.radius, overflow: 'hidden' },
  wiersz: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8, paddingHorizontal: 14 },
  wierszKreska: { borderBottomWidth: 1, borderBottomColor: C.border },
  wierszTxt: { fontFamily: Fonts.regular, fontSize: 15, color: C.text },
  wierszWartosc: { fontFamily: Fonts.regular, fontSize: 13, color: C.text2, maxWidth: '55%' },
  opisStrony: { fontFamily: Fonts.regular, fontSize: 13, color: C.text2, lineHeight: 19, paddingHorizontal: 4, marginBottom: 12 },
  stopka: { fontFamily: Fonts.regular, fontSize: 11, color: C.text3, textAlign: 'center', marginTop: 4 },
  tresc: { padding: 16 },
  karta: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
  imie: { fontFamily: Fonts.semibold, fontSize: 15, color: C.text },
  imieMale: { fontFamily: Fonts.semibold, fontSize: 14, color: C.text },
  maly: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2 },
  wersja: { fontFamily: Fonts.medium, fontSize: 14, color: C.text, marginTop: 2 },
  przycisk: { minHeight: 48, borderWidth: 0.5, borderColor: C.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8, backgroundColor: C.surface },
  przyciskTxt: { fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  blad: { fontFamily: Fonts.medium, fontSize: 13, color: C.pomarancz, marginBottom: 10 },
  pusto: { textAlign: 'center', color: C.text3, fontSize: 14, fontFamily: Fonts.regular, paddingVertical: 24 },
  wybory: { flexDirection: 'row', gap: 8 },
  wybor: { flex: 1, minHeight: 46, borderRadius: Size.rs, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  wyborTxt: { fontFamily: Fonts.regular, fontSize: 14, color: C.text },
  podpowiedz: { fontFamily: Fonts.regular, fontSize: 12, color: C.text2, lineHeight: 17 },
  smsWiersz: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  smsKreska: { borderTopWidth: 0.5, borderTopColor: C.border },
  status: { fontFamily: Fonts.regular, fontSize: 12, color: C.text3, textAlign: 'center', minHeight: 18 },
});
