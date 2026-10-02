/** Adres API na serwerze (folder aplikacja-api obok PWA). Do testów można podmienić zmienną EXPO_PUBLIC_API_URL. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://filedops.pl/rezerwacjaapp/aplikacja-api/api.php';

/** Strona z najnowszym APK (przekierowuje do wydania na GitHubie). */
export const APK_URL = API_URL.replace(/api\.php$/, 'apk.php');
