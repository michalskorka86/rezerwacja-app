<?php
// ============================================================
// Rezerwacje — API aplikacji na telefon — KONFIGURACJA
// Skopiuj ten plik jako config.php (w tym samym folderze aplikacja-api/) i uzupełnij pola oznaczone ←.
// config.php NIE trafia do repozytorium i nie wolno go nikomu udostępniać.
// ============================================================

// Baza, SMTP (maile do klientów) i SMSAPI — z config.php PWA (folder wyżej). Niczego tu nie powtarzamy.
require_once dirname(__DIR__) . '/config.php';

// Klucz do cron.php (przez adres URL) i do podglądu błędów bledy.php. Długi, losowy, inny niż hasła.
define('CRON_KEY', '');                       // ← np. 40 losowych liter i cyfr

// Skąd telefony pobierają APK (wydania na GitHubie). Zwykle bez zmian.
define('APK_REPO', 'michalskorka86/rezerwacja-app');
