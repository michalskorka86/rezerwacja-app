import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { wyczyscPamiec } from '@/db/baza';
import { wyslijBledy } from '@/logika/bledy';
import { dzisStr, zakresPobierania } from '@/logika/daty';
import { BladApi, komunikatBledu, toBrakSieci } from '@/logika/klient';
import { podmienRezerwacje, pobierzZSerwera, PUSTY_STAN, wczytajZPamieci, type DaneKonta, type Stan } from '@/logika/pobieranie';
import type { Filtr, Rezerwacja } from '@/logika/typy';

import { klient, ustawWylogowanie } from './klient';
import { idUrzadzenia, MODEL, token, ustawToken } from './sesja';
import { zarejestrujOdswiezanieWTle } from './zadanieTla';
import { zglos } from './zglos';

/** Co ile odświeżamy rezerwacje, gdy aplikacja jest na ekranie (jak setInterval w PWA). */
const CO_MS = 30 * 1000;
/** Konto i słowniki (atrakcje, dodatki) — rzadziej. */
const PELNE_CO_MS = 10 * 60 * 1000;
/** Całe odświeżanie (kilka zapytań) nie może trwać dłużej — inaczej „zawieszone” połączenie blokowałoby kolejne próby. */
const LIMIT_MS = 40 * 1000;

const czekaj = (ms: number) => new Promise((r) => setTimeout(r, ms));

function zLimitem<T>(p: Promise<T>, ms: number): Promise<T> {
  let zegar: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, odrzuc) => {
    zegar = setTimeout(() => odrzuc(new BladApi('siec', 'Brak połączenia z internetem. Spróbuj ponownie za chwilę.', 0, 'limit całego odświeżania')), ms);
  });
  return Promise.race([p, limit]).finally(() => clearTimeout(zegar));
}

type Kontekst = Stan & {
  /** null = jeszcze sprawdzamy (ekran startowy) */
  zalogowany: boolean | null;
  /** trwa pobieranie */
  odswiezam: boolean;
  /** ostatnie odświeżenie się nie udało: komunikat (np. brak internetu) — dane są z pamięci telefonu */
  bladOdswiezania: string | null;
  filtr: Filtr;
  ustawFiltr: (f: Filtr) => void;
  /** rezerwacje „⚠ Niedoszłe” (osobne pobranie, tylko gdy ten filtr jest wybrany) */
  niedoszle: Rezerwacja[] | null;
  odswiez: (pelne?: boolean) => Promise<boolean>;
  zaloguj: (login: string, haslo: string) => Promise<void>;
  wyloguj: () => Promise<void>;
  /** po zmianie na serwerze (zadatek, edycja…) — od razu w kalendarzu */
  zastosuj: (r: Rezerwacja) => void;
  usunLokalnie: (id: number) => void;
  /** po zmianie hasła / resecie */
  ustawKonto: (k: DaneKonta) => void;
};

const Ctx = createContext<Kontekst | null>(null);

export function useDane(): Kontekst {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDane poza DaneProvider');
  return c;
}

/** Wygodny skrót: zalogowany użytkownik (po zalogowaniu zawsze jest). */
export function useUzytkownik() {
  const { konto } = useDane();
  return konto?.uzytkownik ?? null;
}

export function DaneProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [stan, setStan] = useState<Stan>(PUSTY_STAN);
  const [zalogowany, setZalogowany] = useState<boolean | null>(null);
  const [odswiezam, setOdswiezam] = useState(false);
  const [bladOdswiezania, setBlad] = useState<string | null>(null);
  const [filtr, setFiltr] = useState<Filtr>('all');
  const [niedoszle, setNiedoszle] = useState<Rezerwacja[] | null>(null);
  /** od kiedy trwa odświeżanie (0 = nie trwa) */
  const trwaOd = useRef(0);
  const ostatniePelne = useRef(0);
  const nieudane = useRef(0);

  const wylogujLokalnie = useCallback(async () => {
    await ustawToken(null);
    await wyczyscPamiec(db);
    setStan(PUSTY_STAN);
    setNiedoszle(null);
    setFiltr('all');
    setZalogowany(false);
  }, [db]);

  useEffect(() => ustawWylogowanie(() => void wylogujLokalnie()), [wylogujLokalnie]);

  const odswiez = useCallback(
    async (pelne = false): Promise<boolean> => {
      // Poprawka: wcześniej „zawieszone” zapytanie blokowało odświeżanie do ponownego uruchomienia aplikacji.
      if ((trwaOd.current && Date.now() - trwaOd.current < LIMIT_MS + 5000) || !(await token())) return false;
      const moje = Date.now();
      trwaOd.current = moje;
      setOdswiezam(true);
      const czyPelne = pelne || Date.now() - ostatniePelne.current > PELNE_CO_MS;
      try {
        let nowe;
        try {
          nowe = await zLimitem(pobierzZSerwera(db, klient, czyPelne), LIMIT_MS);
        } catch (e) {
          // po wybudzeniu telefonu sieć często wstaje sekundę później — jedna ponowna próba, zanim pokażemy pasek
          if (!toBrakSieci(e)) throw e;
          await czekaj(2500);
          nowe = await zLimitem(pobierzZSerwera(db, klient, czyPelne), LIMIT_MS);
        }
        if (czyPelne) ostatniePelne.current = Date.now();
        setStan((s) => ({ ...s, ...nowe }));
        setBlad(null);
        nieudane.current = 0;
        wyslijBledy(db, klient, { id: await idUrzadzenia(), model: MODEL }).catch(() => {});
        return true;
      } catch (e) {
        setBlad(komunikatBledu(e));
        nieudane.current += 1;
        // brak sieci zwykle nie jest błędem aplikacji, ale gdy powtarza się uparcie — zapisz do logu z przyczyną
        if (!toBrakSieci(e) || nieudane.current === 3) {
          const przyczyna = e instanceof BladApi && e.przyczyna ? ` [${e.przyczyna}]` : '';
          zglos(e, { dopisek: `Odświeżanie (nieudane ${nieudane.current}×)${przyczyna}` });
        }
        return false;
      } finally {
        if (trwaOd.current === moje) {
          trwaOd.current = 0;
          setOdswiezam(false);
        }
      }
    },
    [db],
  );

  // Start: najpierw dane z pamięci telefonu (od razu, także bez internetu), potem świeże z serwera.
  useEffect(() => {
    let aktywny = true;
    (async () => {
      const t = await token();
      if (!t) {
        if (aktywny) setZalogowany(false);
        return;
      }
      const z = await wczytajZPamieci(db);
      if (!aktywny) return;
      setStan(z);
      setZalogowany(true);
      odswiez(true);
      zarejestrujOdswiezanieWTle();
    })();
    return () => {
      aktywny = false;
    };
  }, [db, odswiez]);

  // Co 30 s na ekranie + od razu po powrocie do aplikacji.
  useEffect(() => {
    if (!zalogowany) return;
    let zegar: ReturnType<typeof setInterval> | null = setInterval(() => odswiez(), CO_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        odswiez();
        if (!zegar) zegar = setInterval(() => odswiez(), CO_MS);
      } else if (zegar) {
        clearInterval(zegar);
        zegar = null;
      }
    });
    return () => {
      sub.remove();
      if (zegar) clearInterval(zegar);
    };
  }, [zalogowany, odswiez]);

  // „⚠ Niedoszłe” — osobna lista z serwera, gdy ten filtr jest wybrany
  useEffect(() => {
    if (filtr !== 'niedoszle' || !zalogowany) return;
    let aktywny = true;
    (async () => {
      try {
        const { od, do: doDnia } = zakresPobierania(dzisStr());
        const j = await klient<{ rezerwacje: Rezerwacja[] }>('rezerwacje', { parametry: { od, do: doDnia, filtr: 'niedoszle' } });
        if (aktywny) setNiedoszle(j.rezerwacje);
      } catch (e) {
        if (aktywny) {
          setNiedoszle([]);
          setBlad(komunikatBledu(e));
        }
      }
    })();
    return () => {
      aktywny = false;
    };
  }, [filtr, zalogowany, stan.pobrano]);

  const zaloguj = useCallback(
    async (login: string, haslo: string) => {
      const j = await klient<{ token: string }>('zaloguj', {
        body: { login: login.trim(), haslo, urzadzenie: await idUrzadzenia(), model: MODEL },
      });
      await ustawToken(j.token);
      ostatniePelne.current = 0;
      const ok = await odswiez(true);
      if (!ok) {
        // zalogowano, ale danych nie udało się pobrać — spróbuj raz jeszcze, potem i tak wpuść (odświeży się samo)
        await odswiez(true);
      }
      setZalogowany(true);
      zarejestrujOdswiezanieWTle();
    },
    [odswiez],
  );

  const wyloguj = useCallback(async () => {
    try {
      await klient('wyloguj', { body: {}, czasMs: 5000 });
    } catch {
      /* bez internetu — i tak wylogowujemy telefon */
    }
    await wylogujLokalnie();
  }, [wylogujLokalnie]);

  const zastosuj = useCallback((r: Rezerwacja) => {
    setStan((s) => ({ ...s, rezerwacje: podmienRezerwacje(s.rezerwacje, r) }));
    setNiedoszle((n) => (n ? podmienRezerwacje(n, r) : n));
  }, []);

  const usunLokalnie = useCallback((id: number) => {
    setStan((s) => ({ ...s, rezerwacje: s.rezerwacje.filter((r) => r.id !== id) }));
    setNiedoszle((n) => (n ? n.filter((r) => r.id !== id) : n));
  }, []);

  const ustawKonto = useCallback((k: DaneKonta) => setStan((s) => ({ ...s, konto: k })), []);

  const wartosc = useMemo<Kontekst>(
    () => ({
      ...stan,
      zalogowany,
      odswiezam,
      bladOdswiezania,
      filtr,
      ustawFiltr: setFiltr,
      niedoszle,
      odswiez,
      zaloguj,
      wyloguj,
      zastosuj,
      usunLokalnie,
      ustawKonto,
    }),
    [stan, zalogowany, odswiezam, bladOdswiezania, filtr, niedoszle, odswiez, zaloguj, wyloguj, zastosuj, usunLokalnie, ustawKonto],
  );

  return <Ctx.Provider value={wartosc}>{children}</Ctx.Provider>;
}
