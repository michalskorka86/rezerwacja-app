/**
 * Klient API (server/api.php). Bez importów React Native — testy w Node z prawdziwym serwerem PHP.
 * Każdy błąd zamieniany na BladApi z komunikatem po polsku, gotowym do pokazania pracownikowi.
 */

export class BladApi extends Error {
  /** kod z serwera (np. 'zaloguj', 'uprawnienia') albo 'siec' / 'serwer' */
  kod: string;
  http: number;
  constructor(kod: string, msg: string, http = 0) {
    super(msg);
    this.name = 'BladApi';
    this.kod = kod;
    this.http = http;
  }
}

export type Klient = <T = Record<string, unknown>>(
  akcja: string,
  opcje?: { body?: unknown; parametry?: Record<string, string | number>; czasMs?: number },
) => Promise<T>;

export type UstawieniaKlienta = {
  url: string;
  wersja: string;
  token: () => string | null | Promise<string | null>;
  /** wywoływane, gdy serwer każe zalogować się ponownie (token nieważny, konto wyłączone) */
  naWylogowanie?: () => void;
  fetchFn?: typeof fetch;
};

const BRAK_SIECI = 'Brak połączenia z internetem. Spróbuj ponownie za chwilę.';

export function utworzKlienta(u: UstawieniaKlienta): Klient {
  return async function klient<T>(
    akcja: string,
    opcje: { body?: unknown; parametry?: Record<string, string | number>; czasMs?: number } = {},
  ): Promise<T> {
    const params = new URLSearchParams({ akcja });
    for (const [k, v] of Object.entries(opcje.parametry ?? {})) params.set(k, String(v));
    const naglowki: Record<string, string> = { Accept: 'application/json', 'X-App-Wersja': u.wersja };
    const token = await u.token();
    if (token) naglowki['X-Token'] = token;
    if (opcje.body !== undefined) naglowki['Content-Type'] = 'application/json';

    const ctrl = new AbortController();
    const zegar = setTimeout(() => ctrl.abort(), opcje.czasMs ?? 15000);
    let odp: Response;
    try {
      odp = await (u.fetchFn ?? fetch)(`${u.url}?${params.toString()}`, {
        method: opcje.body !== undefined ? 'POST' : 'GET',
        headers: naglowki,
        body: opcje.body !== undefined ? JSON.stringify(opcje.body) : undefined,
        signal: ctrl.signal,
      });
    } catch {
      throw new BladApi('siec', BRAK_SIECI);
    } finally {
      clearTimeout(zegar);
    }

    let j: { ok?: boolean; kod?: string; msg?: string } & Record<string, unknown>;
    try {
      j = (await odp.json()) as typeof j;
    } catch {
      throw new BladApi('serwer', `Serwer odpowiedział niezrozumiale (kod ${odp.status}). Spróbuj ponownie za chwilę.`, odp.status);
    }
    if (!odp.ok || j.ok !== true) {
      const kod = String(j.kod ?? 'serwer');
      if (kod === 'zaloguj') u.naWylogowanie?.();
      throw new BladApi(kod, String(j.msg ?? 'Coś poszło nie tak. Spróbuj ponownie.'), odp.status);
    }
    return j as T;
  };
}

/** Czy błąd to brak internetu (wtedy pokazujemy dane z pamięci telefonu). */
export const toBrakSieci = (e: unknown) => e instanceof BladApi && e.kod === 'siec';

/** Komunikat do pokazania pracownikowi dla dowolnego błędu. */
export const komunikatBledu = (e: unknown) => (e instanceof BladApi ? e.message : 'Coś poszło nie tak. Spróbuj ponownie.');
