/**
 * Pamięć w telefonie (SQLite): ostatnio pobrane dane (do pokazania od razu i bez zasięgu) + zgłoszenia błędów.
 * Migracje przez PRAGMA user_version — starych nie zmieniamy, dopisujemy nowe.
 * Bez importów React Native — testy w Node (testy/baza-node.ts).
 */

export const DB_NAME = 'rezerwacje.db';

/** Minimalny interfejs bazy (expo-sqlite i atrapa w testach). */
export type Baza = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
};

const MIGRACJE: string[] = [
  // 1 — pamięć danych (klucz → JSON) i zgłoszenia błędów
  `CREATE TABLE IF NOT EXISTS pamiec (klucz TEXT PRIMARY KEY NOT NULL, wartosc TEXT NOT NULL, czas TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS bledy (id INTEGER PRIMARY KEY AUTOINCREMENT, czas TEXT NOT NULL, ekran TEXT,
     komunikat TEXT NOT NULL, stos TEXT, wyslano TEXT);`,
];

export async function migruj(db: Baza): Promise<void> {
  const v = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  for (let i = v; i < MIGRACJE.length; i++) {
    await db.execAsync(MIGRACJE[i]);
    await db.execAsync(`PRAGMA user_version = ${i + 1}`);
  }
}

export async function zapiszPamiec(db: Baza, klucz: string, wartosc: unknown): Promise<void> {
  await db.runAsync(
    'INSERT INTO pamiec (klucz, wartosc, czas) VALUES (?, ?, ?) ON CONFLICT(klucz) DO UPDATE SET wartosc = excluded.wartosc, czas = excluded.czas',
    klucz,
    JSON.stringify(wartosc),
    new Date().toISOString(),
  );
}

export async function czytajPamiec<T>(db: Baza, klucz: string): Promise<{ wartosc: T; czas: string } | null> {
  const w = await db.getFirstAsync<{ wartosc: string; czas: string }>('SELECT wartosc, czas FROM pamiec WHERE klucz = ?', klucz);
  if (!w) return null;
  try {
    return { wartosc: JSON.parse(w.wartosc) as T, czas: w.czas };
  } catch {
    return null;
  }
}

/** Po wylogowaniu: dane klientów nie mogą zostać w telefonie. */
export async function wyczyscPamiec(db: Baza): Promise<void> {
  await db.runAsync('DELETE FROM pamiec');
}
