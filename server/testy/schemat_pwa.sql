-- Struktura bazy PWA (serwer432573_siltrezerwacje), wyeksportowana z phpMyAdmin 02.10.2026 — SAMA STRUKTURA, bez danych.
-- TYLKO DO TESTÓW (GitHub „Sprawdź kod”, lokalnie). Na serwerze te tabele już są — NIE wgrywać.
-- Wymaga MariaDB 10.10+ (kolacja utf8mb4_uca1400_ai_ci, jak na hostingu).

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET NAMES utf8mb4;

CREATE TABLE `atrakcje` (
  `id` int(11) NOT NULL,
  `nazwa` varchar(100) NOT NULL,
  `kolor` varchar(7) NOT NULL DEFAULT '#888888',
  `aktywna` tinyint(1) NOT NULL DEFAULT 1,
  `kolejnosc` int(11) NOT NULL DEFAULT 0,
  `tylko_panel` tinyint(1) NOT NULL DEFAULT 0,
  `nazwa_en` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `dodatki` (
  `id` int(11) NOT NULL,
  `nazwa` varchar(150) NOT NULL,
  `aktywny` tinyint(1) NOT NULL DEFAULT 1,
  `kolejnosc` int(11) NOT NULL DEFAULT 0,
  `cena_typ` enum('stala','os','szt') NOT NULL DEFAULT 'stala',
  `cena` decimal(8,2) NOT NULL DEFAULT 0.00,
  `min_osob` int(11) DEFAULT NULL,
  `opis_ceny` varchar(100) DEFAULT NULL,
  `nazwa_en` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `logi_maili` (
  `id` int(11) NOT NULL,
  `rezerwacja_id` int(11) NOT NULL,
  `typ` enum('nowa_rezerwacja','zadatek_oczekuje','zadatek_otrzymany','potwierdzenie','anulowanie') NOT NULL,
  `odbiorca` varchar(150) NOT NULL,
  `wyslany` tinyint(1) NOT NULL DEFAULT 0,
  `blad` text DEFAULT NULL,
  `utworzony` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `rezerwacje` (
  `id` int(11) NOT NULL,
  `klient_imie_nazwisko` varchar(150) NOT NULL,
  `klient_telefon` varchar(20) NOT NULL,
  `klient_email` varchar(150) DEFAULT NULL,
  `marka` enum('silt','arsenal') NOT NULL DEFAULT 'silt',
  `lokalizacja` enum('silt','rembert','wolomin') NOT NULL DEFAULT 'silt',
  `atrakcja_id` int(11) NOT NULL,
  `liczba_osob` int(11) NOT NULL,
  `data_rezerwacji` date NOT NULL,
  `godzina_start` time NOT NULL,
  `godzina_koniec` time DEFAULT NULL,
  `uwagi` text DEFAULT NULL,
  `dodatki_json` text DEFAULT NULL,
  `status` enum('oczekuje_na_platnosc','oczekujaca','potwierdzona','anulowana') NOT NULL DEFAULT 'oczekujaca',
  `zadatek_status` enum('brak','oczekuje','oplacony') NOT NULL DEFAULT 'brak',
  `zadatek_kwota` decimal(8,2) NOT NULL DEFAULT 100.00,
  `zadatek_link` varchar(500) DEFAULT NULL,
  `zadatek_data_oplacenia` datetime DEFAULT NULL,
  `p24_token` varchar(100) DEFAULT NULL,
  `p24_order_id` varchar(100) DEFAULT NULL,
  `offline_uuid` varchar(36) DEFAULT NULL,
  `dodana_przez` int(11) DEFAULT NULL,
  `zrodlo` enum('panel','formularz_www') NOT NULL DEFAULT 'panel',
  `utworzona` timestamp NULL DEFAULT current_timestamp(),
  `zaktualizowana` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sms_wyslany` tinyint(1) NOT NULL DEFAULT 0,
  `mail_zadatek_wyslany` tinyint(1) NOT NULL DEFAULT 0,
  `mail_potw_wyslany` tinyint(1) NOT NULL DEFAULT 0,
  `instrukcje` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `ustawienia` (
  `klucz` varchar(60) NOT NULL,
  `wartosc` varchar(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `uzytkownicy` (
  `id` int(11) NOT NULL,
  `imie` varchar(50) NOT NULL,
  `login` varchar(50) NOT NULL,
  `haslo_hash` varchar(255) NOT NULL,
  `marka` enum('silt','arsenal') NOT NULL DEFAULT 'silt',
  `aktywny` tinyint(1) NOT NULL DEFAULT 1,
  `utworzony` timestamp NULL DEFAULT current_timestamp(),
  `rola` enum('pelny','podglad') NOT NULL DEFAULT 'pelny',
  `haslo_reset` tinyint(1) DEFAULT 0,
  `rola_nazwa` enum('admin','instruktor') DEFAULT 'admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `wynajmy` (
  `id` int(11) NOT NULL,
  `klient_imie_nazwisko` varchar(150) NOT NULL,
  `klient_telefon` varchar(20) NOT NULL,
  `data_wynajmu` date NOT NULL,
  `data_zwrotu` date DEFAULT NULL,
  `kwota` decimal(8,2) DEFAULT 0.00,
  `zaplacono` tinyint(1) DEFAULT 0,
  `zwrocono` tinyint(1) DEFAULT 0,
  `sprzet_json` text DEFAULT NULL,
  `uwagi` text DEFAULT NULL,
  `dodane_przez` int(11) DEFAULT NULL,
  `marka` enum('silt','arsenal') DEFAULT 'silt',
  `utworzona` timestamp NULL DEFAULT current_timestamp(),
  `platnosc` enum('Gotówka','Przelew','Karta') DEFAULT 'Gotówka',
  `faktura_nazwa` varchar(200) DEFAULT NULL,
  `faktura_nip` varchar(20) DEFAULT NULL,
  `faktura_email` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `zadania` (
  `id` int(11) NOT NULL,
  `tytul` varchar(200) NOT NULL,
  `opis` text DEFAULT NULL,
  `priorytet` enum('pilne','wazne','normalne') DEFAULT 'normalne',
  `dla_kogo` int(11) NOT NULL,
  `dodane_przez` int(11) NOT NULL,
  `termin` date DEFAULT NULL,
  `wykonane` tinyint(1) DEFAULT 0,
  `wykonane_kiedy` timestamp NULL DEFAULT NULL,
  `utworzone` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `atrakcje` ADD PRIMARY KEY (`id`);
ALTER TABLE `dodatki` ADD PRIMARY KEY (`id`);
ALTER TABLE `logi_maili` ADD PRIMARY KEY (`id`), ADD KEY `rezerwacja_id` (`rezerwacja_id`);
ALTER TABLE `rezerwacje`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `offline_uuid` (`offline_uuid`),
  ADD KEY `atrakcja_id` (`atrakcja_id`),
  ADD KEY `dodana_przez` (`dodana_przez`),
  ADD KEY `idx_rez_data` (`data_rezerwacji`),
  ADD KEY `idx_rez_status` (`status`),
  ADD KEY `idx_rez_marka` (`marka`),
  ADD KEY `idx_rez_uuid` (`offline_uuid`);
ALTER TABLE `ustawienia` ADD PRIMARY KEY (`klucz`);
ALTER TABLE `uzytkownicy` ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `login` (`login`);
ALTER TABLE `wynajmy` ADD PRIMARY KEY (`id`), ADD KEY `dodane_przez` (`dodane_przez`);
ALTER TABLE `zadania` ADD PRIMARY KEY (`id`), ADD KEY `dla_kogo` (`dla_kogo`), ADD KEY `dodane_przez` (`dodane_przez`);

ALTER TABLE `atrakcje` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `dodatki` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `logi_maili` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `rezerwacje` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `uzytkownicy` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `wynajmy` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `zadania` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `logi_maili` ADD CONSTRAINT `logi_maili_ibfk_1` FOREIGN KEY (`rezerwacja_id`) REFERENCES `rezerwacje` (`id`);
ALTER TABLE `rezerwacje`
  ADD CONSTRAINT `rezerwacje_ibfk_1` FOREIGN KEY (`atrakcja_id`) REFERENCES `atrakcje` (`id`),
  ADD CONSTRAINT `rezerwacje_ibfk_2` FOREIGN KEY (`dodana_przez`) REFERENCES `uzytkownicy` (`id`);
ALTER TABLE `wynajmy` ADD CONSTRAINT `wynajmy_ibfk_1` FOREIGN KEY (`dodane_przez`) REFERENCES `uzytkownicy` (`id`);
ALTER TABLE `zadania`
  ADD CONSTRAINT `zadania_ibfk_1` FOREIGN KEY (`dla_kogo`) REFERENCES `uzytkownicy` (`id`),
  ADD CONSTRAINT `zadania_ibfk_2` FOREIGN KEY (`dodane_przez`) REFERENCES `uzytkownicy` (`id`);
