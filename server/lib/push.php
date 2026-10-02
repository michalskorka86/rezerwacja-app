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
