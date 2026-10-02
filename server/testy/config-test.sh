#!/bin/sh
# Tworzy config testowy (samodzielny — bez config.php PWA): $1 = plik wynikowy, $2 = host bazy, $3 = nazwa bazy,
# $4 = użytkownik, $5 = hasło, $6 = adres serwera z atrapami SMSAPI i APK (osobny `php -S`, np. http://127.0.0.1:8766)
cat > "$1" <<KONIEC
<?php
// config TESTOWY — wygenerowany przez server/testy/config-test.sh. Nie używać na serwerze.
define('DB_HOST', '$2');
define('DB_NAME', '$3');
define('DB_USER', '$4');
define('DB_PASS', '$5');
define('DB_CHARSET', 'utf8mb4');
define('SMTP_FROM', 'test@example.com');
define('SMTP_FROM_NAME', 'Test');
define('WA_PHONE', '48500000000');
define('SMSAPI_TOKEN', 'test-token');
define('SMSAPI_URL', '$6/testy/mock/sms.php');
define('OTHER_COLOR', '#1A73E8');
define('CRON_KEY', 'cron-test');
define('APK_BAZA_URL', '$6/testy/mock/apk/');
define('EXPO_PUSH_URL', '$6/testy/mock/push.php');
define('MAIL_DO_PLIKU', getenv('REZ_MOCK_DIR') ?: sys_get_temp_dir());
KONIEC
