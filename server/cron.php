<?php
// ============================================================
// Rezerwacje — zadania okresowe (co 5 minut).
//   SMS do zespołu o nowych rezerwacjach z formularza www (zamiast „przy okazji” licznika w PWA).
//   Powiadomienia push o tych samych rezerwacjach do telefonów zespołu danej marki.
//
// Uruchamianie (panel LH.pl → Cron, co 5 minut), jedno z dwóch:
//   php /home/serwer432573/domains/filedops.pl/public_html/rezerwacjaapp/aplikacja-api/cron.php
//   https://filedops.pl/rezerwacjaapp/aplikacja-api/cron.php?key=CRON_KEY
// PWA dalej wysyła SMS-y po swojemu — znacznik sms_wyslany w bazie pilnuje, żeby SMS nie poszedł dwa razy.
// ============================================================

declare(strict_types=1);

require_once __DIR__ . '/lib/wspolne.php';
require_once __DIR__ . '/lib/sms.php';
require_once __DIR__ . '/lib/push.php';

$zLinii = PHP_SAPI === 'cli';
if (!$zLinii && (CRON_KEY === '' || !hash_equals(CRON_KEY, (string)($_GET['key'] ?? '')))) {
    http_response_code(403);
    exit('Brak dostępu');
}

try {
    $sms = wyslij_sms_nowe_www();
    $push = wyslij_push_nowe_www();
    $wynik = ['ok' => true, 'czas' => date('Y-m-d H:i:s'), 'sms' => $sms, 'push' => $push];
} catch (Throwable $e) {
    error_log('Rezerwacje cron: ' . $e->getMessage());
    $wynik = ['ok' => false, 'msg' => 'Błąd: ' . $e->getMessage()];
}

if ($zLinii) {
    echo json_encode($wynik, JSON_UNESCAPED_UNICODE) . "\n";
} else {
    odpowiedz($wynik, $wynik['ok'] ? 200 : 500);
}
