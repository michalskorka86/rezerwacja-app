-- Rezerwacje — aplikacja na telefon: nowe tabele (obok tabel PWA, ich NIE zmieniamy).
-- Wgrać RAZ: phpMyAdmin → baza serwer432573_siltrezerwacje → Import → ten plik.
-- Wszystkie nowe tabele mają przedrostek app_, żeby nie myliły się z tabelami PWA.

-- Zalogowane telefony: jeden wiersz = jedno logowanie (token w bazie tylko jako skrót sha256).
CREATE TABLE IF NOT EXISTS `app_tokeny` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uzytkownik_id` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `urzadzenie` varchar(40) NOT NULL DEFAULT '',
  `model` varchar(60) NOT NULL DEFAULT '',
  `wersja_app` varchar(20) NOT NULL DEFAULT '',
  `push_token` varchar(200) DEFAULT NULL,
  `utworzony` datetime NOT NULL,
  `ostatnio` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `uzytkownik_id` (`uzytkownik_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Błędne logowania (blokada po 5 próbach na 15 minut).
CREATE TABLE IF NOT EXISTS `app_logowania_bledne` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip` varchar(45) NOT NULL,
  `login` varchar(50) NOT NULL DEFAULT '',
  `czas` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ip_czas` (`ip`, `czas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Zgłoszenia błędów z aplikacji (awarie + „📨 Zgłoś problem”). Podgląd: aplikacja-api/bledy.php?key=CRON_KEY
CREATE TABLE IF NOT EXISTS `app_bledy` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `czas` datetime NOT NULL,
  `uzytkownik_id` int(11) DEFAULT NULL,
  `urzadzenie` varchar(40) NOT NULL DEFAULT '',
  `model` varchar(60) NOT NULL DEFAULT '',
  `wersja_app` varchar(20) NOT NULL DEFAULT '',
  `ekran` varchar(100) NOT NULL DEFAULT '',
  `komunikat` varchar(500) NOT NULL,
  `stos` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `czas` (`czas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
