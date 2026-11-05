/**
 * Automatyczny zapis PDF umowy w telefonie (Android): za pierwszym razem pracownik wybiera folder
 * (np. Pobrane/Umowy) — telefon pamięta zgodę, potem każda umowa zapisuje się tam sama.
 * Adres folderu w SecureStore (nie znika po wylogowaniu). iPhone: zapis przez „Zachowaj w Plikach” w menu udostępniania.
 */

import { Directory, File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KLUCZ = 'folder_umow';

export const zapisDostepny = Platform.OS === 'android';

export async function folderUmow(): Promise<string | null> {
  if (!zapisDostepny) return null;
  return SecureStore.getItemAsync(KLUCZ);
}

/** Czytelna nazwa folderu z adresu SAF, np. „Download/Umowy”. */
export function nazwaFolderu(uri: string | null): string {
  if (!uri) return '';
  const ost = decodeURIComponent(uri.split('/tree/')[1] ?? uri).split('/document/')[0];
  return ost.replace(/^primary:/, '') || 'pamięć telefonu';
}

/** Okno systemowe wyboru folderu; null = pracownik anulował. */
export async function wybierzFolderUmow(): Promise<string | null> {
  try {
    const d = await Directory.pickDirectoryAsync();
    await SecureStore.setItemAsync(KLUCZ, d.uri);
    return d.uri;
  } catch {
    return null;
  }
}

/** Bezpieczna nazwa pliku: „Umowa najmu - Jan Kowalski - 2026-11-05.pdf”. */
export function nazwaPlikuUmowy(imie: string, data: string | null): string {
  const czysta = (imie || 'najemca').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return `Umowa najmu - ${czysta}${data ? ' - ' + data : ''}.pdf`;
}

/**
 * Kopiuje gotowy PDF (z expo-print) do wybranego folderu. Zwraca nazwę folderu albo null, gdy folderu brak
 * lub zgoda wygasła (wtedy adres jest zapominany — przy następnej umowie telefon zapyta o folder od nowa).
 */
export async function zapiszUmoweWTelefonie(pdfUri: string, nazwaPliku: string): Promise<string | null> {
  const uri = await folderUmow();
  if (!uri) return null;
  try {
    const dane = await new File(pdfUri).bytes();
    const cel = new Directory(uri).createFile(nazwaPliku.replace(/\.pdf$/i, ''), 'application/pdf');
    cel.write(dane);
    return nazwaFolderu(uri);
  } catch {
    await SecureStore.deleteItemAsync(KLUCZ);
    return null;
  }
}
