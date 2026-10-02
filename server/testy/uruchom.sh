#!/bin/sh
# Test API od zera na lokalnej bazie rez_test (MariaDB 10.10+). Użycie: sh server/testy/uruchom.sh [host] [użytkownik] [hasło]
# Baza rez_test jest kasowana i tworzona od nowa.
set -e
cd "$(dirname "$0")/.."
HOST=${1:-127.0.0.1}; UZ=${2:-test}; HASLO=${3:-test}
TMP=${TMPDIR:-/tmp}/rez-test; rm -rf "$TMP"; mkdir -p "$TMP"
mysql -h"$HOST" -u"$UZ" -p"$HASLO" -e "DROP DATABASE IF EXISTS rez_test; CREATE DATABASE rez_test CHARACTER SET utf8mb4"
mysql -h"$HOST" -u"$UZ" -p"$HASLO" --default-character-set=utf8mb4 rez_test < testy/schemat_pwa.sql
for f in sql/0*.sql; do mysql -h"$HOST" -u"$UZ" -p"$HASLO" --default-character-set=utf8mb4 rez_test < "$f"; done
sh testy/config-test.sh "$TMP/config-test.php" "$HOST" rez_test "$UZ" "$HASLO" http://127.0.0.1:8766
export REZ_CONFIG="$TMP/config-test.php" REZ_MOCK_DIR="$TMP" PHP_CLI_SERVER_WORKERS=4
php -d display_errors=0 -d log_errors=1 -d error_log="$TMP/php.log" -S 127.0.0.1:8765 -t . > "$TMP/serwer.log" 2>&1 & P1=$!
php -S 127.0.0.1:8766 -t . > "$TMP/atrapy.log" 2>&1 & P2=$!
trap 'kill $P1 $P2 2>/dev/null' EXIT
sleep 1
WYNIK=0
php testy/test_api.php http://127.0.0.1:8765 || WYNIK=1
# testy aplikacji (Node) z tym samym serwerem — gdy są zainstalowane pakiety (npm ci)
if [ "$WYNIK" = 0 ] && [ -d ../node_modules ]; then
  (cd .. && REZ_API=http://127.0.0.1:8765/api.php npm test --silent) || WYNIK=1
fi
if [ -s "$TMP/php.log" ] && grep -iE "warning|notice|fatal|deprecated|error" "$TMP/php.log"; then echo "Ostrzeżenia PHP (wyżej)"; WYNIK=1; fi
exit $WYNIK
