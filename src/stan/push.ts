/**
 * Powiadomienia push: „🆕 Nowa rezerwacja z www” (wysyła serwer z cron.php przez Expo Push → Firebase).
 * Telefon po zalogowaniu i przy każdym starcie podaje serwerowi swój adres powiadomień (push_zarejestruj).
 * Dotknięcie powiadomienia otwiera aplikację na tej rezerwacji.
 */

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { komunikatBledu } from '@/logika/klient';

import { klient } from './klient';
import { zglos } from './zglos';

export const KANAL = 'rezerwacje';

const naWeb = Platform.OS === 'web';

if (!naWeb) {
  // Gdy aplikacja jest otwarta, powiadomienie też się pokazuje (z dźwiękiem).
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

let zarejestrowano = '';

/** Wynik rejestracji — do „🔔 Wyślij próbne powiadomienie” w Ustawieniach (pokazuje, na którym kroku jest problem). */
export type WynikPush = { ok: true; token: string } | { ok: false; krok: 'zgoda' | 'adres' | 'serwer' | 'web'; blad: string };

/**
 * Pyta o zgodę (raz — Android 13+ pokazuje systemowe okienko), tworzy kanał i wysyła adres na serwer.
 * Nigdy nie rzuca: bez zgody / bez internetu aplikacja działa dalej, spróbuje przy następnym starcie.
 * `wymus` — wyślij adres na serwer nawet, gdy już był wysłany (test w Ustawieniach).
 */
export async function zarejestrujPush(wymus = false): Promise<WynikPush> {
  if (naWeb) return { ok: false, krok: 'web', blad: 'Powiadomienia działają tylko w aplikacji na telefonie.' };
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(KANAL, {
        name: 'Nowe rezerwacje',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2C6E3F',
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') {
      return { ok: false, krok: 'zgoda', blad: 'Brak zgody na powiadomienia. Ustawienia telefonu → Aplikacje → Rezerwacje → Powiadomienia → włącz.' };
    }
  } catch (e) {
    zglos(e, { dopisek: 'Powiadomienia (zgoda)' });
    return { ok: false, krok: 'zgoda', blad: String(e) };
  }
  let token: string;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  } catch (e) {
    // zwykle: brak usług Google Play albo problem z Firebase
    zglos(e, { dopisek: 'Powiadomienia (adres telefonu)' });
    return { ok: false, krok: 'adres', blad: e instanceof Error ? e.message : String(e) };
  }
  if (!wymus && token === zarejestrowano) return { ok: true, token };
  try {
    await klient('push_zarejestruj', { body: { token } });
    zarejestrowano = token;
    return { ok: true, token };
  } catch (e) {
    return { ok: false, krok: 'serwer', blad: komunikatBledu(e) };
  }
}

/** Po wylogowaniu adres jest usuwany na serwerze razem z logowaniem — tu tylko zapominamy, że był wysłany. */
export const zapomnijPush = () => {
  zarejestrowano = '';
};

/** Id rezerwacji z dotkniętego powiadomienia (albo null). */
export function rezerwacjaZPowiadomienia(r: Notifications.NotificationResponse | null | undefined): { id: number; data: string | null } | null {
  const d = r?.notification.request.content.data as { rezerwacja_id?: unknown; data?: unknown } | undefined;
  const id = Number(d?.rezerwacja_id);
  return id > 0 ? { id, data: typeof d?.data === 'string' ? d.data : null } : null;
}

/**
 * Dotknięcie powiadomienia (także takie, które uruchomiło aplikację) → cb z id rezerwacji. Zwraca „przestań słuchać”.
 * Obsłużone powiadomienie jest zapominane, żeby nie otwierało się przy każdym starcie.
 */
export function sluchajDotkniec(cb: (r: { id: number; data: string | null }) => void): () => void {
  if (naWeb) return () => {};
  const obsluz = (odp: Notifications.NotificationResponse | null) => {
    const r = rezerwacjaZPowiadomienia(odp);
    if (!r) return;
    cb(r);
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  };
  Notifications.getLastNotificationResponseAsync().then(obsluz).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(obsluz);
  return () => sub.remove();
}

/** Powiadomienie przyszło, gdy aplikacja jest otwarta → cb (np. od razu odśwież kalendarz). */
export function sluchajPowiadomien(cb: () => void): () => void {
  if (naWeb) return () => {};
  const sub = Notifications.addNotificationReceivedListener(() => cb());
  return () => sub.remove();
}
