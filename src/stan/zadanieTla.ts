/**
 * Odświeżanie rezerwacji w tle (Android WorkManager / iOS BackgroundTasks), także przy zamkniętej aplikacji —
 * jak Kalendarz Google: po otwarciu dane są już świeże. System sam wybiera chwilę (zwykle co 15–30 min, częściej przy ładowaniu).
 * Dodatkowo aplikacja odświeża się przy starcie, po powrocie do niej i co 30 s na ekranie (DaneProvider).
 */

import * as BackgroundTask from 'expo-background-task';
import * as SQLite from 'expo-sqlite';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';

import { DB_NAME, migruj } from '@/db/baza';
import { pobierzZSerwera } from '@/logika/pobieranie';

import { klient } from './klient';
import { token } from './sesja';

export const ZADANIE_ODSWIEZ = 'rezerwacje-odswiez';

// Musi być zdefiniowane przy załadowaniu aplikacji (też gdy system uruchamia samo zadanie w tle).
if (Platform.OS !== 'web') {
  TaskManager.defineTask(ZADANIE_ODSWIEZ, async () => {
    try {
      // aplikacja na ekranie odświeża się sama — nie dublujemy (dwa połączenia z bazą naraz)
      if (AppState.currentState === 'active' || !(await token())) return BackgroundTask.BackgroundTaskResult.Success;
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migruj(db);
      await pobierzZSerwera(db, klient, false);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Rejestruje zadanie (raz; kolejne wywołania nic nie zmieniają). Co ok. 15 minut (najkrócej, na ile pozwala system). */
export async function zarejestrujOdswiezanieWTle(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(ZADANIE_ODSWIEZ)) return;
    await BackgroundTask.registerTaskAsync(ZADANIE_ODSWIEZ, { minimumInterval: 15 });
  } catch {
    // bez zadania w tle dane i tak odświeżą się przy otwarciu aplikacji
  }
}
