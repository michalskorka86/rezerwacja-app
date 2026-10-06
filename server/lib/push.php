<?php
// Rezerwacje — powiadomienia push na telefony (Expo Push → Firebase na Androidzie).
// Klucz Firebase jest wgrany na expo.dev (Credentials) — na serwerze NIE ma żadnego klucza.

declare(strict_types=1);

/** POST push_zarejestruj {token} — telefon podaje swój adres do powiadomień (po zalogowaniu i przy starcie). */
function akcja_push_zarejestruj(array $u, array $d): void
{
    $t = tekst($d, 'token', 200);
    if (!preg_match('/^Expo(nent)?PushToken\[[A-Za-z0-9_\-]+\]$/', $t)) throw new BladApi('zle_dane', 'Zły adres powiadomień');
    $pdo = baza();
    // ten sam telefon mógł być wcześniej zalogowany na inne konto — tam token czyścimy
    $pdo->prepare('UPDATE app_tokeny SET push_token = NULL WHERE push_token = ? AND id <> ?')->execute([$t, $u['token_id']]);
    $pdo->prepare('UPDATE app_tokeny SET push_token = ? WHERE id = ?')->execute([$t, $u['token_id']]);
    odpowiedz(['ok' => true]);
}

/**
 * POST push_test — próbne powiadomienie na TEN telefon + diagnoza (Ustawienia → 🔔).
 * Czeka chwilę na potwierdzenie z Expo/Firebase i zwraca jego wynik oraz stan crona i ostatniej rezerwacji z www.
 */
function akcja_push_test(array $u): void
{
    $pdo = baza();
    $st = $pdo->prepare('SELECT push_token FROM app_tokeny WHERE id = ?');
    $st->execute([$u['token_id']]);
    $tok = (string)$st->fetchColumn();
    $diag = [
        'telefon_zapisany' => $tok !== '',
        'telefonow_marki' => (int)$pdo->query("SELECT COUNT(*) FROM app_tokeny t JOIN uzytkownicy u ON u.id = t.uzytkownik_id
            WHERE t.push_token IS NOT NULL AND u.aktywny = 1 AND u.marka = " . $pdo->quote((string)$u['marka']))->fetchColumn(),
        'cron_ostatnio' => ustawienie('app_cron_ostatnio', ''),
        'cron_blad' => ustawienie('app_cron_blad', ''),
        'teraz' => date('Y-m-d H:i:s'),
        'baza_teraz' => (string)$pdo->query('SELECT NOW()')->fetchColumn(),
        'od_numeru' => prog_push(),
    ];
    $w = $pdo->query("SELECT r.id, r.status, r.utworzona, r.marka, p.czas AS push_czas, p.telefonow AS push_telefonow
        FROM rezerwacje r LEFT JOIN app_push_wyslane p ON p.rezerwacja_id = r.id
        WHERE r.zrodlo = 'formularz_www' ORDER BY r.id DESC LIMIT 1")->fetch();
    $diag['ostatnia_www'] = $w ?: null;
    if ($tok === '') {
        odpowiedz(['ok' => true, 'wyslano' => false, 'wynik' => 'Ten telefon nie jest zapisany na serwerze do powiadomień.', 'diagnoza' => $diag]);
    }
    [$bilet, $blad] = push_jeden([
        'to' => $tok, 'title' => '🔔 Próbne powiadomienie', 'body' => 'Powiadomienia działają na tym telefonie.',
        'sound' => 'default', 'priority' => 'high', 'channelId' => 'rezerwacje', 'data' => ['test' => 1],
    ]);
    if ($bilet === '') {
        odpowiedz(['ok' => true, 'wyslano' => false, 'wynik' => 'Expo odrzuciło: ' . $blad, 'diagnoza' => $diag]);
    }
    // potwierdzenie z Firebase (np. zły klucz FCM na expo.dev) przychodzi po kilku sekundach
    $potw = '';
    for ($i = 0; $i < 4 && $potw === ''; $i++) {
        sleep(2);
        $potw = push_potwierdzenie($bilet);
    }
    odpowiedz(['ok' => true, 'wyslano' => true, 'wynik' => $potw === '' ? 'Wysłane — brak jeszcze potwierdzenia (to normalne, sprawdź telefon).' : $potw, 'diagnoza' => $diag]);
}

/** Jedna wiadomość → [id biletu, błąd]. */
function push_jeden(array $w): array
{
    $r = http_post(EXPO_PUSH_URL, json_encode([$w], JSON_UNESCAPED_UNICODE), ['Content-Type: application/json', 'Accept: application/json']);
    if ($r['tresc'] === null) return ['', 'brak połączenia z Expo (' . $r['blad'] . ')'];
    $d = json_decode($r['tresc'], true)['data'][0] ?? null;
    if ($r['kod'] >= 400 || !$d) return ['', 'HTTP ' . $r['kod'] . ' ' . mb_substr($r['tresc'], 0, 300)];
    if (($d['status'] ?? '') !== 'ok') return ['', ($d['message'] ?? '') . ' ' . json_encode($d['details'] ?? null)];
    return [(string)($d['id'] ?? ''), ''];
}

/** Wynik doręczenia do Firebase: '' = jeszcze nie wiadomo, 'ok' albo opis błędu. */
function push_potwierdzenie(string $id): string
{
    $res = http_post(EXPO_POTWIERDZENIA_URL, json_encode(['ids' => [$id]]), ['Content-Type: application/json', 'Accept: application/json'], 10)['tresc'];
    $r = json_decode((string)$res, true)['data'][$id] ?? null;
    if (!$r) return '';
    if (($r['status'] ?? '') === 'ok') return 'ok — Firebase przyjął, powiadomienie powinno być na telefonie.';
    return 'Firebase odrzucił: ' . ($r['message'] ?? '') . ' ' . json_encode($r['details'] ?? null, JSON_UNESCAPED_UNICODE);
}

/** Wysyłka do Expo Push (po 100 na raz). Zwraca liczbę przyjętych. Tokeny odinstalowanych aplikacji są czyszczone. */
function wyslij_push(array $wiadomosci): int
{
    $ok = 0;
    foreach (array_chunk($wiadomosci, 100) as $paczka) {
        $r = http_post(EXPO_PUSH_URL, json_encode($paczka, JSON_UNESCAPED_UNICODE), ['Content-Type: application/json', 'Accept: application/json']);
        $res = $r['tresc'];
        if ($res === null || $r['kod'] >= 400) {
            $GLOBALS['push_blad'] = $r['blad'] !== '' ? $r['blad'] : 'Expo: HTTP ' . $r['kod'];
            error_log('Rezerwacje push: ' . $GLOBALS['push_blad']);
            continue;
        }
        $wyniki = json_decode((string)$res, true)['data'] ?? [];
        foreach ($wyniki as $i => $w) {
            if (($w['status'] ?? '') === 'ok') {
                $ok++;
            } elseif (($w['details']['error'] ?? '') === 'DeviceNotRegistered' && isset($paczka[$i]['to'])) {
                baza()->prepare('UPDATE app_tokeny SET push_token = NULL WHERE push_token = ?')->execute([$paczka[$i]['to']]);
            }
        }
    }
    return $ok;
}

/**
 * Od którego numeru rezerwacji cron wysyła powiadomienia. Ustalany raz, przy pierwszym uruchomieniu:
 * ostatnia rezerwacja starsza niż 4 h (po wgraniu nie zasypie telefonów starymi, a świeże dojdą).
 * Poprawka: wcześniej było „utworzona w ciągu 2 h” — przy innej strefie czasowej formularza www i bazy
 * rezerwacja mogła wypaść z okna i powiadomienie nigdy nie szło. Numer rezerwacji nie zależy od godziny.
 */
function prog_push(): int
{
    static $prog = null;
    if ($prog !== null) return $prog;
    $z = ustawienie('app_push_od_id', '');
    if ($z === '') {
        $z = (string)(int)baza()->query("SELECT COALESCE(MAX(id), 0) FROM rezerwacje WHERE utworzona < NOW() - INTERVAL 4 HOUR")->fetchColumn();
        zapisz_ustawienie('app_push_od_id', $z);
    }
    return $prog = (int)$z;
}

/** Marki, w których telefony dostają push także o rezerwacjach wpisanych przez zespół (decyzja Michała: Arsenał i SILT). */
const PUSH_REZERWACJE_ZESPOLU = ['arsenal', 'silt'];

/** „sob. 10.10 · 10:00 · ASG · 12 os. · Jan Kowalski” */
function opis_push(array $r): string
{
    $dni = ['nd.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
    $t = strtotime((string)$r['data_rezerwacji']);
    $czesci = [$dni[(int)date('w', $t)] . ' ' . date('d.m', $t)];
    if (!empty($r['godzina_start'])) $czesci[] = substr((string)$r['godzina_start'], 0, 5);
    if (!empty($r['atrakcja_nazwa'])) $czesci[] = $r['atrakcja_nazwa'];
    $czesci[] = (int)$r['liczba_osob'] . ' os.';
    $czesci[] = $r['klient_imie_nazwisko'];
    return implode(' · ', $czesci);
}

/** „ · Wołomin” / „ · Rembertów” dla Arsenału. */
function gdzie_push(array $r): string
{
    return $r['marka'] === 'arsenal' ? ($r['lokalizacja'] === 'wolomin' ? ' · Wołomin' : ' · Rembertów') : '';
}

/** „🆕 Nowa rezerwacja z www” / „sob. 10.10 · 10:00 · ASG · 12 os. · Jan Kowalski” */
function tresc_push_nowa_www(array $r): array
{
    return ['tytul' => '🆕 Nowa rezerwacja z www' . gdzie_push($r), 'tresc' => opis_push($r)];
}

/** Adresy push zalogowanych telefonów marki (bez telefonu o podanym id logowania — np. autora). */
function tokeny_marki(string $marka, int $bezTokenu = 0): array
{
    $st = baza()->prepare(
        "SELECT DISTINCT t.push_token FROM app_tokeny t JOIN uzytkownicy u ON u.id = t.uzytkownik_id
         WHERE t.push_token IS NOT NULL AND u.aktywny = 1 AND u.marka = ? AND t.id <> ?"
    );
    $st->execute([$marka, $bezTokenu]);
    return $st->fetchAll(PDO::FETCH_COLUMN);
}

/** Wysyła push o rezerwacji (raz — znacznik w app_push_wyslane PRZED wysyłką). Zwraca liczbę telefonów albo -1, gdy już była. */
function push_o_rezerwacji(array $r, string $tytul, string $tresc, array $tokeny): int
{
    $pdo = baza();
    $st = $pdo->prepare('INSERT IGNORE INTO app_push_wyslane (rezerwacja_id, czas) VALUES (?, NOW())');
    $st->execute([$r['id']]);
    if ($st->rowCount() === 0) return -1;
    if (!$tokeny) return 0;
    $n = wyslij_push(array_map(fn ($tok) => [
        'to' => $tok,
        'title' => $tytul,
        'body' => $tresc,
        'data' => ['rezerwacja_id' => (int)$r['id'], 'data' => $r['data_rezerwacji']],
        'sound' => 'default',
        'priority' => 'high',
        'channelId' => 'rezerwacje',
    ], $tokeny));
    $pdo->prepare('UPDATE app_push_wyslane SET telefonow = ? WHERE rezerwacja_id = ?')->execute([$n, $r['id']]);
    return $n;
}

/** Po dodaniu rezerwacji w aplikacji: push do POZOSTAŁYCH telefonów marki (marki z PUSH_REZERWACJE_ZESPOLU). Nie rzuca. */
function push_nowa_z_aplikacji(array $u, array $r): void
{
    if (!in_array($r['marka'], PUSH_REZERWACJE_ZESPOLU, true)) return;
    try {
        push_o_rezerwacji($r, '🆕 Nowa rezerwacja' . gdzie_push($r), 'Dodał(a) ' . $u['imie'] . ' · ' . opis_push($r), tokeny_marki((string)$r['marka'], (int)$u['token_id']));
    } catch (Throwable $e) {
        error_log('Rezerwacje push (nowa z aplikacji): ' . $e->getMessage());
    }
}

/**
 * Cron: rezerwacje wpisane przez zespół w PWA (zrodlo = panel) w markach z PUSH_REZERWACJE_ZESPOLU — nowsze niż prog_push(),
 * których aplikacja jeszcze nie ogłosiła. Do wszystkich telefonów marki (PWA nie wie, z którego telefonu wpisano).
 */
function wyslij_push_nowe_panel(): array
{
    $marki = implode(',', array_map(fn ($m) => baza()->quote($m), PUSH_REZERWACJE_ZESPOLU));
    $nowe = baza()->query(
        "SELECT r.*, a.nazwa AS atrakcja_nazwa, u.imie AS autor FROM rezerwacje r
         LEFT JOIN atrakcje a ON r.atrakcja_id = a.id
         LEFT JOIN uzytkownicy u ON u.id = r.dodana_przez
         LEFT JOIN app_push_wyslane p ON p.rezerwacja_id = r.id
         WHERE r.zrodlo = 'panel' AND r.marka IN ($marki) AND r.status <> 'anulowana' AND p.rezerwacja_id IS NULL
           AND r.id > " . prog_push() . "
         ORDER BY r.id"
    )->fetchAll();
    $rezerwacji = 0;
    $telefonow = 0;
    foreach ($nowe as $r) {
        $n = push_o_rezerwacji($r, '🆕 Nowa rezerwacja' . gdzie_push($r), ($r['autor'] ? 'Dodał(a) ' . $r['autor'] . ' · ' : '') . opis_push($r), tokeny_marki((string)$r['marka']));
        if ($n < 0) continue;
        $rezerwacji++;
        $telefonow += $n;
    }
    return ['rezerwacji' => $rezerwacji, 'telefonow' => $telefonow];
}

/**
 * Cron: push o nowych rezerwacjach z formularza www do zalogowanych telefonów tej samej marki.
 * Tylko nowsze niż prog_push() (po wgraniu nie zasypie starymi), każda rezerwacja raz.
 */
function wyslij_push_nowe_www(): array
{
    $pdo = baza();
    $nowe = $pdo->query(
        "SELECT r.*, a.nazwa AS atrakcja_nazwa FROM rezerwacje r
         LEFT JOIN atrakcje a ON r.atrakcja_id = a.id
         LEFT JOIN app_push_wyslane p ON p.rezerwacja_id = r.id
         WHERE r.zrodlo = 'formularz_www' AND r.status = 'oczekujaca' AND p.rezerwacja_id IS NULL
           AND r.id > " . prog_push() . "
         ORDER BY r.id"
    )->fetchAll();
    $rezerwacji = 0;
    $telefonow = 0;
    foreach ($nowe as $r) {
        $t = tresc_push_nowa_www($r);
        $n = push_o_rezerwacji($r, $t['tytul'], $t['tresc'], tokeny_marki((string)$r['marka']));
        if ($n < 0) continue;
        $rezerwacji++;
        $telefonow += $n;
    }
    return ['rezerwacji' => $rezerwacji, 'telefonow' => $telefonow];
}
