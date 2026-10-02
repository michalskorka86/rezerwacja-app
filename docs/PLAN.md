# Rezerwacja App — aplikacja na Androida: plan (02.10.2026)

Następca PWA „RezerwacjaApp” (filedops.pl/rezerwacjaapp/, PHP + MySQL). Wzorce techniczne z SILT Lista
(github.com/michalskorka86/silt-lista-app): Expo + expo-router, testy w Node, test API PHP w GitHub Actions,
APK z Releases, aktualizacje „w powietrzu”, zgłaszanie błędów.

## Ustalenia (od Michała, 02.10)
- **Rodzaj:** aplikacja na Androida — Expo (najnowsze SDK, jak SILT Lista: 57), React Native, TypeScript, expo-router.
- **Wygląd:** 1:1 jak PWA — kolory z `style.css` (`:root`), czcionka DM Sans, jasny motyw, układ i emoji bez zmian.
  Zmiany wyglądu tylko po uzgodnieniu z Michałem.
- **Serwer:** backend PHP na filedops.pl zostaje. Aplikacja rozmawia z API; brakujące akcje dopisujemy.
- **Repozytorium:** github.com/michalskorka86/rezerwacja-app (publiczne). Konto Expo to samo co SILT Lista (`michal198926s-team`).
- **Dystrybucja:** bez Google Play. APK z GitHub Releases („Buduj APK (szybko)” = `eas build --local` na GitHub Actions),
  stały link przez PHP na serwerze (`apk.php`), w aplikacji pasek „📥 Jest nowa wersja aplikacji”.
- **Poprawki:** EAS Update (runtimeVersion = fingerprint), wysyłane SAME commitem z „[aktualizacja]” w opisie
  (Michał nie ma przycisku „Run workflow”). Nowy APK tylko przy nowych modułach natywnych — wtedy mówię o tym wprost.
- **Błędy:** ekran „Coś poszło nie tak / Spróbuj ponownie” + zgłoszenie na serwer + strona z logiem błędów.
- **UI:** komunikaty po polsku, bez żargonu, duże przyciski, zawsze „Anuluj”. Liczby przez własną klawiaturę aplikacji
  (systemowa tylko przy tekście, telefonie, e-mailu).
- **Kod:** nazwy domenowe po polsku (rezerwacja, atrakcja, dodatek, zadatek, wynajem, zadanie…).
  Przed każdym commitem: `tsc`, lint, testy logiki w Node, test API PHP.
- **Bezpieczeństwo:** żadnych haseł/tokenów/kluczy w repo; `config.php` zostaje tylko na serwerze; bez danych klientów w repo.

## Co jest w PWA (przeczytane z paczki)

| Plik | Co robi |
|---|---|
| `index.php` | logowanie login + hasło (sesja PHP, 30 dni) |
| `kalendarz.php` | cała aplikacja (2700 linii): kalendarz, szczegóły, formularze, wynajem, zadania, ustawienia |
| `api.php` | 25 akcji JSON (sesja cookie) |
| `pdf_dzien.php` | rozpiski dnia dla Arsenału (tabela + liczenie sprzętu), druk z przeglądarki |
| `podglad.php` | podgląd tylko do odczytu po tokenie (dla SILT Lista) — **zostaje bez zmian** |
| `instruktor-api.php`, `sync-cron.php` | eksport do Firebase „fieldops” — cron od dawna kończy się błędem tokena |
| `process.php` | zapis z formularza www klienta (wymaga `p24.php`, którego nie ma w paczce) |

Role: `rola` = `pelny` / `podglad` (tylko oglądanie), `rola_nazwa` = `admin` / `instruktor`. Marka użytkownika
(`silt` / `arsenal`) decyduje: własne rezerwacje = kolor atrakcji + edycja, cudze = szara „mini karta” bez edycji.

## Ekrany aplikacji

Wszystkie jak w PWA. „Arkusze” (okna od dołu) zamykane tylko ✕ / „Anuluj” i przyciskiem Wstecz Androida — bez przeciągania
(tak ustalono w PWA).

1. **Logowanie** — login, hasło, „Zaloguj się”. Pamięta logowanie (token w bezpiecznym schowku telefonu).
   Po resecie hasła przez admina od razu ekran „Zmień hasło”.
2. **Kalendarz (ekran główny)**
   - górny pasek: logo marki, filtr ▾ (Wszystkie / 🔔 Nowe z licznikiem / ⚠ Niedoszłe / SILT / ARSENAŁ / Rembertów /
     Wołomin / ⚙️ Ustawienia), 🔍 szukaj, 📅 dzisiaj, 🔄 odśwież, 📄 rozpiski (tylko Arsenał), 👤 imię (wyloguj);
   - przyciski 📦 Wynajem i 📋 Zadania (czerwony licznik moich zadań);
   - zakładki Tydzień / Miesiąc / Dzień;
   - pasek dni (wczoraj … +13 dni, kropka = są rezerwacje), legenda kolorów atrakcji;
   - „Tydzień” = lista dni z kartami (dzień po dniu, przewija się do dzisiaj, święta na czerwono, „Brak rezerwacji”);
   - karta: `P12 os · Imię · telefon`, godziny, atrakcja + emoji dodatków, ▼ rozwija odznaki i uwagi, czerwona ramka + NEW
     dla nowych z www; cudze rezerwacje jako mini karta;
   - przycisk na dole „＋ Dodaj rezerwację” (nie dla roli podgląd);
   - odświeżanie co 30 s gdy aplikacja jest na ekranie + przy powrocie do aplikacji.
3. **Szczegóły rezerwacji** — nagłówek w kolorze karty, osoby, telefon (📲 dzwoni), e-mail, zadatek, dodatki, uwagi,
   instrukcje dla instruktora, „Dodano”. Dla własnych: przełącznik zadatku + 📧 mail o zadatku, przełącznik potwierdzenia
   + 📧 potwierdzenie (z „wyślij ponownie”), ✏️ Edytuj, 📋 Kopiuj, 🗑 Usuń (z „Anuluj”). Dla wszystkich: 📤 Udostępnij (obrazek).
4. **Dodaj / Edytuj / Kopia rezerwacji** — jeden formularz: (Arsenał: najpierw wybór Rembertów/Wołomin), liczba osób
   (klawiatura aplikacji) + przycisk P, imię i nazwisko, telefon, e-mail, DATA / OD / DO, kafelki atrakcji, dodatki
   (lista z cenami), zadatek, uwagi, instrukcje. Okna: kalendarz do wyboru daty, siatka godzin 7:00–22:30 co 30 min.
   Błąd zapisu: „dane są zachowane — spróbuj ponownie” (jak PWA).
5. **Dzień** — rezerwacje jednego dnia z ‹ › do zmiany dnia.
6. **Miesiąc** — siatka jak Google Calendar, do 3 rezerwacji w dniu + „+N więcej”, dotknięcie dnia → Dzień.
7. **Wynajem sprzętu** — Aktywne / Zwrócone / Wszystkie, SILT / Arsenał, lista (status, kwota, zapłacono),
   „✓ Zwrócono”, edycja, usuwanie, 📤 obrazek z zielonym nagłówkiem `#00FF7F`. Formularz: klient, daty, sprzęt
   z − / + (9 pozycji z PWA), kwota (klawiatura aplikacji), płatność, zapłacono, dane do faktury, uwagi.
8. **Zadania** — zakładki osób, aktywne z kolorem priorytetu, wykonane wyszarzone, dodawanie (dla kogo, tytuł,
   priorytet, termin, opis).
9. **Ustawienia** — Konto + 🔑 Zmień hasło; admin: Użytkownicy (dodaj, reset hasła, aktywuj/dezaktywuj),
   🔔 Powiadomienia SMS. Nowe (z SILT Lista): 📨 Zgłoś problem, wersja aplikacji, ⬇️ sprawdź aktualizację.
10. **Rozpiski dnia (Arsenał)** — wybór dnia i lokalizacji, tabela grup i liczenie sprzętu jak `pdf_dzien.php`,
    🖨️ Drukuj / 📤 PDF (generowany w telefonie).
11. **Coś poszło nie tak** — przy awarii ekranu; „Spróbuj ponownie”, zgłoszenie idzie na serwer samo.

## Co działa bez internetu

| Funkcja | Bez internetu |
|---|---|
| Kalendarz (Tydzień / Dzień / Miesiąc), szczegóły, szukanie, filtr | ✅ z ostatnio pobranych danych (miesiąc wstecz … 6 miesięcy do przodu) + pasek „Brak połączenia — dane z godz. 14:32” |
| Zadzwoń do klienta, udostępnij obrazek rezerwacji | ✅ |
| Wynajem i zadania — podgląd | ✅ ostatni pobrany stan |
| Rozpiski dnia (Arsenał) — podgląd i PDF | ✅ z zapisanych rezerwacji |
| Dodawanie / edycja / zadatek / potwierdzenie / usuwanie | ⏳ **do ustalenia** (pytanie 2) |
| Maile do klienta, logowanie, zmiana hasła, ustawienia admina | ❌ tylko z internetem (jasny komunikat, dane w formularzu zostają) |
| Zgłoszenia błędów | ✅ zapisują się w telefonie i wysyłają przy zasięgu |

Pamięć w telefonie: SQLite (jak SILT Lista) — tabele `rezerwacje`, `atrakcje`, `dodatki`, `wynajmy`, `zadania`, `uzytkownicy`, `bledy`.

## Czego brakuje w API (do dopisania)

Nowe API w osobnym folderze **`rezerwacjaapp/aplikacja-api/`** (obecny `api.php` i PWA działają dalej bez zmian,
oba mogą być używane równolegle). Korzysta z tego samego `config.php` i bazy. Odpowiedzi `{ok, …}` / `{ok:false, kod, msg}`.

1. **Logowanie tokenem** zamiast ciasteczka sesji: `zaloguj` (login, hasło, id telefonu) → token; `wyloguj`; `ja`
   (dane użytkownika, `haslo_reset`). Nagłówek `X-Token` (nie Authorization — hosting go wycina, jak w SILT Lista).
   Nowa tabela `tokeny_aplikacji` (tylko skrót tokenu), blokada po 5 błędnych hasłach na 15 min.
   Dezaktywacja konta / reset hasła unieważnia tokeny.
2. **Rezerwacje z zakresem dat**: `rezerwacje?od=&do=&filtr=` — dziś `get_rezerwacje` zwraca CAŁĄ historię.
3. **Filtr „⚠ Niedoszłe” — błąd w PWA:** zapytanie zawsze wyklucza `oczekuje_na_platnosc`, więc filtr pokazuje pustą listę.
   W nowym API naprawione; w PWA mogę poprawić jedną linijką (jeśli chcesz).
4. **Licznik nowych bez wysyłania SMS:** `count_new` przy okazji wysyła SMS-y o nowych rezerwacjach z www — czyli SMS idzie
   tylko wtedy, gdy ktoś ma otwarte PWA. Propozycja: osobny `cron.php` (co 5 min) wysyła te SMS-y; licznik tylko liczy.
5. **Rozpiski jako dane** (`rozpiska?data=&lok=`) — logika liczenia sprzętu przeniesiona z `pdf_dzien.php`.
6. **Zgłaszanie błędów:** `zglos_blad` + tabela `bledy` + `bledy.php?key=…` (podgląd jak w SILT Lista).
7. **APK:** `apk.php` (pobranie najnowszego APK z Releases) i `apk.php?info` (dla paska „Jest nowa wersja”).
   Do tego `min_wersja_app` w tabeli `ustawienia` (blokada starej wersji).
8. **Brakujące sprawdzenia uprawnień:** `edytuj_wynajem` nie sprawdza marki (każdy może zmienić cudzy wynajem);
   `toggle_status` przyjmuje dowolny status. W nowym API poprawione.
9. **Ustawienia aplikacji:** `OTHER_COLOR`, logo marki i lista sprzętu do wynajmu w odpowiedzi `ja` / `formdata`
   (dziś wpisane w `kalendarz.php`).
10. Reszta akcji — przeniesiona 1:1 z `api.php` (dodaj, edytuj, usuń, zadatek, status, oba maile, wynajem, zadania,
    użytkownicy, SMS, zmiana hasła). Szablony maili: wydzielone do wspólnego pliku `rezerwacjaapp/lib/maile.php`,
    z którego korzysta też `api.php` (PWA wysyła dokładnie te same maile — jedyna zmiana w PWA).

Nowe tabele jako pliki `server/sql/NNN_*.sql` (wgrywane ręcznie w phpMyAdmin), starych nie zmieniamy.

## Bezpieczeństwo — znalezione w paczce (pilne, niezależnie od aplikacji)
- **`instruktor-api.php` i `sync-cron.php` mają wpisane jawnie hasło do bazy i klucz Firebase**, a `instruktor-api.php`
  oddaje dane klientów (z telefonami) każdemu, kto zna krótki stały token w adresie. Proponuję: zmienić hasło do bazy
  w panelu LH.pl (i w `config.php`), a te dwa pliki usunąć albo przepiąć na `config.php` (pytanie 6).
- `index.php` przyjmuje też hasła zapisane w bazie zwykłym tekstem („tymczasowo dla testów”). Nowe API: po udanym
  logowaniu takim hasłem od razu zapisuje je jako bcrypt; w PWA można to zrobić tak samo.
- `.htaccess` nadal ZEZWALA na `ustaw_hasla.php` („Usuń po użyciu!”) — sprawdzić, czy plik jest na serwerze, i usunąć.
- `CURLOPT_SSL_VERIFYPEER => false` przy SMSAPI — do poprawienia w nowym kodzie.
- `sync-cron.log` (325 KB) rośnie co godzinę od błędów Firebase — do wyłączenia razem z cronem, jeśli nieużywany.
- PWA wstawia uwagi z formularza www do strony bez zabezpieczenia (możliwy „wstrzyknięty” kod) — aplikacja natywna
  tego problemu nie ma.

## Etapy

### 0. Przygotowanie (Ty)
- [ ] Utworzyć puste publiczne repo `michalskorka86/rezerwacja-app` (bez README) i dodać sekret `EXPO_TOKEN`
      (ten sam co w SILT Lista).
- [ ] Na expo.dev w `michal198926s-team` utworzyć projekt `rezerwacja-app` i podać mi jego Project ID.
- [ ] Wyeksportować **samą strukturę** bazy rezerwacji (phpMyAdmin → Eksport → „Tylko struktura”) — do testów API.
- [ ] Odpowiedzieć na pytania poniżej.

### 1. Serwer (Claude) — `server/` w repo, wgrywane do `rezerwacjaapp/aplikacja-api/`
- [ ] Logowanie tokenem, `ja`, wylogowanie, blokada prób.
- [ ] Akcje rezerwacji, wynajmu, zadań, ustawień (z poprawkami z punktu „Czego brakuje”).
- [ ] Rozpiski jako dane, zgłaszanie błędów + `bledy.php`, `apk.php`, min. wersja.
- [ ] `cron.php` — SMS o nowych rezerwacjach z www (jeśli się zgodzisz).
- [ ] Test API (`server/testy/test_api.php`) na pustej bazie w GitHub Actions.

### 2. Aplikacja — podstawa (Claude)
- [ ] Projekt Expo (SDK 57), nazwa „Rezerwacje”, pakiet `pl.silt.rezerwacje`, ikona z PWA, kolory i DM Sans z `style.css`.
- [ ] Logowanie, wymuszona zmiana hasła, wylogowanie.
- [ ] Pamięć w telefonie (SQLite) + pobieranie danych w tle, pasek „Brak połączenia”.
- [ ] Kalendarz: Tydzień (lista dni), pasek dni, legenda, filtr, szukanie, święta (liczone dla każdego roku — w PWA tylko 2023–2027).
- [ ] Szczegóły rezerwacji + akcje.
- [ ] Formularz dodaj / edytuj / kopiuj, klawiatura liczb, okna daty i godziny, dodatki.
- [ ] Dzień i Miesiąc.

### 3. Pozostałe moduły (Claude)
- [ ] Wynajem sprzętu (+ obrazek do udostępnienia).
- [ ] Zadania (+ licznik).
- [ ] Ustawienia (konto, użytkownicy, SMS).
- [ ] Rozpiski Arsenału (PDF w telefonie).
- [ ] Udostępnianie rezerwacji jako obrazek.

### 4. Wydawanie (Claude, potem Ty)
- [ ] Workflow: „Sprawdź kod”, „Buduj APK (szybko)”, „Wyślij aktualizację” (automat po „[aktualizacja]”).
- [ ] „Coś poszło nie tak” + zgłoszenia + „📨 Zgłoś problem”.
- [ ] Pasek „📥 Jest nowa wersja aplikacji”, blokada starej wersji.
- [ ] Pierwszy APK — test na telefonach obok PWA (Ty).

### Na później (po uzgodnieniu)
- Powiadomienia push o nowej rezerwacji z www (wymaga nowego APK i projektu Firebase do powiadomień).
- Przeciąganie rezerwacji na inną godzinę/dzień.

## Pytania do Michała (tego nie da się wyczytać z kodu)
1. **Telefony:** kto będzie używał aplikacji i czy wszyscy mają Androida? (PWA ma poprawki pod iPhone/Safari — APK nie zadziała na iPhonie.)
2. **Bez internetu:** wystarczy przeglądanie, czy trzeba też dodawać/zmieniać rezerwacje bez zasięgu (wysłanie później)?
   Wysyłanie później jest ryzykowne przy rezerwacjach, bo dwie osoby mogą w tym czasie zająć ten sam termin.
3. **Stara aplikacja mobilna:** na serwerze był kiedyś `rezerwacjaapp/mobile/api_mobile.php` (MVP „silt-mobile-v2”). Jest tam nadal
   i czy ktoś go używa? Plan zakłada nowy folder `aplikacja-api/`, a stary można usunąć.
4. **SMS o nowych rezerwacjach z www:** przenieść wysyłkę do crona co 5 min (SMS idzie zawsze, nie tylko gdy ktoś ma otwarte PWA)?
5. **Powiadomienia push** (dzwonek w telefonie przy nowej rezerwacji z www) — w pierwszej wersji czy później?
6. **`instruktor-api.php` i `sync-cron.php` (Firebase „fieldops”)** — czy coś jeszcze z tego korzysta? Jeśli nie — usuwamy
   i zmieniamy hasło do bazy.

## Stan
- 02.10: przeczytana paczka PWA i repo SILT Lista, plan gotowy. Czekam na odpowiedzi i repo.
