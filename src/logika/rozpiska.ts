/**
 * Rozpiski dnia dla Arsenału — port oblicz_sprzet() z pdf_dzien.php.
 * Liczone w telefonie z pobranych rezerwacji (działa też bez zasięgu). Bez importów React Native — testy w Node.
 */

import { DNI_PELNE, zData } from './daty';
import type { Rezerwacja } from './typy';

export type PozycjaSprzetu = { atrakcja: string; grup: number; max_osob: number; osob_lacznie: number };

const minuty = (t: string) => {
  const [h, m] = t.split(':');
  return (parseInt(h || '0', 10) || 0) * 60 + (parseInt(m || '0', 10) || 0);
};

/**
 * Sprzęt na dzień: dla każdej atrakcji największa liczba graczy NA RAZ (gra trwa 3 h od startu, jak w PWA),
 * liczba grup i osób łącznie. Koniec jednej gry o tej samej minucie co start następnej — sprzęt już wolny.
 * Posortowane po nazwie atrakcji.
 */
export function obliczSprzet(rezerwacje: Rezerwacja[]): PozycjaSprzetu[] {
  const grupy = new Map<number, Rezerwacja[]>();
  for (const r of rezerwacje) {
    const g = grupy.get(r.atrakcja_id);
    if (g) g.push(r);
    else grupy.set(r.atrakcja_id, [r]);
  }
  const wynik: PozycjaSprzetu[] = [];
  for (const lista of grupy.values()) {
    const zdarzenia: { t: number; os: number; start: boolean }[] = [];
    for (const r of lista) {
      const t = minuty(r.godzina_start);
      zdarzenia.push({ t, os: r.liczba_osob, start: true }, { t: t + 180, os: r.liczba_osob, start: false });
    }
    zdarzenia.sort((a, b) => (a.t !== b.t ? a.t - b.t : a.start === b.start ? 0 : a.start ? 1 : -1));
    let teraz = 0;
    let max = 0;
    for (const z of zdarzenia) {
      teraz += z.start ? z.os : -z.os;
      if (teraz > max) max = teraz;
    }
    wynik.push({
      atrakcja: lista[0].atrakcja_nazwa ?? 'Nieznana',
      grup: lista.length,
      max_osob: max,
      osob_lacznie: lista.reduce((s, r) => s + r.liczba_osob, 0),
    });
  }
  return wynik.sort((a, b) => (a.atrakcja < b.atrakcja ? -1 : a.atrakcja > b.atrakcja ? 1 : 0));
}

/** Rezerwacje Arsenału na dzień do rozpiski: lokalizacja 'all' | 'rembert' | 'wolomin'. */
export function rezerwacjeRozpiski(rezerwacje: Rezerwacja[], data: string, lok: 'all' | 'rembert' | 'wolomin'): Rezerwacja[] {
  return rezerwacje
    .filter(
      (r) =>
        r.marka === 'arsenal' &&
        r.data_rezerwacji === data &&
        r.status !== 'anulowana' &&
        r.status !== 'oczekuje_na_platnosc' &&
        (lok === 'all' || r.lokalizacja === lok),
    )
    .sort((a, b) => a.godzina_start.localeCompare(b.godzina_start));
}

export type LokRozpiski = 'all' | 'rembert' | 'wolomin';

export const nazwaLokalizacji = (lok: LokRozpiski) => (lok === 'rembert' ? 'Rembertów' : lok === 'wolomin' ? 'Wołomin' : 'Rembertów + Wołomin');

/** „02.10.2026” */
export const dataKropki = (ds: string) => `${ds.slice(8, 10)}.${ds.slice(5, 7)}.${ds.slice(0, 4)}`;

/** Uwagi bez numerów telefonów (stare rezerwacje z importu) — jak w pdf_dzien.php. */
export const uwagiBezTelefonow = (u: string | null) =>
  (u ?? '')
    .replace(/(?:\+48\s?)?\d{9}\b/g, '')
    .trim()
    .replace(/\s{2,}/g, ' ');

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Rozpiska jako strona HTML do druku / PDF — ten sam układ i style co pdf_dzien.php (bez paska wyboru daty).
 * `nazwy` = słownik id dodatku → nazwa.
 */
export function htmlRozpiski(lista: Rezerwacja[], data: string, lok: LokRozpiski, nazwy: Record<string, string>): string {
  const osob = lista.reduce((s, r) => s + r.liczba_osob, 0);
  const sprzet = obliczSprzet(lista);
  const naglowek = `${DNI_PELNE[zData(data).getDay()]}, ${dataKropki(data)} &nbsp;·&nbsp; ${esc(nazwaLokalizacji(lok))} &nbsp;·&nbsp; ${lista.length} grup &nbsp;·&nbsp; ${osob} graczy`;
  const wiersze = lista
    .map((r, i) => {
      const dod = (r.dodatki ?? []).map((id) => nazwy[String(id)]).filter(Boolean);
      const uw = uwagiBezTelefonow(r.uwagi);
      return `<tr>
<td>${i + 1}</td>
<td><strong>${esc(r.godzina_start.slice(0, 5))}</strong></td>
<td><span class="lok-badge ${r.lokalizacja === 'wolomin' ? 'wol' : ''}">${r.lokalizacja === 'wolomin' ? 'Woł' : 'Rem'}</span></td>
<td>${esc(r.atrakcja_nazwa ?? '—')}</td>
<td><strong>${r.liczba_osob}</strong></td>
<td>${esc(r.klient_imie_nazwisko || '—')}</td>
<td>${dod.length ? `<div class="dodatki-txt">✅ ${esc(dod.join(', '))}</div>` : ''}${uw ? `<div class="uwagi-txt">${esc(uw)}</div>` : ''}</td>
<td>${r.zadatek_status === 'oplacony' ? '✅' : '—'}</td>
</tr>`;
    })
    .join('\n');
  const tabelaSprzetu = sprzet.length
    ? `<div class="sprzet">
<h2>Zapotrzebowanie na sprzęt (szacunek — max 5 grup jednocześnie, ~3h/grupa)</h2>
<table class="sprzet-table"><thead><tr><th>Atrakcja</th><th>Grup</th><th>Max sprzętu jednocześnie</th><th>Graczy łącznie (cały dzień)</th></tr></thead><tbody>
${sprzet.map((s) => `<tr><td>${esc(s.atrakcja)}</td><td>${s.grup}</td><td><strong style="color:#1A73E8;font-size:15px">${s.max_osob} szt.</strong></td><td>${s.osob_lacznie} os.</td></tr>`).join('\n')}
</tbody></table></div>`
    : '';
  const tresc = lista.length
    ? `<div class="header-doc"><h1>Rozpiski dla instruktorów — Arsenał Paintball</h1><div class="meta">${naglowek}</div></div>
<div class="summary"><h2>Podsumowanie dnia</h2><div class="summary-grid">
<div class="summary-item"><div class="val">${lista.length}</div><div class="lbl">Grup łącznie</div></div>
<div class="summary-item"><div class="val">${osob}</div><div class="lbl">Graczy łącznie</div></div>
</div></div>
<table class="tabela"><thead><tr><th>#</th><th>Godz.</th><th>Lok.</th><th>Atrakcja</th><th>Osób</th><th>Organizator</th><th>Uwagi / Dodatki</th><th>Zadatek</th></tr></thead>
<tbody>
${wiersze}
</tbody></table>
${tabelaSprzetu}`
    : `<div class="empty">Brak rezerwacji na ${dataKropki(data)} (${esc(nazwaLokalizacji(lok))})</div>`;
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rozpiski ${dataKropki(data)} — Arsenał Paintball</title><style>${STYLE}</style></head>
<body><div class="rozpiski">${tresc}</div></body></html>`;
}

/** Style 1:1 z pdf_dzien.php (bez paska sterowania). */
const STYLE = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #fff; }
.rozpiski { padding: 16px; }
.header-doc { margin-bottom: 16px; border-bottom: 2px solid #1A73E8; padding-bottom: 10px; }
.header-doc h1 { font-size: 18px; color: #1A73E8; }
.header-doc .meta { font-size: 12px; color: #666; margin-top: 4px; }
.tabela { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.tabela th { background: #1A73E8; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
.tabela td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; vertical-align: top; }
.tabela tr:nth-child(even) td { background: #f8f9fa; }
.lok-badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 700; background: #e3f2fd; color: #1565c0; }
.lok-badge.wol { background: #fce4ec; color: #880e4f; }
.uwagi-txt { color: #666; font-size: 11px; margin-top: 2px; }
.dodatki-txt { color: #2e7d32; font-size: 11px; margin-top: 2px; }
.summary { background: #f8f9fa; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; }
.summary h2 { font-size: 14px; color: #333; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
.summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.summary-item { background: white; border-radius: 6px; padding: 10px 12px; border: 1px solid #e0e0e0; }
.summary-item .val { font-size: 22px; font-weight: 700; color: #1A73E8; }
.summary-item .lbl { font-size: 11px; color: #666; margin-top: 2px; }
.sprzet { margin-bottom: 20px; }
.sprzet h2 { font-size: 14px; color: #333; margin-bottom: 10px; }
.sprzet-table { width: 100%; border-collapse: collapse; }
.sprzet-table th { background: #37474f; color: white; padding: 7px 10px; font-size: 11px; text-align: left; }
.sprzet-table td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
.sprzet-table tr:nth-child(even) td { background: #f5f5f5; }
.empty { text-align: center; padding: 40px; color: #999; font-size: 14px; }
@media print {
  body { font-size: 11px; }
  .tabela th { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sprzet-table th { background: #555 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;
