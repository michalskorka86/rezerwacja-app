/**
 * Daty po polsku — jak funkcje pomocnicze w kalendarz.php (pad, dStr, formatGodz…).
 * Daty rezerwacji to tekst RRRR-MM-DD (czas polski); obiekty Date tworzymy w południe, żeby zmiana czasu nie przesuwała dnia.
 * Bez importów React Native — testy w Node.
 */

export const DNI_KROTKO = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
export const DNI_PELNE = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
export const MIESIACE_KROTKO = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
export const MIESIACE = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
/** Nagłówek kalendarza od poniedziałku */
export const DNI_TYGODNIA = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

export const pad = (n: number) => (n < 10 ? '0' + n : '' + n);

/** Date → 'RRRR-MM-DD' (czas lokalny) */
export const dStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const dzisStr = (teraz: Date = new Date()) => dStr(teraz);

/** 'RRRR-MM-DD' → Date (w południe) */
export const zData = (ds: string) => new Date(ds + 'T12:00:00');

/** Przesunięcie daty o n dni */
export function dodajDni(ds: string, n: number): string {
  const d = zData(ds);
  d.setDate(d.getDate() + n);
  return dStr(d);
}

/** '9:5:00' / '09:05:00' → '09:05' (formatGodz z PWA) */
export function formatGodz(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  return pad(parseInt(h || '0', 10) || 0) + ':' + pad(parseInt(m || '0', 10) || 0);
}

/** '09:00' i '11:30' → '09:00–11:30' (bez końca: samo '09:00') */
export const godziny = (od: string | null, doG: string | null, sep = '–') =>
  formatGodz(od) + (doG ? sep + formatGodz(doG) : '');

/** '2026-10-02' → '2 paź' */
export function krotkaData(ds: string): string {
  const d = zData(ds);
  return `${d.getDate()} ${MIESIACE_KROTKO[d.getMonth()]}`;
}

/** '2026-10-02' → '2 paź 2026' (formatDatePL z PWA) */
export function dataZRokiem(ds: string | null): string {
  if (!ds) return 'Wybierz';
  const d = zData(ds);
  return `${d.getDate()} ${MIESIACE_KROTKO[d.getMonth()]} ${d.getFullYear()}`;
}

/** '2026-10-02' → 'Piątek 2 paź' (tytuł widoku dnia) */
export function tytulDnia(ds: string): string {
  const d = zData(ds);
  return `${DNI_PELNE[d.getDay()]} ${d.getDate()} ${MIESIACE_KROTKO[d.getMonth()]}`;
}

/** '2026-10-02 14:05:33' → '2026-10-02 14:05' („Dodano” w szczegółach) */
export const krotkiCzas = (s: string | null) => (s ? s.slice(0, 16).replace('T', ' ') : '—');

/** Pierwszy dzień miesiąca (RRRR-MM-01) przesunięty o n miesięcy */
export function miesiac(ds: string, n = 0): string {
  const d = zData(ds);
  return dStr(new Date(d.getFullYear(), d.getMonth() + n, 1, 12));
}

/** Siatka miesiąca od poniedziałku: tablica tygodni, null = pusta komórka */
export function siatkaMiesiaca(pierwszy: string): (string | null)[][] {
  const d = zData(pierwszy);
  const rok = d.getFullYear();
  const mies = d.getMonth();
  const ileDni = new Date(rok, mies + 1, 0).getDate();
  const przesuniecie = (new Date(rok, mies, 1).getDay() + 6) % 7;
  const komorki: (string | null)[] = Array(przesuniecie).fill(null);
  for (let dzien = 1; dzien <= ileDni; dzien++) komorki.push(`${rok}-${pad(mies + 1)}-${pad(dzien)}`);
  while (komorki.length % 7 !== 0) komorki.push(null);
  const tygodnie: (string | null)[][] = [];
  for (let i = 0; i < komorki.length; i += 7) tygodnie.push(komorki.slice(i, i + 7));
  return tygodnie;
}

/** Zakres pobierania rezerwacji: miesiąc wstecz … ok. 6 miesięcy do przodu (jak instruktor-api / podgląd). */
export function zakresPobierania(dzis: string): { od: string; do: string } {
  return { od: dodajDni(dzis, -31), do: dodajDni(dzis, 190) };
}
