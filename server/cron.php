<?php
// ============================================================
// Rezerwacje — zadania okresowe (co 5 minut).
//   SMS do zespołu o nowych rezerwacjach z formularza www (zamiast „przy okazji” licznika w PWA).
//   Powiadomienia push o tych samych rezerwacjach do telefonów zespołu danej marki,
//   a także o rezerwacjach wpisanych przez zespół w PWA (z aplikacji idą od razu przy zapisie).
//
// Uruchamianie: panel LH.pl → Cron, co 5 minut, przez adres (tak działa; wariant „php /ścieżka” w panelu nie ruszał):
//   curl https://filedops.pl/rezerwacjaapp/aplikacja-api/cron.php?key=CRON_KEY
// Te same zadania wykonuje też API przy odświeżaniu na telefonach (lib/okresowe.php) — cron jest zapasem.
// PWA dalej wysyła SMS-y po swojemu — znacznik sms_wyslany w bazie pilnuje, żeby SMS nie poszedł dwa razy.
// ============================================================

declare(strict_types=1);

// ślad startu jeszcze przed konfiguracją i bazą — w pliku cron-ostatni.log (podgląd przez FTP; z www zablokowany)
@file_put_contents(__DIR__ . '/cron-ostatni.log', date('Y-m-d H:i:s') . ' start ' . PHP_SAPI . ' PHP ' . PHP_VERSION . "\n");

require_once __DIR__ . '/lib/wspolne.php';
require_once __DIR__ . '/lib/sms.php';
require_once __DIR__ . '/lib/push.php';
require_once __DIR__ . '/lib/okresowe.php';

$zLinii = PHP_SAPI === 'cli';
if (!$zLinii && (CRON_KEY === '' || !hash_equals(CRON_KEY, (string)($_GET['key'] ?? '')))) {
    http_response_code(403);
    exit('Brak dostępu');
}

$wynik = wykonaj_okresowe($zLinii ? 'panel' : 'adres');

if ($zLinii) {
    echo json_encode($wynik, JSON_UNESCAPED_UNICODE) . "\n";
} else {
    odpowiedz($wynik, $wynik['ok'] ? 200 : 500);
}
