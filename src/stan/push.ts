/**
 * Powiadomienia push: „🆕 Nowa rezerwacja z www” (wysyła serwer z cron.php przez Expo Push → Firebase).
 * Telefon po zalogowaniu i przy każdym starcie podaje serwerowi swój adres powiadomień (push_zarejestruj).
 * Dotknięcie powiadomienia otwiera aplikację na tej rezerwacji.
 */

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

/**
 * Pyta o zgodę (raz — Android 13+ pokazuje systemowe okienko), tworzy kanał i wysyła adres na serwer.
 * Nigdy nie rzuca: bez zgody / bez internetu aplikacja działa dalej, spróbuje przy następnym starcie.
 */
export async function zarejestrujPush(): Promise<void> {
  if (naWeb) return;
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
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token || token === zarejestrowano) return;
    await klient('push_zarejestruj', { body: { token } });
    zarejestrowano = token;
  } catch (e) {
    // brak usług Google / brak internetu — nie przeszkadzamy pracownikowi, tylko zapisujemy do logu błędów
    zglos(e, { dopisek: 'Powiadomienia (rejestracja)' });
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
