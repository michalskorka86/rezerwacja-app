<?php
// ============================================================
// Rezerwacje — test API na lokalnej bazie (NIGDY na serwerze produkcyjnym — czyści tabele!).
//
//   1. Pusta baza:   mysql rez_test < server/testy/schemat_pwa.sql ; mysql rez_test < server/sql/001_aplikacja.sql
//   2. Config:       sh server/testy/config-test.sh /tmp/config-test.php 127.0.0.1 rez_test test test http://127.0.0.1:8766
//   3. Serwery:      REZ_CONFIG=/tmp/config-test.php REZ_MOCK_DIR=/tmp php -S 127.0.0.1:8765 -t server   (API)
//                    REZ_CONFIG=/tmp/config-test.php REZ_MOCK_DIR=/tmp php -S 127.0.0.1:8766 -t server   (atrapy)
//   4. Test:         REZ_CONFIG=/tmp/config-test.php REZ_MOCK_DIR=/tmp php server/testy/test_api.php http://127.0.0.1:8765
// ============================================================

declare(strict_types=1);

$BAZA = rtrim($argv[1] ?? 'http://127.0.0.1:8765', '/');
$URL = $BAZA . '/api.php';
$MOCK = getenv('REZ_MOCK_DIR') ?: sys_get_temp_dir();
require getenv('REZ_CONFIG') ?: __DIR__ . '/../config.php';
if (DB_NAME !== 'rez_test') exit("Test działa tylko na bazie rez_test (jest: " . DB_NAME . ")\n");

$pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);

$bledy = 0;
$token = '';
$wersja = '1.0.0';

function zapytanie(string $url, ?array $body, array $naglowki): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $naglowki]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $res = (string)curl_exec($ch);
    $kod = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$kod, $res];
}

function api(string $akcja, ?array $body = null, array $extra = []): array
{
    global $URL, $token, $wersja;
    $h = ['Content-Type: application/json', 'X-App-Wersja: ' . $wersja];
    if ($token !== '') $h[] = 'X-Token: ' . $token;
    [$kod, $res] = zapytanie($URL . '?akcja=' . $akcja . ($extra ? '&' . http_build_query($extra) : ''), $body, $h);
    $j = json_decode($res, true);
    if (!is_array($j)) {
        echo "  Odpowiedź nie-JSON (HTTP $kod): " . substr($res, 0, 500) . "\n";
        $j = [];
    }
    $j['_http'] = $kod;
    return $j;
}

function sprawdz(string $opis, bool $ok, $pokaz = null): void
{
    global $bledy;
    echo ($ok ? '  ✔ ' : '  ✘ ') . $opis . ($ok || $pokaz === null ? '' : ' → ' . json_encode($pokaz, JSON_UNESCAPED_UNICODE)) . "\n";
    if (!$ok) $bledy++;
}

function smsy(): array
{
    global $MOCK;
    $p = $MOCK . '/sms.json';
    return is_file($p) ? (json_decode((string)file_get_contents($p), true) ?: []) : [];
}

function pushe(): array
{
    global $MOCK;
    $p = $MOCK . '/push.json';
    return is_file($p) ? (json_decode((string)file_get_contents($p), true) ?: []) : [];
}

function jako(string $t): void
{
    global $token;
    $token = $t;
}

// ── Dane testowe (czysta baza) ──────────────────────────────
$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
foreach (['logi_maili', 'rezerwacje', 'wynajmy', 'zadania', 'uzytkownicy', 'atrakcje', 'dodatki', 'ustawienia', 'app_tokeny', 'app_logowania_bledne', 'app_bledy', 'app_push_wyslane'] as $t) {
    $pdo->exec("TRUNCATE TABLE `$t`");
}
$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
@unlink($MOCK . '/sms.json');
@unlink($MOCK . '/push.json');
foreach (glob($MOCK . '/mail-*.html') ?: [] as $f) unlink($f);

$pdo->exec("INSERT INTO atrakcje (id, nazwa, kolor, aktywna, kolejnosc) VALUES
  (1, 'Paintball Klasyczny 0,68 CAL', '#8B6355', 1, 1), (2, 'ASG', '#5C6BC0', 1, 2), (3, 'Stara atrakcja', '#000000', 0, 3)");
$pdo->exec("INSERT INTO dodatki (id, nazwa, aktywny, kolejnosc, cena_typ, cena, opis_ceny) VALUES
  (1, 'Ognisko z kiełbaskami', 1, 1, 'os', 15, '15 zł/os'), (2, 'Puchar', 1, 2, 'szt', 80, '80 zł'), (3, 'Stary dodatek', 0, 3, 'stala', 0, NULL)");
$ins = $pdo->prepare('INSERT INTO uzytkownicy (id, imie, login, haslo_hash, marka, rola, rola_nazwa, aktywny) VALUES (?,?,?,?,?,?,?,1)');
$ins->execute([1, 'Michał', 'michal', password_hash('silt123', PASSWORD_DEFAULT), 'silt', 'pelny', 'admin']);
$ins->execute([2, 'Paweł', 'pawel', password_hash('arsenal1', PASSWORD_DEFAULT), 'arsenal', 'pelny', 'admin']);
$ins->execute([3, 'Tomek', 'tomek', 'tekst123', 'silt', 'podglad', 'instruktor']);   // stare konto: hasło zwykłym tekstem
$ins->execute([4, 'Kuba', 'kuba', password_hash('kuba1234', PASSWORD_DEFAULT), 'silt', 'pelny', 'admin']);

$dzis = date('Y-m-d');
$jutro = date('Y-m-d', strtotime('+1 day'));
$za2 = date('Y-m-d', strtotime('+2 days'));
$rez = $pdo->prepare("INSERT INTO rezerwacje (id, klient_imie_nazwisko, klient_telefon, klient_email, marka, lokalizacja, atrakcja_id,
  liczba_osob, data_rezerwacji, godzina_start, status, zadatek_status, zrodlo, dodatki_json, sms_wyslany) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
$rez->execute([101, 'Jan Kowalski', '501 234 567', 'jan@example.com', 'silt', 'silt', 1, 12, $jutro, '10:00:00', 'oczekujaca', 'brak', 'panel', '[1,3]', 1]);
$rez->execute([102, 'Anna Nowak', '600700800', '', 'arsenal', 'wolomin', 2, 8, $jutro, '12:00:00', 'potwierdzona', 'oplacony', 'panel', '[]', 1]);
$rez->execute([103, 'Ola z www', '700800900', 'ola@example.com', 'silt', 'silt', 1, 20, $za2, '11:00:00', 'oczekujaca', 'oczekuje', 'formularz_www', '[2]', 0]);
$rez->execute([104, 'Niedoszły', '700800901', 'x@example.com', 'silt', 'silt', 1, 6, $za2, '13:00:00', 'oczekuje_na_platnosc', 'oczekuje', 'formularz_www', '[]', 0]);
$rez->execute([105, 'Anulowana', '700800902', '', 'silt', 'silt', 1, 6, $za2, '15:00:00', 'anulowana', 'brak', 'panel', '[]', 1]);
$rez->execute([106, 'Arsenał www', '700800903', 'ars@example.com', 'arsenal', 'rembert', 2, 10, $za2, '09:00:00', 'oczekujaca', 'oczekuje', 'formularz_www', '[]', 0]);

$od = date('Y-m-d', strtotime('-7 days'));
$do = date('Y-m-d', strtotime('+30 days'));

// ── Logowanie ───────────────────────────────────────────────
echo "Logowanie\n";
$r = api('ja');
sprawdz('ja bez logowania → 401 zaloguj', $r['_http'] === 401 && ($r['kod'] ?? '') === 'zaloguj', $r);
$r = api('zaloguj', ['login' => 'michal', 'haslo' => 'zle', 'urzadzenie' => 'tel-1']);
sprawdz('złe hasło → 401 z komunikatem', $r['_http'] === 401 && ($r['msg'] ?? '') === 'Nieprawidłowy login lub hasło.', $r);
$r = api('zaloguj', ['login' => 'michal']);
sprawdz('bez hasła → 400', $r['_http'] === 400, $r);
$r = api('zaloguj', ['login' => 'michal', 'haslo' => 'silt123', 'urzadzenie' => 'tel-1', 'model' => 'Samsung A55']);
sprawdz('dobre hasło → token + użytkownik', !empty($r['token']) && ($r['uzytkownik']['marka'] ?? '') === 'silt' && !isset($r['uzytkownik']['haslo_hash']), $r);
$tMichal = $r['token'] ?? '';
$r = api('zaloguj', ['login' => 'michal', 'haslo' => 'silt123', 'urzadzenie' => 'tel-2']);
$tMichal2 = $r['token'] ?? '';
$r = api('zaloguj', ['login' => 'pawel', 'haslo' => 'arsenal1', 'urzadzenie' => 'tel-3']);
$tPawel = $r['token'] ?? '';
$r = api('zaloguj', ['login' => 'tomek', 'haslo' => 'tekst123', 'urzadzenie' => 'tel-4']);
$tTomek = $r['token'] ?? '';
sprawdz('stare hasło zwykłym tekstem działa', $tTomek !== '', $r);
$h = (string)$pdo->query('SELECT haslo_hash FROM uzytkownicy WHERE id = 3')->fetchColumn();
sprawdz('…i zostało zamienione na bcrypt', strpos($h, '$2y$') === 0 && password_verify('tekst123', $h));
$r = api('zaloguj', ['login' => 'kuba', 'haslo' => 'kuba1234', 'urzadzenie' => 'tel-5']);
$tKuba = $r['token'] ?? '';
$ileTokenow = (int)$pdo->query('SELECT COUNT(*) FROM app_tokeny')->fetchColumn();
$jawny = (int)$pdo->query("SELECT COUNT(*) FROM app_tokeny WHERE token_hash = " . $pdo->quote($tMichal))->fetchColumn();
sprawdz('w bazie tylko skróty tokenów', $ileTokenow === 5 && $jawny === 0);

jako($tMichal);
$r = api('ja');
sprawdz('ja → użytkownik i ustawienia', ($r['uzytkownik']['imie'] ?? '') === 'Michał' && ($r['ustawienia']['inny_kolor'] ?? '') === '#1A73E8'
    && count($r['ustawienia']['sprzet_wynajem'] ?? []) === 9 && ($r['ustawienia']['min_wersja'] ?? '') === '0.0.0', $r);

echo "Blokada po błędnych hasłach\n";
jako('');
$pdo->exec('DELETE FROM app_logowania_bledne');
for ($i = 0; $i < 5; $i++) api('zaloguj', ['login' => 'kuba', 'haslo' => 'zle' . $i]);
$r = api('zaloguj', ['login' => 'kuba', 'haslo' => 'kuba1234']);
sprawdz('6. próba (nawet dobre hasło) → 429', $r['_http'] === 429 && ($r['kod'] ?? '') === 'blokada', $r);
$pdo->exec('DELETE FROM app_logowania_bledne');

// ── Dane i rezerwacje ───────────────────────────────────────
echo "Dane i rezerwacje\n";
jako($tMichal);
$r = api('dane');
sprawdz('dane: 2 aktywne atrakcje, 2 aktywne dodatki, nazwy wszystkich', count($r['atrakcje'] ?? []) === 2 && count($r['dodatki'] ?? []) === 2
    && ($r['nazwy_dodatkow']['3'] ?? '') === 'Stary dodatek' && ($r['dodatki'][0]['opis_ceny'] ?? '') === '15 zł/os', $r);

$r = api('rezerwacje', null, ['od' => $od, 'do' => $do]);
$ids = array_column($r['rezerwacje'] ?? [], 'id');
sprawdz('wszystkie: bez anulowanej i niedoszłej', $ids === [101, 102, 106, 103], $ids);
$byId = array_column($r['rezerwacje'] ?? [], null, 'id');
sprawdz('własna: kolor atrakcji; cudza: inny kolor', ($byId[101]['kolor_karty'] ?? '') === '#8B6355' && ($byId[101]['wlasna'] ?? null) === true
    && ($byId[102]['kolor_karty'] ?? '') === '#1A73E8' && ($byId[102]['wlasna'] ?? null) === false, $byId[101] ?? null);
sprawdz('dodatki jako liczby, nowa z www oznaczona', ($byId[101]['dodatki'] ?? null) === [1, 3] && ($byId[103]['nowa'] ?? null) === true
    && ($byId[101]['nowa'] ?? null) === false && ($byId[101]['liczba_osob'] ?? null) === 12, $byId[103] ?? null);
sprawdz('bez tokenów płatności', !array_key_exists('p24_token', $byId[101] ?? []) && !array_key_exists('dodatki_json', $byId[101] ?? []));
$r = api('rezerwacje', null, ['od' => $od, 'do' => $do, 'filtr' => 'niedoszle']);
sprawdz('filtr niedoszłe pokazuje rezerwację oczekującą na płatność (w PWA był pusty)', array_column($r['rezerwacje'] ?? [], 'id') === [104], $r);
$r = api('rezerwacje', null, ['od' => $od, 'do' => $do, 'filtr' => 'new']);
sprawdz('filtr nowe', array_column($r['rezerwacje'] ?? [], 'id') === [106, 103], $r);
$r = api('rezerwacje', null, ['od' => $od, 'do' => $do, 'filtr' => 'wolomin']);
sprawdz('filtr Wołomin', array_column($r['rezerwacje'] ?? [], 'id') === [102], $r);
$r = api('rezerwacje', null, ['od' => $jutro, 'do' => $jutro]);
sprawdz('zakres jednego dnia', array_column($r['rezerwacje'] ?? [], 'id') === [101, 102], $r);
$r = api('rezerwacje', null, ['od' => '2026-02-30', 'do' => $do]);
sprawdz('zła data → 400', $r['_http'] === 400, $r);
$r = api('rezerwacje', null, ['od' => $od, 'do' => $do, 'filtr' => 'cokolwiek']);
sprawdz('nieznany filtr → 400', $r['_http'] === 400, $r);
$r = api('licznik');
sprawdz('licznik: 2 nowe z www, 0 zadań', ($r['nowe'] ?? -1) === 2 && ($r['zadania'] ?? -1) === 0, $r);
sprawdz('licznik nie wysyła SMS-ów', smsy() === []);

echo "Dodawanie i edycja\n";
$nowa = ['imie_nazwisko' => 'Kawalerski Piotra', 'telefon' => '+48 511 222 333', 'email' => 'piotr@example.com', 'data' => $jutro,
    'godzina_start' => '14:30', 'godzina_koniec' => '17:00', 'liczba_osob' => 15, 'atrakcja_id' => 1, 'dodatki' => [1, 2, 2],
    'uwagi' => "Tort po grze\nłódź", 'instrukcje' => 'Płaci gotówką', 'potwierdzona' => true, 'zadatek' => true, 'lokalizacja' => 'wolomin'];
$r = api('rezerwacja_dodaj', array_merge($nowa, ['godzina_start' => '']));
sprawdz('bez godziny → komunikat', $r['_http'] === 400 && ($r['msg'] ?? '') === 'Wybierz godzinę', $r);
$r = api('rezerwacja_dodaj', array_merge($nowa, ['telefon' => 'abc']));
sprawdz('zły telefon → komunikat', ($r['msg'] ?? '') === 'Zły numer telefonu', $r);
$r = api('rezerwacja_dodaj', $nowa);
$nowaId = (int)($r['id'] ?? 0);
$w = $r['rezerwacja'] ?? [];
sprawdz('dodana (SILT → lokalizacja silt, dodatki bez powtórzeń)', $nowaId > 0 && ($w['lokalizacja'] ?? '') === 'silt' && ($w['dodatki'] ?? null) === [1, 2]
    && ($w['status'] ?? '') === 'potwierdzona' && ($w['zadatek_status'] ?? '') === 'oplacony' && ($w['godzina_start'] ?? '') === '14:30:00'
    && ($w['zrodlo'] ?? '') === 'panel' && ($w['dodana_przez'] ?? 0) === 1, $r);
$sms = smsy();
sprawdz('SMS do zespołu o nowej rezerwacji (SILT włączone)', count($sms) === 1 && strpos($sms[0]['message'] ?? '', "Nowa rezerwacja #{$nowaId}") === 0
    && strpos($sms[0]['message'], '[SILT]') !== false && ($sms[0]['auth'] ?? '') === 'Bearer test-token', $sms);
$r = api('rezerwacja_dodaj', array_merge($nowa, ['atrakcja_id' => 0]));
sprawdz('bez atrakcji → pierwsza aktywna (jak PWA)', ($r['rezerwacja']['atrakcja_id'] ?? 0) === 1, $r);
api('rezerwacja_usun', ['id' => (int)($r['id'] ?? 0)]);
$r = api('rezerwacja_dodaj', array_merge($nowa, ['atrakcja_id' => 99]));
sprawdz('nieistniejąca atrakcja → komunikat', ($r['msg'] ?? '') === 'Wybierz atrakcję', $r);

$smsPrzed = count(smsy());
jako($tPawel);
$r = api('rezerwacja_dodaj', array_merge($nowa, ['lokalizacja' => '']));
sprawdz('Arsenał bez lokalizacji → komunikat', $r['_http'] === 400 && strpos($r['msg'] ?? '', 'lokalizację') !== false, $r);
$r = api('rezerwacja_dodaj', array_merge($nowa, ['lokalizacja' => 'wolomin']));
sprawdz('Arsenał Wołomin dodana, SMS Arsenału wyłączony domyślnie', ($r['rezerwacja']['lokalizacja'] ?? '') === 'wolomin' && count(smsy()) === $smsPrzed, $r);
$arsId = (int)($r['id'] ?? 0);
$r = api('rezerwacja_edytuj', array_merge($nowa, ['id' => 101]));
sprawdz('edycja cudzej rezerwacji → 403', $r['_http'] === 403, $r);
$r = api('zadatek', ['id' => 101, 'oplacony' => true]);
sprawdz('zadatek cudzej → 403', $r['_http'] === 403, $r);

jako($tMichal);
$r = api('rezerwacja_edytuj', array_merge($nowa, ['id' => 101, 'imie_nazwisko' => 'Jan Kowalski-Nowak', 'liczba_osob' => 14, 'data' => $za2,
    'potwierdzona' => false, 'zadatek' => false, 'godzina_koniec' => '']));
$w = $r['rezerwacja'] ?? [];
sprawdz('edycja własnej', ($w['klient_imie_nazwisko'] ?? '') === 'Jan Kowalski-Nowak' && ($w['liczba_osob'] ?? 0) === 14
    && ($w['data_rezerwacji'] ?? '') === $za2 && array_key_exists('godzina_koniec', $w) && $w['godzina_koniec'] === null && ($w['status'] ?? '') === 'oczekujaca', $r);
$r = api('rezerwacja_edytuj', array_merge($nowa, ['id' => 103, 'imie_nazwisko' => 'Ola z www', 'email' => 'ola@example.com', 'potwierdzona' => false, 'zadatek' => false]));
sprawdz('edycja rezerwacji z www zostawia „zadatek oczekuje”', ($r['rezerwacja']['zadatek_status'] ?? '') === 'oczekuje', $r);
$r = api('rezerwacja_edytuj', array_merge($nowa, ['id' => 999]));
sprawdz('edycja nieistniejącej → 404', $r['_http'] === 404, $r);

echo "Zadatek, potwierdzenie, maile\n";
$r = api('zadatek', ['id' => 101, 'oplacony' => true]);
sprawdz('zadatek opłacony + data opłacenia', ($r['rezerwacja']['zadatek_status'] ?? '') === 'oplacony' && !empty($r['rezerwacja']['zadatek_data_oplacenia']), $r);
$r = api('zadatek', ['id' => 101, 'oplacony' => false]);
sprawdz('zadatek cofnięty', ($r['rezerwacja']['zadatek_status'] ?? '') === 'brak' && array_key_exists('zadatek_data_oplacenia', $r['rezerwacja'] ?? []) && $r['rezerwacja']['zadatek_data_oplacenia'] === null, $r);
$r = api('potwierdzenie', ['id' => 101, 'potwierdzona' => true]);
sprawdz('potwierdzona', ($r['rezerwacja']['status'] ?? '') === 'potwierdzona', $r);
$r = api('mail_zadatek', ['id' => 103]);
$plik = $MOCK . '/mail-ola_example_com.html';
$tresc = is_file($plik) ? (string)file_get_contents($plik) : '';
sprawdz('mail o zadatku wysłany (ta sama treść co w PWA)', ($r['ok'] ?? false) && strpos($tresc, 'Zadatek potwierdzony') !== false
    && strpos($tresc, 'Potwierdzenie rezerwacji #0103') !== false && strpos($tresc, 'Ognisko z kiełbaskami') !== false, $r);
sprawdz('…i rezerwacja przestała być „nowa”', ($r['rezerwacja']['mail_zadatek_wyslany'] ?? false) === true && ($r['rezerwacja']['nowa'] ?? true) === false);
$log = (int)$pdo->query("SELECT COUNT(*) FROM logi_maili WHERE rezerwacja_id = 103 AND typ = 'zadatek_otrzymany'")->fetchColumn();
sprawdz('wpis w logi_maili', $log === 1);
$r = api('mail_potwierdzenie', ['id' => 103]);
$tresc = is_file($plik) ? (string)file_get_contents($plik) : '';
sprawdz('mail z potwierdzeniem', ($r['rezerwacja']['mail_potw_wyslany'] ?? false) === true && strpos($tresc, 'Potwierdzenie przed imprezą') !== false, $r);
$pdo->exec("UPDATE rezerwacje SET klient_email = '' WHERE id = 101");
$r = api('mail_zadatek', ['id' => 101]);
sprawdz('bez e-maila klienta → komunikat', ($r['msg'] ?? '') === 'Brak e-maila klienta', $r);
$r = api('mail_zadatek', ['id' => 102]);
sprawdz('mail do cudzej rezerwacji → 403 (w PWA możliwe)', $r['_http'] === 403, $r);

echo "Uprawnienia i wersja\n";
jako($tTomek);
$r = api('rezerwacje', null, ['od' => $od, 'do' => $do]);
sprawdz('rola podgląd widzi rezerwacje', ($r['ok'] ?? false) === true, $r);
$r = api('rezerwacja_dodaj', $nowa);
sprawdz('rola podgląd nie dodaje → 403', $r['_http'] === 403 && ($r['kod'] ?? '') === 'uprawnienia', $r);
jako($tMichal);
$pdo->exec("INSERT INTO ustawienia (klucz, wartosc) VALUES ('app_min_wersja', '1.2.0')");
$wersja = '1.1.9';
$r = api('zadatek', ['id' => 101, 'oplacony' => true]);
sprawdz('stara wersja aplikacji nie zapisuje → 426', $r['_http'] === 426 && ($r['kod'] ?? '') === 'stara_wersja', $r);
$r = api('rezerwacje', null, ['od' => $od, 'do' => $do]);
sprawdz('…ale może czytać', ($r['ok'] ?? false) === true, $r);
$wersja = '1.10.0';
$r = api('zadatek', ['id' => 101, 'oplacony' => true]);
sprawdz('wersja 1.10.0 > 1.2.0 zapisuje', ($r['ok'] ?? false) === true, $r);
$pdo->exec("DELETE FROM ustawienia WHERE klucz = 'app_min_wersja'");
$wersja = '1.0.0';
$r = zapytanie($URL . '?akcja=zadatek', null, ['X-Token: ' . $tMichal]);
sprawdz('zapis przez GET → 405', $r[0] === 405, $r);
$r = api('cos_innego');
sprawdz('nieznana akcja → 404', $r['_http'] === 404, $r);

echo "Usuwanie\n";
$r = api('rezerwacja_usun', ['id' => $arsId]);
sprawdz('usunięcie cudzej → 403', $r['_http'] === 403, $r);
$r = api('rezerwacja_usun', ['id' => 103]);
$jest = (int)$pdo->query('SELECT COUNT(*) FROM rezerwacje WHERE id = 103')->fetchColumn();
$logi = (int)$pdo->query('SELECT COUNT(*) FROM logi_maili WHERE rezerwacja_id = 103')->fetchColumn();
sprawdz('usunięta razem z logami maili', ($r['ok'] ?? false) && $jest === 0 && $logi === 0, $r);

// ── Wynajem ─────────────────────────────────────────────────
echo "Wynajem\n";
$wyn = ['imie_nazwisko' => 'Firma XYZ', 'telefon' => '512 000 111', 'data_wynajmu' => $dzis, 'data_zwrotu' => $jutro, 'kwota' => '350,50',
    'platnosc' => 'Przelew', 'zaplacono' => false, 'sprzet' => ['Maska' => 10, 'ASG' => 4, 'Bateria' => 0, 'Mundur' => -2],
    'faktura_nazwa' => 'XYZ Sp. z o.o.', 'faktura_nip' => '1234567890', 'faktura_email' => 'faktury@xyz.pl', 'uwagi' => 'Odbiór 9:00'];
$smsPrzed = count(smsy());
$r = api('wynajem_dodaj', array_merge($wyn, ['telefon' => '']));
sprawdz('bez telefonu → komunikat', ($r['msg'] ?? '') === 'Wypełnij wymagane pola', $r);
$r = api('wynajem_dodaj', $wyn);
$wynId = (int)($r['id'] ?? 0);
$w = $r['wynajem'] ?? [];
sprawdz('wynajem dodany (kwota z przecinkiem, sprzęt bez zer)', $wynId > 0 && ($w['kwota'] ?? 0) === 350.5 && ($w['sprzet'] ?? []) === ['Maska' => 10, 'ASG' => 4]
    && ($w['platnosc'] ?? '') === 'Przelew' && ($w['marka'] ?? '') === 'silt', $r);
$sms = smsy();
sprawdz('SMS o wynajmie', count($sms) === $smsPrzed + 1 && strpos(end($sms)['message'] ?? '', 'Wynajem sprzetu #' . str_pad((string)$wynId, 4, '0', STR_PAD_LEFT)) === 0, end($sms));
$r = api('wynajmy');
sprawdz('lista aktywnych', array_column($r['wynajmy'] ?? [], 'id') === [$wynId], $r);
jako($tPawel);
$r = api('wynajem_edytuj', array_merge($wyn, ['id' => $wynId]));
sprawdz('edycja wynajmu innej marki → 403 (w PWA możliwe)', $r['_http'] === 403, $r);
jako($tMichal);
$r = api('wynajem_edytuj', array_merge($wyn, ['id' => $wynId, 'kwota' => 400, 'zaplacono' => true]));
sprawdz('edycja własnego', ($r['wynajem']['kwota'] ?? 0) == 400 && ($r['wynajem']['zaplacono'] ?? false) === true, $r);
$r = api('wynajem_zwroc', ['id' => $wynId]);
sprawdz('zwrócony', ($r['wynajem']['zwrocono'] ?? false) === true, $r);
$r = api('wynajmy', null, ['status' => 'zwrocone', 'marka' => 'silt']);
sprawdz('lista zwróconych SILT', array_column($r['wynajmy'] ?? [], 'id') === [$wynId], $r);
$r = api('wynajem_usun', ['id' => $wynId]);
sprawdz('usunięty', ($r['ok'] ?? false) && (int)$pdo->query('SELECT COUNT(*) FROM wynajmy')->fetchColumn() === 0, $r);

// ── Zadania ─────────────────────────────────────────────────
echo "Zadania\n";
$r = api('uzytkownicy');
sprawdz('lista osób', count($r['uzytkownicy'] ?? []) === 4, $r);
$r = api('zadanie_dodaj', ['dla_kogo' => 2, 'tytul' => '']);
sprawdz('bez tytułu → komunikat', ($r['msg'] ?? '') === 'Podaj tytuł zadania', $r);
$r = api('zadanie_dodaj', ['dla_kogo' => 2, 'tytul' => 'Zamówić kulki', 'priorytet' => 'pilne', 'termin' => $jutro, 'opis' => '20 skrzynek']);
$zId = (int)($r['id'] ?? 0);
api('zadanie_dodaj', ['dla_kogo' => 2, 'tytul' => 'Umyć maski', 'priorytet' => 'dziwny']);
jako($tPawel);
$r = api('licznik');
sprawdz('licznik zadań Pawła = 2', ($r['zadania'] ?? 0) === 2, $r);
$r = api('zadania', null, ['dla_kogo' => 2]);
$z = $r['zadania'] ?? [];
sprawdz('zadania: pilne pierwsze, nieznany priorytet → normalne', ($z[0]['tytul'] ?? '') === 'Zamówić kulki' && ($z[1]['priorytet'] ?? '') === 'normalne'
    && ($z[0]['od_imie'] ?? '') === 'Michał', $r);
$r = api('zadanie_wykonane', ['id' => $zId, 'wykonane' => true]);
$r = api('licznik');
sprawdz('po odhaczeniu licznik = 1', ($r['zadania'] ?? 0) === 1, $r);
$r = api('zadanie_usun', ['id' => $zId]);
sprawdz('zadanie usunięte', ($r['ok'] ?? false) && (int)$pdo->query('SELECT COUNT(*) FROM zadania')->fetchColumn() === 1, $r);

// ── Konto i admin ───────────────────────────────────────────
echo "Konto i admin\n";
jako($tMichal);
$r = api('zmien_haslo', ['stare' => 'zle', 'nowe' => 'nowe-haslo']);
sprawdz('złe stare hasło → komunikat', ($r['msg'] ?? '') === 'Błędne stare hasło', $r);
$r = api('zmien_haslo', ['stare' => 'silt123', 'nowe' => '123']);
sprawdz('za krótkie → komunikat', ($r['msg'] ?? '') === 'Hasło min. 6 znaków', $r);
$r = api('zmien_haslo', ['stare' => 'silt123', 'nowe' => 'nowe-haslo']);
sprawdz('hasło zmienione', ($r['ok'] ?? false) === true, $r);
jako($tMichal2);
$r = api('ja');
sprawdz('drugi telefon wylogowany po zmianie hasła', $r['_http'] === 401, $r);
jako($tMichal);
$r = api('ja');
sprawdz('ten telefon dalej zalogowany', ($r['ok'] ?? false) === true, $r);

jako($tTomek);
$r = api('uzytkownicy_admin');
sprawdz('instruktor nie widzi panelu admina → 403', $r['_http'] === 403, $r);
jako($tMichal);
$r = api('uzytkownicy_admin');
sprawdz('admin widzi użytkowników bez haseł', count($r['uzytkownicy'] ?? []) === 4 && !isset($r['uzytkownicy'][0]['haslo_hash']), $r);
$r = api('uzytkownik_dodaj', ['login' => 'kuba', 'imie' => 'X', 'haslo' => 'abcdef']);
sprawdz('zajęty login → komunikat', ($r['msg'] ?? '') === 'Login już istnieje', $r);
$r = api('uzytkownik_dodaj', ['login' => 'marek', 'imie' => 'Marek', 'haslo' => 'start123', 'rola_nazwa' => 'instruktor', 'marka' => 'arsenal']);
$m = $pdo->query("SELECT * FROM uzytkownicy WHERE login = 'marek'")->fetch();
sprawdz('instruktor dodany jako podgląd', ($r['ok'] ?? false) && $m && $m['rola'] === 'podglad' && $m['marka'] === 'arsenal' && password_verify('start123', $m['haslo_hash']), $r);
$r = api('haslo_reset', ['id' => 4]);
jako($tKuba);
$r = api('ja');
sprawdz('po resecie aplikacja wie, że trzeba zmienić hasło', ($r['uzytkownik']['haslo_reset'] ?? false) === true, $r);
$r = api('zmien_haslo', ['nowe' => 'kuba-nowe']);
sprawdz('po resecie stare hasło niepotrzebne', ($r['ok'] ?? false) === true, $r);
jako($tMichal);
$r = api('uzytkownik_aktywny', ['id' => 1, 'aktywny' => false]);
sprawdz('nie można wyłączyć siebie', $r['_http'] === 400, $r);
$r = api('uzytkownik_aktywny', ['id' => 4, 'aktywny' => false]);
jako($tKuba);
$r = api('ja');
sprawdz('wyłączone konto → telefon wylogowany', $r['_http'] === 401, $r);
jako('');
$r = api('zaloguj', ['login' => 'kuba', 'haslo' => 'kuba-nowe']);
sprawdz('wyłączone konto nie zaloguje się', $r['_http'] === 401, $r);
jako($tMichal);
$r = api('sms_ustawienia');
sprawdz('ustawienia SMS — domyślne jak w PWA', ($r['ustawienia'] ?? null) === ['sms_silt' => true, 'sms_arsenal' => false, 'sms_wynajem' => true], $r);
$r = api('sms_ustawienia_zapisz', ['sms_silt' => false, 'sms_arsenal' => true, 'sms_wynajem' => false]);
$r = api('sms_ustawienia');
sprawdz('zapisane', ($r['ustawienia'] ?? null) === ['sms_silt' => false, 'sms_arsenal' => true, 'sms_wynajem' => false], $r);

// ── Push: rejestracja telefonów ─────────────────────────────
echo "Push\n";
jako($tPawel);
$r = api('push_zarejestruj', ['token' => 'nie-token']);
sprawdz('push: zły token odrzucony', $r['_http'] === 400, $r);
$r = api('push_zarejestruj', ['token' => 'ExponentPushToken[pawel-1]']);
sprawdz('push: telefon Pawła zapisany', ($r['ok'] ?? false) === true, $r);
jako($tMichal);
$r = api('push_zarejestruj', ['token' => 'ExponentPushToken[michal-1]']);
$pdo->exec("INSERT INTO app_tokeny (uzytkownik_id, token_hash, urzadzenie, push_token, utworzony, ostatnio) VALUES (2, REPEAT('a', 64), 'stary', 'ExponentPushToken[Zly-arsenal]', NOW(), NOW())");

// ── Cron: SMS o rezerwacjach z www ──────────────────────────
echo "Cron\n";
$smsPrzed = count(smsy());
[$kod, $res] = zapytanie($BAZA . '/cron.php', null, []);
sprawdz('cron bez klucza → 403', $kod === 403);
[$kod, $res] = zapytanie($BAZA . '/cron.php?key=cron-test', null, []);
$j = json_decode($res, true);
$sms = smsy();
sprawdz('cron: SMS o nowej z www Arsenału (SILT wyłączony w ustawieniach)', $kod === 200 && ($j['sms']['wyslane'] ?? -1) === 1
    && count($sms) === $smsPrzed + 1 && strpos(end($sms)['message'] ?? '', '[Arsenal Rembert]') !== false, [$j, end($sms)]);
$flagi = $pdo->query("SELECT COUNT(*) FROM rezerwacje WHERE zrodlo = 'formularz_www' AND status = 'oczekujaca' AND sms_wyslany = 0")->fetchColumn();
sprawdz('wszystkie nowe z www oznaczone jako wysłane', (int)$flagi === 0);
[$kod, $res] = zapytanie($BAZA . '/cron.php?key=cron-test', null, []);
sprawdz('drugi raz nic nie wysyła', count(smsy()) === $smsPrzed + 1 && (json_decode($res, true)['sms']['wyslane'] ?? -1) === 0, $res);
$p = pushe();
$doPawla = array_values(array_filter($p, fn ($w) => $w['to'] === 'ExponentPushToken[pawel-1]'));
sprawdz('push: o nowej z www Arsenału tylko do telefonów Arsenału', count($doPawla) >= 1
    && !array_filter($p, fn ($w) => $w['to'] === 'ExponentPushToken[michal-1]' && strpos($w['title'], 'Rembertów') !== false)
    && strpos($doPawla[0]['title'], 'Nowa rezerwacja z www') !== false && ($doPawla[0]['channelId'] ?? '') === 'rezerwacje', $p);
sprawdz('push: niezainstalowana aplikacja — token wyczyszczony',
    (int)$pdo->query("SELECT COUNT(*) FROM app_tokeny WHERE push_token LIKE '%Zly%'")->fetchColumn() === 0);
$ile = count(pushe());
zapytanie($BAZA . '/cron.php?key=cron-test', null, []);
sprawdz('push: drugi raz nic nie wysyła', count(pushe()) === $ile);
jako($tPawel);
$r = api('push_test', []);
sprawdz('push: próbne powiadomienie + potwierdzenie i stan crona', ($r['wyslano'] ?? false) === true && strpos($r['wynik'] ?? '', 'ok') === 0
    && ($r['diagnoza']['cron_ostatnio'] ?? '') !== '' && ($r['diagnoza']['ostatnia_www']['id'] ?? 0) > 0, $r);
jako($tMichal);

// ── Błędy, APK, wylogowanie ─────────────────────────────────
echo "Błędy, APK, wylogowanie\n";
jako('');
$r = api('blad', ['komunikat' => 'TypeError: x is undefined', 'stos' => 'at Kalendarz', 'ekran' => 'kalendarz', 'urzadzenie' => 'tel-9']);
sprawdz('zgłoszenie bez logowania', ($r['ok'] ?? false) === true, $r);
jako($tMichal);
$r = api('blad', ['komunikat' => 'Zgłoszenie: nie działa filtr']);
$b = $pdo->query('SELECT * FROM app_bledy ORDER BY id DESC LIMIT 1')->fetch();
sprawdz('zgłoszenie z imieniem i wersją', ($r['ok'] ?? false) && (int)$b['uzytkownik_id'] === 1 && $b['wersja_app'] === '1.0.0', $b);
[$kod, $res] = zapytanie($BAZA . '/bledy.php', null, []);
sprawdz('bledy.php bez klucza → 403', $kod === 403);
[$kod, $res] = zapytanie($BAZA . '/bledy.php?key=cron-test', null, []);
sprawdz('bledy.php z kluczem pokazuje zgłoszenia', $kod === 200 && strpos($res, 'nie działa filtr') !== false && strpos($res, 'Michał') !== false);
[$kod, $res] = zapytanie($BAZA . '/apk.php?info', null, []);
$j = json_decode($res, true);
sprawdz('apk.php?info', $kod === 200 && ($j['runtimeVersion'] ?? '') === 'abc123' && ($j['numer'] ?? 0) === 7, $res);
[$kod, $res] = zapytanie($BAZA . '/apk.php', null, []);
sprawdz('apk.php przekierowuje do pliku', $kod === 302);
$r = api('wyloguj', []);
$r = api('ja');
sprawdz('po wylogowaniu token nie działa', $r['_http'] === 401, $r);

echo $bledy === 0 ? "\nWSZYSTKO OK\n" : "\nBŁĘDY: $bledy\n";
exit($bledy === 0 ? 0 : 1);
