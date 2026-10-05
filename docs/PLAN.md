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

## Odpowiedzi Michała (02.10)
- **Telefony:** kilka Androidów + jeden iPhone. APK tylko na Androida; iPhone — patrz „iPhone” niżej.
- **Internet:** w telefonach jest zawsze. Zapis rezerwacji tylko online. Odświeżanie jak w Kalendarzu Google:
  przy włączeniu aplikacji, przy powrocie do niej, co 30 s na ekranie i w tle (zadanie w tle co ok. 15–30 min,
  Android sam wybiera chwilę) + natychmiast po powiadomieniu push.
- **Osobno od PWA:** obecna aplikacja jest używana na co dzień i musi działać. Nowe API w osobnym folderze,
  **zero zmian w plikach PWA** (także szablony maili — kopia w nowym API, nie wspólny plik). Stare `mobile/api_mobile.php`
  zostaje, dopóki nie będzie pewne, że jest zbędne.
- **SMS o rezerwacjach z www:** przenosimy do crona co 5 min (nowy plik). PWA dalej wysyła przez `count_new` —
  znacznik `sms_wyslany` chroni przed podwójnym SMS-em.
- **Powiadomienia push:** robimy (etap 3; wymaga projektu Firebase do powiadomień i nowego APK).
- **`instruktor-api.php`, `sync-cron.php`:** raczej nieużywane — najpierw wyłączyć (nie kasować), po 2 tygodniach usunąć.

## iPhone
APK nie zainstaluje się na iPhonie, a aplikacja na iPhone'a bez App Store wymaga płatnego konta Apple (99 USD/rok).
Opcje: (a) iPhone zostaje na obecnym PWA (działa dalej, nic nie tracimy); (b) ta sama aplikacja wydana jako strona www
(Expo umie zbudować wersję web z tego samego kodu) i dodana do ekranu początkowego iPhone'a — wygląd i funkcje jak w APK,
push na iPhonie działa dla strony dodanej do ekranu; (c) konto Apple + TestFlight. **Decyzja Michała (02.10): (c) — płatne konto Apple** (iPhone szefa).
Plan: Apple Developer Program (99 USD/rok) → budowanie wersji na iPhone'a na GitHubie (maszyny macOS są darmowe
dla publicznego repo, bez kolejki Expo) → instalacja przez TestFlight. Poprawki JS przez EAS Update jak na Androidzie.

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
| Dodawanie / edycja / zadatek / potwierdzenie / usuwanie | ❌ tylko z internetem (internet w telefonach jest zawsze; dane w formularzu zostają przy błędzie) |
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
5. **Rozpiski** — liczone w telefonie z pobranych rezerwacji (port `oblicz_sprzet()` z `pdf_dzien.php`, test w Node),
   więc działają też bez zasięgu; serwer nie potrzebuje nowej akcji.
6. **Zgłaszanie błędów:** `zglos_blad` + tabela `bledy` + `bledy.php?key=…` (podgląd jak w SILT Lista).
7. **APK:** `apk.php` (pobranie najnowszego APK z Releases) i `apk.php?info` (dla paska „Jest nowa wersja”).
   Do tego `min_wersja_app` w tabeli `ustawienia` (blokada starej wersji).
8. **Brakujące sprawdzenia uprawnień:** `edytuj_wynajem` nie sprawdza marki (każdy może zmienić cudzy wynajem);
   `toggle_status` przyjmuje dowolny status. W nowym API poprawione.
9. **Ustawienia aplikacji:** `OTHER_COLOR`, logo marki i lista sprzętu do wynajmu w odpowiedzi `ja` / `formdata`
   (dziś wpisane w `kalendarz.php`).
10. Reszta akcji — przeniesiona 1:1 z `api.php` (dodaj, edytuj, usuń, zadatek, status, oba maile, wynajem, zadania,
    użytkownicy, SMS, zmiana hasła). Szablony maili skopiowane do nowego API (PWA bez zmian).
11. **Push:** `zarejestruj_push` (token Expo telefonu) + wysyłka przez Expo Push z crona przy nowej rezerwacji z www.

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
- [x] Utworzyć puste publiczne repo `michalskorka86/rezerwacja-app` (bez README) i dodać sekret `EXPO_TOKEN`
      (ten sam co w SILT Lista).
- [x] Na expo.dev w `michal198926s-team` utworzyć projekt `rezerwacja-app` i podać mi jego Project ID.
- [x] Wyeksportować **samą strukturę** bazy rezerwacji (phpMyAdmin → Eksport → „Tylko struktura”) — do testów API.
- [x] Odpowiedzieć na pytania poniżej.

### 1. Serwer (Claude) — `server/` w repo, wgrywane do `rezerwacjaapp/aplikacja-api/`
- [x] Logowanie tokenem, `ja`, wylogowanie, blokada prób (02.10).
- [x] Akcje rezerwacji, wynajmu, zadań, ustawień — z poprawkami z punktu „Czego brakuje” (02.10).
- [x] Zgłaszanie błędów + `bledy.php`, `apk.php`, min. wersja (02.10).
- [x] `cron.php` — SMS o nowych rezerwacjach z www (02.10).
- [x] Test API (`server/testy/uruchom.sh`, ~100 sprawdzeń) na pustej bazie MariaDB, też w GitHub „Sprawdź kod” (02.10).
- [x] Wgranie na serwer (Ty, instrukcja `server/README.md`).

### 2. Aplikacja — podstawa (Claude)
- [x] Projekt Expo (SDK 57), nazwa „Rezerwacje”, pakiet `pl.silt.rezerwacje`, ikona z PWA, kolory i DM Sans z `style.css` (02.10).
- [x] Logowanie, wymuszona zmiana hasła po resecie, wylogowanie (z czyszczeniem danych z telefonu) (02.10).
- [x] Pamięć w telefonie (SQLite) + odświeżanie: start, powrót, co 30 s, w tle; pasek „Brak połączenia — dane z godz.” (02.10).
- [x] Kalendarz: Tydzień, pasek dni, legenda, filtr (z licznikiem nowych), szukanie, święta dla każdego roku + Wigilia od 2025 (02.10).
- [x] Szczegóły rezerwacji + akcje: zadatek, potwierdzenie, oba maile, usuń, zadzwoń, 📤 obrazek do udostępnienia (02.10).
- [x] Formularz dodaj / edytuj / kopiuj, klawiatura liczb, okna daty i godziny, dodatki; Arsenał: wybór lokalizacji; „Zamknąć bez zapisywania?” (02.10).
- [x] Dzień i Miesiąc (02.10).

### 3. Pozostałe moduły (Claude)
- [x] Wynajem sprzętu (+ obrazek do udostępnienia).
- [x] Zadania (+ licznik).
- [x] Ustawienia (konto, użytkownicy, SMS) (02.10).
- [x] Rozpiski Arsenału (PDF w telefonie) (02.10).
- [x] Udostępnianie rezerwacji jako obrazek (02.10).

### 4. Wydawanie (Claude, potem Ty)
- [x] Workflow: „Sprawdź kod”, „Załóż projekt Expo”, „Buduj APK (szybko)” (po „[apk]”), „Wyślij aktualizację” (po „[aktualizacja]”) (02.10).
- [x] „Coś poszło nie tak” + zgłoszenia awarii (02.10). [x] „📨 Zgłoś problem” w Ustawieniach (02.10).
- [x] Pasek „📥 Jest nowa wersja aplikacji” (02.10). [x] Blokada starej wersji: komunikat + sama pobiera aktualizację (02.10).
- [x] Pierwszy APK — test na telefonach obok PWA (Ty).

- [x] Odświeżanie w tle (expo-background-task) (02.10).
- [x] Powiadomienia push (02.10) o nowej rezerwacji z www (nowy APK).

### Na później (po uzgodnieniu)
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
- 02.10: przeczytana paczka PWA i repo SILT Lista, plan gotowy, odpowiedzi Michała wpisane.
- 02.10: etap 1 (serwer) wgrany na filedops.pl i działa (sprawdzone przez Michała).
- 02.10: etap 2a — pierwszy APK (wydanie apk-2): logowanie, kalendarz Tydzień/Miesiąc/Dzień, szczegóły z akcjami.
  Wynajem, Zadania, Ustawienia i rozpiski — okna „w budowie”, następne etapy.
- 02.10: etap 2b — formularz rezerwacji (dodaj / edytuj / kopiuj), wysłany aktualizacją w powietrzu.
  Projekt Expo: michal198926s-team/rezerwacja-app.
  iPhone (konto Apple) — na koniec, gdy aplikacja będzie gotowa (decyzja Michała).
- 02.10: etap 3 — Wynajem sprzętu i Zadania (aktualizacja w powietrzu, bez nowego APK). Listy zapisane w telefonie,
  filtry i zakładki liczone w telefonie. Wstecz w telefonie w formularzu = „← wróć do listy” (z pytaniem, gdy coś wpisano).
- 02.10: Michał zgodził się: licznik otwartych zadań przy imieniu w zakładkach i „⚠️ Po terminie” na czerwono.
- 02.10: poprawka „brak połączenia” — pasek nie znikał i dotknięcie nic nie robiło (zawieszone zapytanie blokowało
  kolejne odświeżanie do restartu). Teraz: limit czasu także na czytanie odpowiedzi i na całe odświeżanie,
  jedna ponowna próba po 2,5 s, „⏳ Odświeżam…” po dotknięciu, zadanie w tle nie działa, gdy aplikacja jest na ekranie,
  a po 3 nieudanych próbach z rzędu zgłoszenie z przyczyną trafia do logu błędów (bledy.php).
- 02.10: etap 4 — Ustawienia (Konto, 🔑 hasło, admin: Użytkownicy i 🔔 SMS; nowe: wersja, ⬇️ sprawdź aktualizację,
  📨 Zgłoś problem, Wyloguj) i Rozpiski Arsenału (podgląd w telefonie, 🖨️ Drukuj, 📤 PDF z tym samym wyglądem co
  pdf_dzien.php, liczone z zapisanych rezerwacji — także bez zasięgu). Bez nowego APK (expo-print był w apk-2).
  Wybory w formularzach (rola, marka, lokalizacja) jako duże przyciski zamiast rozwijanych list.
  Zostało: powiadomienia push (nowy APK + Firebase), iPhone na koniec.
- 02.10: etap 5 — powiadomienia push. Firebase: projekt „Rezerwacje SILT” (rezerwacje-silt), aplikacja Android
  pl.silt.rezerwacje; google-services.json jako sekret GitHuba GOOGLE_SERVICES_JSON (workflow zapisuje go przed
  budowaniem i aktualizacją, .easignore przepuszcza go do buildu); klucz konta usługi wgrany na expo.dev (FCM V1).
  Serwer: lib/push.php, akcja push_zarejestruj, cron.php wysyła push o nowej rezerwacji z www (ostatnie 2 h, raz,
  do telefonów tej samej marki), sql/002_push.sql. Aplikacja: expo-notifications (NOWY MODUŁ → nowy APK),
  kanał „Nowe rezerwacje”, dotknięcie otwiera szczegóły rezerwacji.
- 05.10: cron w LH.pl ustawiony (php81 …/aplikacja-api/cron.php co 5 min). Ustawienia → „🔔 Wyślij próbne powiadomienie”
  z diagnozą (zgoda, Firebase, cron, ostatnia z www). Decyzja Michała: w ARSENALE push także o rezerwacji wpisanej
  przez zespół — z aplikacji od razu (do pozostałych telefonów marki, bez telefonu autora), z PWA przez cron;
  potem także SILT (Kuba wpisuje ręcznie). Stała PUSH_REZERWACJE_ZESPOLU w server/lib/push.php.
- 05.10 wieczorem: rezerwacja z www bez powiadomienia. Poprawka: zamiast okna „ostatnie 2 h” (wrażliwe na różnicę
  zegarów PHP/bazy) próg numeru rezerwacji app_push_od_id; cron zapisuje start i błąd (app_cron_ostatnio,
  app_cron_blad) — widać w teście powiadomień.
