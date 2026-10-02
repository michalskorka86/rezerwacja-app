# Rezerwacje — aplikacja na Androida (zasady projektu)

Czytaj też `docs/PLAN.md` (ustalenia, ekrany, etapy) i `server/README.md` (wgrywanie API).

## Kontekst
- Następca PWA „RezerwacjaApp” (filedops.pl/rezerwacjaapp/, PHP + MySQL) — kalendarz rezerwacji SILT / Arsenał
  dla pracowników. Wzorce techniczne z SILT Lista (github.com/michalskorka86/silt-lista-app).
- **PWA jest używane na co dzień i musi działać.** Nowe API w osobnym folderze `rezerwacjaapp/aplikacja-api/`;
  w plikach PWA (`api.php`, `kalendarz.php`, `auth.php`, `config.php`…) NIC nie zmieniamy, chyba że Michał wprost poprosi.
- Telefony mają internet cały czas: zapis tylko online, odczyt także z pamięci telefonu; odświeżanie przy starcie,
  przy powrocie do aplikacji, co 30 s na ekranie i w tle.
- Użytkownicy to pracownicy, nie informatycy: duże przyciski, zawsze „Anuluj”, komunikaty po polsku, bez żargonu.
  Liczby (osoby, kwoty, ilości) przez klawiaturę aplikacji; systemowa tylko przy tekście, telefonie, e-mailu.

## Wygląd
- 1:1 jak PWA: kolory z `style.css` (`:root`), czcionka DM Sans, jasny motyw, układ i emoji jak w `kalendarz.php`.
- Zmiany wyglądu tylko po uzgodnieniu z Michałem.
- Arkusze (okna od dołu) zamykane ✕ / „Anuluj” / Wstecz — bez przeciągania w dół (tak ustalono w PWA).

## Kod
- Expo SDK 57, TypeScript strict, expo-router (ekrany w `src/app/`, reszta poza nim).
- Pakiety przez `npx expo install`.
- Nazwy w kodzie domenowym po polsku (rezerwacja, atrakcja, dodatek, zadatek, wynajem, zadanie…); pola danych = kolumny bazy.
- Logika bez React Native (`src/logika`, klient API) — testowana w Node (`testy/`), bez aliasu `@/`.
- Przed każdym commitem: `npx tsc --noEmit`, `npx expo lint`, `npm test` i test API (`sh server/testy/uruchom.sh`).

## Serwer (`server/` → `rezerwacjaapp/aplikacja-api/`)
- PHP 7.4+ bez frameworka, PDO, MariaDB. Wgrywany ręcznie przez FTP (instrukcja: `server/README.md`).
- Baza wspólna z PWA. Nowe tabele tylko z przedrostkiem `app_`, jako kolejne pliki `server/sql/00N_*.sql`;
  tabel PWA nie zmieniamy. `server/testy/schemat_pwa.sql` = struktura bazy PWA, tylko do testów.
- Logika akcji 1:1 z `api.php` PWA; świadome różnice opisane w kodzie jako „Poprawka:”.
- Treść maili do klientów: `server/lib/maile.php` = kopia 1:1 z PWA. Zmiana treści = w obu miejscach.
- Logowanie: token telefonu w nagłówku `X-Token` (w bazie tylko sha256), wersja aplikacji w `X-App-Wersja`.

## Bezpieczeństwo
- Żadnych haseł, tokenów, kluczy (baza, SMTP, SMSAPI, Expo, Firebase) w repozytorium — repo jest publiczne.
- `config.php` (PWA i `aplikacja-api/`) tylko na serwerze.
- Nie commituj danych klientów, zrzutów bazy z danymi ani plików `.env`.

## Android i aktualizacje
- Pakiet: `pl.silt.rezerwacje`. Bez Google Play: APK z GitHub Releases (Actions „Buduj APK (szybko)” = `eas build --local`),
  link `aplikacja-api/apk.php`, w aplikacji pasek „📥 Jest nowa wersja aplikacji”.
- Poprawki JS: EAS Update (runtimeVersion = fingerprint), wysyłane SAME commitem na `main` z „[aktualizacja]” w opisie
  (Michał nie ma przycisku „Run workflow”). Nowy APK tylko przy nowych modułach natywnych — wtedy powiedz o tym Michałowi.
- iPhone (jeden w zespole): decyzja w `docs/PLAN.md` → „iPhone”.
- Katalogi `android/` i `ios/` są generowane — nie edytować ręcznie, konfiguracja w `app.json`.
