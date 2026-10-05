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
        'teraz' => date('Y-m-d H:i:s'),
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
    $ch = curl_init(EXPO_PUSH_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([$w], JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $res = curl_exec($ch);
    $kod = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $cerr = curl_error($ch);
    curl_close($ch);
    if ($res === false) return ['', 'brak połączenia z Expo (' . $cerr . ')'];
    $j = json_decode((string)$res, true);
    $d = $j['data'][0] ?? null;
    if ($kod >= 400 || !$d) return ['', 'HTTP ' . $kod . ' ' . mb_substr((string)$res, 0, 300)];
    if (($d['status'] ?? '') !== 'ok') return ['', ($d['message'] ?? '') . ' ' . json_encode($d['details'] ?? null)];
    return [(string)($d['id'] ?? ''), ''];
}

/** Wynik doręczenia do Firebase: '' = jeszcze nie wiadomo, 'ok' albo opis błędu. */
function push_potwierdzenie(string $id): string
{
    $ch = curl_init(EXPO_POTWIERDZENIA_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['ids' => [$id]]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
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
        $ch = curl_init(EXPO_PUSH_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($paczka, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $res = curl_exec($ch);
        $kod = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($res === false || $kod >= 400) {
            error_log('Rezerwacje push: HTTP ' . $kod);
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

/** „🆕 Nowa rezerwacja z www” / „sob. 10.10 · 10:00 · ASG · 12 os. · Jan Kowalski” */
function tresc_push_nowa_www(array $r): array
{
    $dni = ['nd.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
    $t = strtotime((string)$r['data_rezerwacji']);
    $czesci = [$dni[(int)date('w', $t)] . ' ' . date('d.m', $t)];
    if (!empty($r['godzina_start'])) $czesci[] = substr((string)$r['godzina_start'], 0, 5);
    if (!empty($r['atrakcja_nazwa'])) $czesci[] = $r['atrakcja_nazwa'];
    $czesci[] = (int)$r['liczba_osob'] . ' os.';
    $czesci[] = $r['klient_imie_nazwisko'];
    $gdzie = $r['marka'] === 'arsenal' ? ($r['lokalizacja'] === 'wolomin' ? ' · Wołomin' : ' · Rembertów') : '';
    return ['tytul' => '🆕 Nowa rezerwacja z www' . $gdzie, 'tresc' => implode(' · ', $czesci)];
}

/**
 * Cron: push o nowych rezerwacjach z formularza www do zalogowanych telefonów tej samej marki.
 * Tylko z ostatnich 2 godzin (po wgraniu nie zasypie starymi), każda rezerwacja raz.
 */
function wyslij_push_nowe_www(): array
{
    $pdo = baza();
    $nowe = $pdo->query(
        "SELECT r.*, a.nazwa AS atrakcja_nazwa FROM rezerwacje r
         LEFT JOIN atrakcje a ON r.atrakcja_id = a.id
         LEFT JOIN app_push_wyslane p ON p.rezerwacja_id = r.id
         WHERE r.zrodlo = 'formularz_www' AND r.status = 'oczekujaca' AND p.rezerwacja_id IS NULL
           AND r.utworzona >= NOW() - INTERVAL 2 HOUR
         ORDER BY r.id"
    )->fetchAll();
    $rezerwacji = 0;
    $telefonow = 0;
    foreach ($nowe as $r) {
        // znacznik PRZED wysyłką — dwa crony naraz nie wyślą podwójnie
        $st = $pdo->prepare('INSERT IGNORE INTO app_push_wyslane (rezerwacja_id, czas) VALUES (?, NOW())');
        $st->execute([$r['id']]);
        if ($st->rowCount() === 0) continue;
        $st = $pdo->prepare(
            "SELECT DISTINCT t.push_token FROM app_tokeny t JOIN uzytkownicy u ON u.id = t.uzytkownik_id
             WHERE t.push_token IS NOT NULL AND u.aktywny = 1 AND u.marka = ?"
        );
        $st->execute([$r['marka']]);
        $tokeny = $st->fetchAll(PDO::FETCH_COLUMN);
        if (!$tokeny) continue;
        $t = tresc_push_nowa_www($r);
        $wiad = array_map(fn ($tok) => [
            'to' => $tok,
            'title' => $t['tytul'],
            'body' => $t['tresc'],
            'data' => ['rezerwacja_id' => (int)$r['id'], 'data' => $r['data_rezerwacji']],
            'sound' => 'default',
            'priority' => 'high',
            'channelId' => 'rezerwacje',
        ], $tokeny);
        $n = wyslij_push($wiad);
        $pdo->prepare('UPDATE app_push_wyslane SET telefonow = ? WHERE rezerwacja_id = ?')->execute([$n, $r['id']]);
        $rezerwacji++;
        $telefonow += $n;
    }
    return ['rezerwacji' => $rezerwacji, 'telefonow' => $telefonow];
}
