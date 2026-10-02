/**
 * Zgłoszenia błędów: awaria aplikacji albo „📨 Zgłoś problem” → tabela `bledy` w telefonie
 * → przy odświeżaniu na serwer (api.php?akcja=blad), skąd Michał je przegląda (bledy.php).
 * Bez zasięgu czekają w telefonie. Bez importów React Native (testy w Node).
 */

import type { Baza } from '../db/baza';
import type { Klient } from './klient';

const MAKS = 50;
const NA_RAZ = 10;

export type Zgloszenie = { ekran?: string; komunikat: string; stos?: string };

export function opisBledu(e: unknown): { komunikat: string; stos?: string } {
  if (e instanceof Error) return { komunikat: `${e.name}: ${e.message}`.slice(0, 500), stos: e.stack?.slice(0, 20000) };
  return { komunikat: String(e).slice(0, 500) };
}

export async function zapiszBlad(db: Baza, z: Zgloszenie): Promise<void> {
  // to samo zgłoszenie w kółko (np. przy każdym odświeżeniu) — zapisujemy raz na 10 minut
  const ost = await db.getFirstAsync<{ czas: string }>(
    "SELECT czas FROM bledy WHERE komunikat = ? AND ifnull(ekran, '') = ? ORDER BY id DESC LIMIT 1",
    z.komunikat.slice(0, 500),
    z.ekran ?? '',
  );
  if (ost && Date.now() - Date.parse(ost.czas) < 10 * 60 * 1000) return;
  await db.runAsync(
    'INSERT INTO bledy (czas, ekran, komunikat, stos) VALUES (?, ?, ?, ?)',
    new Date().toISOString(),
    z.ekran ?? null,
    z.komunikat.slice(0, 500),
    z.stos ?? null,
  );
  await db.runAsync(`DELETE FROM bledy WHERE id NOT IN (SELECT id FROM bledy ORDER BY id DESC LIMIT ${MAKS})`);
}

/** Wysyła czekające zgłoszenia (najstarsze pierwsze). Rzuca błąd klienta przy braku zasięgu. */
export async function wyslijBledy(db: Baza, klient: Klient, urzadzenie: { id: string; model: string }): Promise<number> {
  const w = await db.getAllAsync<{ id: number; ekran: string | null; komunikat: string; stos: string | null }>(
    `SELECT id, ekran, komunikat, stos FROM bledy WHERE wyslano IS NULL ORDER BY id LIMIT ${NA_RAZ}`,
  );
  for (const b of w) {
    await klient('blad', {
      body: { ekran: b.ekran ?? '', komunikat: b.komunikat, stos: b.stos ?? '', urzadzenie: urzadzenie.id, model: urzadzenie.model },
    });
    await db.runAsync('UPDATE bledy SET wyslano = ? WHERE id = ?', new Date().toISOString(), b.id);
  }
  await db.runAsync('DELETE FROM bledy WHERE wyslano IS NOT NULL AND wyslano < ?', new Date(Date.now() - 30 * 86400000).toISOString());
  return w.length;
}
