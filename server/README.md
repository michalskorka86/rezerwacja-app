# Serwer aplikacji Rezerwacje (`aplikacja-api/`)

API dla aplikacji na telefon. Działa **obok** PWA w folderze `rezerwacjaapp/aplikacja-api/` — korzysta z tej samej
bazy i z `config.php` PWA, ale **żadnego pliku PWA nie zmienia**. PWA działa dalej jak dziś.

## Pierwsza instalacja (raz)

1. **Nowe tabele w bazie.** phpMyAdmin → baza `serwer432573_siltrezerwacje` → **Import** → plik `sql/001_aplikacja.sql`
   → „Import”. Powstaną 3 tabele z przedrostkiem `app_` (logowania telefonów, błędne hasła, zgłoszenia błędów).
   Potem tak samo `sql/002_push.sql` (znacznik wysłanych powiadomień push). Tabele PWA zostają bez zmian.
2. **Folder na serwerze.** Przez FTP utwórz folder `rezerwacjaapp/aplikacja-api/` i wgraj do niego:
   - `api.php`, `apk.php`, `bledy.php`, `cron.php`, `config.example.php`, `.htaccess`
   - cały folder `lib/` (razem z jego `.htaccess`)

   **Nie wgrywaj** folderów `testy/` i `sql/` ani `README.md`.
3. **Konfiguracja.** Na serwerze skopiuj `config.example.php` jako `config.php` (w tym samym folderze) i wpisz
   `CRON_KEY` — długi losowy ciąg (np. 40 liter i cyfr). Hasło do bazy, SMTP i SMSAPI są brane z `config.php` PWA.
4. **Cron co 5 minut** (panel LH.pl → Cron → Dodaj):
   `php /home/serwer432573/domains/filedops.pl/public_html/rezerwacjaapp/aplikacja-api/cron.php`
   (albo adres: `https://filedops.pl/rezerwacjaapp/aplikacja-api/cron.php?key=CRON_KEY`).
   Wysyła SMS-y o nowych rezerwacjach z formularza www — także wtedy, gdy nikt nie ma otwartego PWA.
   PWA dalej wysyła je po swojemu; znacznik w bazie pilnuje, żeby SMS nie poszedł dwa razy.
   Ten sam cron wysyła powiadomienia push „🆕 Nowa rezerwacja z www” na telefony zespołu tej marki
   (przez Expo Push; klucz Firebase jest na expo.dev, na serwerze nie ma żadnego klucza).
5. **Sprawdzenie.** Otwórz `https://filedops.pl/rezerwacjaapp/aplikacja-api/api.php?akcja=ja` — ma się pokazać
   `{"ok":false,"kod":"zaloguj","msg":"Zaloguj się"}`. To znaczy, że API działa (i słusznie prosi o logowanie).

## Adresy

| Adres | Do czego |
|---|---|
| `aplikacja-api/api.php?akcja=…` | API aplikacji (opis akcji na górze `api.php`) |
| `aplikacja-api/apk.php` | pobranie najnowszego APK (link dla pracowników) |
| `aplikacja-api/bledy.php?key=CRON_KEY` | zgłoszenia błędów z telefonów |
| `aplikacja-api/cron.php?key=CRON_KEY` | ręczne uruchomienie crona |

## Ustawienia w tabeli `ustawienia` (opcjonalne)

| Klucz | Znaczenie |
|---|---|
| `app_min_wersja` | najstarsza wersja aplikacji, która może zapisywać (np. `1.0.0`); starsza prosi o aktualizację |
| `sms_silt`, `sms_arsenal`, `sms_wynajem` | te same przełączniki SMS co w PWA (Ustawienia → Powiadomienia) |

## Aktualizacja

Wgraj zmienione pliki z `server/` (lista zmian w opisie commita). Nowa zmiana bazy = kolejny plik `sql/00N_….sql`
do zaimportowania raz w phpMyAdmin; starych plików SQL nie importujemy ponownie.

## Test (komputer z PHP i MariaDB 10.10+, albo automatycznie w GitHub „Sprawdź kod”)

```sh
sh server/testy/uruchom.sh 127.0.0.1 użytkownik hasło
```

Tworzy od zera bazę `rez_test` ze struktury PWA (`testy/schemat_pwa.sql` — sama struktura, bez danych klientów),
uruchamia API na `127.0.0.1:8765` z atrapami SMSAPI i GitHuba i sprawdza wszystkie akcje. **Nigdy na serwerze produkcyjnym.**
