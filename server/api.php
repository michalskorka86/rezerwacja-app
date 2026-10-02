<?php
// ============================================================
// Rezerwacje — API aplikacji na telefon
// Adres: https://filedops.pl/rezerwacjaapp/aplikacja-api/api.php?akcja=…
// Obok PWA, bez zmian w jego plikach. Ta sama baza i config.php PWA (wczytywany przez config.php obok).
//
//   POST zaloguj {login, haslo, urzadzenie, model}    → {token, uzytkownik}
//   POST wyloguj
//   GET  ja                                            → użytkownik + ustawienia aplikacji
//   GET  dane                                          → atrakcje, dodatki
//   GET  rezerwacje &od= &do= &filtr=                  → rezerwacje z zakresu dat
//   GET  licznik                                       → {nowe, zadania}
//   POST rezerwacja_dodaj | rezerwacja_edytuj | rezerwacja_usun
//   POST zadatek {id, oplacony} | potwierdzenie {id, potwierdzona}
//   POST mail_zadatek {id} | mail_potwierdzenie {id}
//   GET  wynajmy &status= &marka=
//   POST wynajem_dodaj | wynajem_edytuj | wynajem_zwroc | wynajem_usun
//   GET  uzytkownicy | zadania &dla_kogo=
//   POST zadanie_dodaj | zadanie_wykonane | zadanie_usun
//   POST zmien_haslo {stare, nowe}
//   GET  uzytkownicy_admin | sms_ustawienia            (admin)
//   POST uzytkownik_dodaj | haslo_reset | uzytkownik_aktywny | sms_ustawienia_zapisz   (admin)
//   POST blad {ekran, komunikat, stos}                 → zgłoszenie błędu (także bez logowania)
//
// Nagłówki: X-Token (po zalogowaniu), X-App-Wersja (zawsze). Treść POST: JSON.
// Odpowiedź: {ok:true, …} albo {ok:false, kod, msg} — msg po polsku, do pokazania użytkownikowi.
// ============================================================

declare(strict_types=1);

require_once __DIR__ . '/lib/wspolne.php';
require_once __DIR__ . '/lib/logowanie.php';
require_once __DIR__ . '/lib/sms.php';
require_once __DIR__ . '/lib/maile.php';
require_once __DIR__ . '/lib/rezerwacje.php';
require_once __DIR__ . '/lib/wynajem.php';
require_once __DIR__ . '/lib/konto.php';
require_once __DIR__ . '/lib/bledy.php';

// Wersja www aplikacji (np. na iPhonie) działa z innego adresu — dostęp tylko tokenem, bez ciasteczek.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Token, X-App-Wersja');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
$metoda = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($metoda === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$akcja = (string)($_GET['akcja'] ?? '');

$odczyt = [
    'ja' => function (array $u) { akcja_ja($u); },
    'dane' => function () { akcja_dane(); },
    'rezerwacje' => function (array $u) { akcja_rezerwacje($u); },
    'licznik' => function (array $u) { akcja_licznik($u); },
    'wynajmy' => function () { akcja_wynajmy(); },
    'uzytkownicy' => function () { akcja_uzytkownicy(); },
    'zadania' => function () { akcja_zadania(); },
    'uzytkownicy_admin' => function (array $u) { akcja_uzytkownicy_admin($u); },
    'sms_ustawienia' => function (array $u) { akcja_sms_ustawienia($u); },
];
$zapis = [
    'rezerwacja_dodaj' => 'akcja_rezerwacja_dodaj',
    'rezerwacja_edytuj' => 'akcja_rezerwacja_edytuj',
    'rezerwacja_usun' => 'akcja_rezerwacja_usun',
    'zadatek' => 'akcja_zadatek',
    'potwierdzenie' => 'akcja_potwierdzenie',
    'mail_zadatek' => 'akcja_mail_zadatek',
    'mail_potwierdzenie' => 'akcja_mail_potwierdzenie',
    'wynajem_dodaj' => 'akcja_wynajem_dodaj',
    'wynajem_edytuj' => 'akcja_wynajem_edytuj',
    'wynajem_zwroc' => 'akcja_wynajem_zwroc',
    'wynajem_usun' => 'akcja_wynajem_usun',
    'zadanie_dodaj' => 'akcja_zadanie_dodaj',
    'zadanie_wykonane' => function (array $u, array $d) { akcja_zadanie_wykonane($d); },
    'zadanie_usun' => function (array $u, array $d) { akcja_zadanie_usun($d); },
    'zmien_haslo' => 'akcja_zmien_haslo',
    'uzytkownik_dodaj' => 'akcja_uzytkownik_dodaj',
    'haslo_reset' => 'akcja_haslo_reset',
    'uzytkownik_aktywny' => 'akcja_uzytkownik_aktywny',
    'sms_ustawienia_zapisz' => 'akcja_sms_ustawienia_zapisz',
];

try {
    if ($akcja === 'zaloguj' || $akcja === 'blad' || $akcja === 'wyloguj' || isset($zapis[$akcja])) {
        if ($metoda !== 'POST') throw new BladApi('metoda', 'Ta akcja wymaga POST', 405);
    }

    if ($akcja === 'zaloguj') {
        akcja_zaloguj(tresc_zadania());
    } elseif ($akcja === 'blad') {
        $u = null;
        if (naglowek('X-Token') !== '') {
            try { $u = wymagaj_uzytkownika(); } catch (BladApi $e) { $u = null; }
        }
        akcja_blad($u, tresc_zadania());
    } elseif ($akcja === 'wyloguj') {
        akcja_wyloguj(wymagaj_uzytkownika());
    } elseif (isset($odczyt[$akcja])) {
        $odczyt[$akcja](wymagaj_uzytkownika());
    } elseif (isset($zapis[$akcja])) {
        $u = wymagaj_uzytkownika();
        wymagaj_aktualnej_wersji();
        $zapis[$akcja]($u, tresc_zadania());
    } else {
        throw new BladApi('nieznana_akcja', 'Nieznana akcja', 404);
    }
} catch (BladApi $e) {
    odpowiedz(['ok' => false, 'kod' => $e->kod, 'msg' => $e->getMessage()], $e->http);
} catch (Throwable $e) {
    error_log('Rezerwacje API (' . $akcja . '): ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    odpowiedz(['ok' => false, 'kod' => 'serwer', 'msg' => 'Błąd serwera. Spróbuj ponownie za chwilę.'], 500);
}
