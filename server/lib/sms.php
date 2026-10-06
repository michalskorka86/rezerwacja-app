<?php
// Rezerwacje — wysyłka SMS (SMSAPI.pl) i maili (PHPMailer z folderu PWA), ustawienia SMS.

declare(strict_types=1);

/** Ustawienia SMS z tabeli ustawienia — te same klucze i wartości domyślne co w PWA. */
function ustawienia_sms(): array
{
    static $cache = null;
    if ($cache !== null) return $cache;
    $rows = baza()->query("SELECT klucz, wartosc FROM ustawienia WHERE klucz IN ('sms_silt','sms_arsenal','sms_wynajem')")
        ->fetchAll(PDO::FETCH_KEY_PAIR);
    $cache = [
        'sms_silt' => isset($rows['sms_silt']) ? (bool)$rows['sms_silt'] : true,
        'sms_arsenal' => isset($rows['sms_arsenal']) ? (bool)$rows['sms_arsenal'] : false,
        'sms_wynajem' => isset($rows['sms_wynajem']) ? (bool)$rows['sms_wynajem'] : true,
    ];
    return $cache;
}

function sms_dla_marki(string $marka): bool
{
    $s = ustawienia_sms();
    return ($marka === 'silt' && $s['sms_silt']) || ($marka === 'arsenal' && $s['sms_arsenal']);
}

/** Ostatni błąd wysyłki SMS (do logu crona i testu w aplikacji). */
$GLOBALS['sms_blad'] = '';

/** SMS do zespołu (numer WA_PHONE z config.php PWA). Zwraca true, gdy SMSAPI przyjęło. Nigdy nie rzuca. */
function wyslij_sms_zespol(string $tresc): bool
{
    if (SMSAPI_TOKEN === '' || WA_PHONE === '') {
        $GLOBALS['sms_blad'] = 'brak SMSAPI_TOKEN lub WA_PHONE w config.php';
        return false;
    }
    $r = http_post(SMSAPI_URL, http_build_query([
        'to' => WA_PHONE,
        'message' => $tresc,
        'encoding' => 'utf-8',
        'format' => 'json',
    ]), ['Authorization: Bearer ' . SMSAPI_TOKEN, 'Content-Type: application/x-www-form-urlencoded'], 10);
    $j = json_decode((string)$r['tresc'], true);
    if ($r['tresc'] === null || $r['kod'] >= 400 || isset($j['error'])) {
        $GLOBALS['sms_blad'] = $r['blad'] !== '' ? $r['blad'] : 'SMSAPI: HTTP ' . $r['kod'] . ' ' . mb_substr((string)$r['tresc'], 0, 150);
        error_log('Rezerwacje SMS: ' . $GLOBALS['sms_blad']);
        return false;
    }
    return true;
}

/** Mail do klienta z kopią do biura — jak wyslij_mail() z auth.php PWA. */
function wyslij_mail_klient(string $do, string $temat, string $html): bool
{
    if (MAIL_DO_PLIKU !== '') {   // testy: zapis do pliku zamiast wysyłki
        $plik = rtrim(MAIL_DO_PLIKU, '/') . '/mail-' . preg_replace('/[^a-z0-9]/i', '_', $do) . '.html';
        return file_put_contents($plik, "Do: $do\nTemat: $temat\n\n$html") !== false;
    }
    require_once PHPMAILER_DIR . '/PHPMailer.php';
    require_once PHPMAILER_DIR . '/SMTP.php';
    require_once PHPMAILER_DIR . '/Exception.php';
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = SMTP_USER;
        $mail->Password = SMTP_PASS;
        $mail->SMTPSecure = SMTP_SECURE;
        $mail->Port = SMTP_PORT;
        $mail->CharSet = 'UTF-8';
        $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
        $mail->addAddress($do);
        $mail->addBCC(SMTP_FROM);
        $mail->isHTML(true);
        $mail->Subject = $temat;
        $mail->Body = $html;
        $mail->send();
        return true;
    } catch (Throwable $e) {
        error_log('Rezerwacje mail: ' . $mail->ErrorInfo);
        return false;
    }
}

/** Tekst SMS o nowej rezerwacji z formularza www — jak count_new w PWA. */
function tresc_sms_nowa_www(array $r): string
{
    $rez_nr = '#' . str_pad((string)$r['id'], 4, '0', STR_PAD_LEFT);
    $data_pl = date('d.m.Y', strtotime($r['data_rezerwacji']));
    $marka_txt = $r['marka'] === 'arsenal'
        ? ($r['lokalizacja'] === 'wolomin' ? '[Arsenal Wolomin]' : '[Arsenal Rembert]')
        : '[SILT]';
    return "Nowa rezerwacja {$rez_nr} {$marka_txt}\n"
        . "Klient: {$r['klient_imie_nazwisko']}\n"
        . "Tel: {$r['klient_telefon']}\n"
        . "Data: {$data_pl} godz. {$r['godzina_start']}\n"
        . "Osob: {$r['liczba_osob']} / {$r['atrakcja_nazwa']}\n"
        . "Zadatek: Oplacony";
}

/**
 * SMS o nowych rezerwacjach z www, które jeszcze go nie dostały (cron co 5 min).
 * Ta sama logika i znacznik sms_wyslany co count_new w PWA — więc SMS nie pójdzie dwa razy.
 */
function wyslij_sms_nowe_www(): array
{
    $pdo = baza();
    $nowe = $pdo->query(
        "SELECT r.*, a.nazwa AS atrakcja_nazwa FROM rezerwacje r
         LEFT JOIN atrakcje a ON r.atrakcja_id = a.id
         WHERE r.zrodlo = 'formularz_www' AND r.status = 'oczekujaca' AND r.sms_wyslany = 0
         ORDER BY r.id"
    )->fetchAll();
    $wyslane = 0;
    $pominiete = 0;
    $nieudane = 0;
    foreach ($nowe as $r) {
        // znacznik PRZED wysyłką i tylko jeśli nikt (np. PWA) nie zdążył go ustawić — bez podwójnych SMS-ów
        $st = $pdo->prepare('UPDATE rezerwacje SET sms_wyslany = 1 WHERE id = ? AND sms_wyslany = 0');
        $st->execute([$r['id']]);
        if ($st->rowCount() === 0) continue;
        if (!sms_dla_marki((string)$r['marka'])) {
            $pominiete++;
            continue;
        }
        if (wyslij_sms_zespol(tresc_sms_nowa_www($r))) {
            $wyslane++;
        } else {
            // Poprawka: nieudany SMS nie ginie — znacznik z powrotem, następny cron spróbuje jeszcze raz
            $pdo->prepare('UPDATE rezerwacje SET sms_wyslany = 0 WHERE id = ?')->execute([$r['id']]);
            $nieudane++;
        }
    }
    return ['wyslane' => $wyslane, 'pominiete' => $pominiete, 'nieudane' => $nieudane] + ($nieudane ? ['blad' => $GLOBALS['sms_blad']] : []);
}

function akcja_sms_ustawienia(array $u): void
{
    wymagaj_admina($u);
    odpowiedz(['ok' => true, 'ustawienia' => ustawienia_sms()]);
}

function akcja_sms_ustawienia_zapisz(array $u, array $d): void
{
    wymagaj_admina($u);
    $st = baza()->prepare('INSERT INTO ustawienia (klucz, wartosc) VALUES (?, ?) ON DUPLICATE KEY UPDATE wartosc = VALUES(wartosc)');
    foreach (['sms_silt', 'sms_arsenal', 'sms_wynajem'] as $k) {
        if (array_key_exists($k, $d)) $st->execute([$k, prawda($d, $k) ? '1' : '0']);
    }
    odpowiedz(['ok' => true]);
}
