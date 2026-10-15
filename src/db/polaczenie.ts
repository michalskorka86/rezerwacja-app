/**
 * Jedno połączenie z bazą w telefonie na całą aplikację: ekrany, zgłoszenia błędów i odświeżanie w tle.
 *
 * Poprawka: wcześniej bazę otwierały osobno SQLiteProvider, zgłoszenia błędów i zadanie w tle. expo-sqlite dzieli wtedy
 * jedno połączenie, a gdy system sprzątnął połączenie zadania w tle, zamykało się ono wszystkim — aplikacja po leżeniu
 * w tle pokazywała „Coś poszło nie tak” (w logu: „Access to closed resource”) aż do ponownego uruchomienia.
 * Teraz jest jedno trwałe połączenie, a gdyby mimo to zostało zamknięte — otwieramy je od nowa i powtarzamy operację.
 */

import * as SQLite from 'expo-sqlite';

import { DB_NAME, migruj, type Baza } from './baza';

let polaczenie: Promise<SQLite.SQLiteDatabase> | null = null;

function otworz(): Promise<SQLite.SQLiteDatabase> {
  polaczenie ??= SQLite.openDatabaseAsync(DB_NAME)
    .then(async (d) => {
      await migruj(d);
      return d;
    })
    .catch((e) => {
      polaczenie = null;
      throw e;
    });
  return polaczenie;
}

const zamknieta = (e: unknown) => /closed resource|database is closed|NativeDatabase/i.test(String(e));

async function zBaza<T>(f: (d: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    return await f(await otworz());
  } catch (e) {
    if (!zamknieta(e)) throw e;
    polaczenie = null;
    return f(await otworz());
  }
}

/** Baza aplikacji — zawsze ten sam obiekt (można go podawać do funkcji z src/logika i src/db). */
export const baza: Baza = {
  execAsync: (sql) => zBaza((d) => d.execAsync(sql)),
  runAsync: (sql, ...p) => zBaza((d) => d.runAsync(sql, ...p)),
  getFirstAsync: <T>(sql: string, ...p: (string | number | null)[]) => zBaza((d) => d.getFirstAsync<T>(sql, ...p)),
  getAllAsync: <T>(sql: string, ...p: (string | number | null)[]) => zBaza((d) => d.getAllAsync<T>(sql, ...p)),
};
