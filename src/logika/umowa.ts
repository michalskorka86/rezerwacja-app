/**
 * Umowa najmu sprzętu Paintball/ASG — tekst 1:1 z papierowego wzoru SILT (pokazanego przez Michała 04.11).
 * Pola, które dotąd wpisywano długopisem, wypełnia aplikacja. ŻADNE pole nie jest obowiązkowe
 * (czasem wynajem dla zaufanej osoby) — puste drukuje się jako kropki do ewentualnego dopisania ręcznie.
 * Strona 2 = załącznik nr 1: sprzęt z modelem, ilością i uwagami, pod nim te same podpisy.
 * Podpisana umowa zapisuje się na serwerze (app_umowy, decyzja Michała 05.11) — widać ją przy wynajmie na każdym telefonie.
 */

import type { Wynajem } from './typy';

/** Dane wynajmującego. Arsenał — dopiero gdy Michał poda dane firmy (do tego czasu umowa tylko dla SILT). */
export const WYNAJMUJACY = {
  silt: { nazwa: 'SILT Jakub Czapliński', nip: '113 123 52 47', telefony: '609-547-783 lub 503-414-715' },
} as const;

export type DaneUmowy = {
  /** RRRR-MM-DD */
  dataUmowy: string | null;
  imie: string;
  dowodSeria: string;
  dowodNumer: string;
  dowodWydany: string;
  adres: string;
  telefon: string;
  od: string | null;
  do: string | null;
  /** koszt najmu w zł (tekst z klawiatury aplikacji) */
  kwota: string;
  dataPlatnosci: string | null;
  /** zwrot (pkt 5) i odbiór (pkt 10) — ta sama data */
  dataZwrotu: string | null;
  zaDzienZwloki: string;
  wartoscSprzetu: string;
  /** załącznik nr 1 */
  pozycje: PozycjaUmowy[];
};

export type PozycjaUmowy = { sprzet: string; model: string; ilosc: string; uwagi: string };

/** Modele do wyboru przy pozycjach z wynajmu (podane przez Michała 05.11). Puste = bez modelu (tylko uwagi). */
export const MODELE: Record<string, string[]> = {
  'Marker 0,68 CAL': ['Tippmann 98', 'BT Combat 4'],
  'Marker Sportowy': ['Planet Eclipse Emek 100 – 0,68 CAL'],
  'Marker Emek 0,50 CAL': ['Planet Eclipse Emek 100 – 0,50 CAL'],
  Maska: ['Dye SE Thermal'],
  ASG: ['Replika karabinka M4 Specna Arms'],
  Gelblaster: ['Piranha', 'Valken Surge 2'],
  Gotcha: ['Valken Gotcha', 'Field Blaster'],
  Bateria: [],
  Mundur: [],
};

/** Pozycje załącznika z wynajmu: jeden model — wybrany od razu, kilka — do wybrania. */
export function pozycjeZWynajmu(sprzet: Record<string, number>): PozycjaUmowy[] {
  return Object.entries(sprzet ?? {})
    .filter(([, n]) => n > 0)
    .map(([nazwa, n]) => ({ sprzet: nazwa, model: MODELE[nazwa]?.length === 1 ? MODELE[nazwa][0] : '', ilosc: String(n), uwagi: '' }));
}

/** „+ inny model”: odejmuje 1 sztukę z pozycji i dodaje pod nią nową tej samej rzeczy (1 szt.). */
export function rozdzielPozycje(p: PozycjaUmowy[], i: number): PozycjaUmowy[] {
  const x = p[i];
  if (!x) return p;
  const ile = parseInt(x.ilosc, 10) || 0;
  const jedyny = MODELE[x.sprzet]?.length === 1 ? MODELE[x.sprzet][0] : '';
  const nowa: PozycjaUmowy = { sprzet: x.sprzet, model: jedyny, ilosc: '1', uwagi: '' };
  const zmieniona = ile > 1 ? { ...x, ilosc: String(ile - 1) } : x;
  return [...p.slice(0, i), zmieniona, nowa, ...p.slice(i + 1)];
}

/** Podpisy zapisywane razem z umową. */
export type PodpisyUmowy = { najemca?: Podpis; wynajmujacy?: Podpis };
/** To, co trafia na serwer (app_umowy.dane_json). */
export type ZapisanaUmowa = DaneUmowy & { podpisy: PodpisyUmowy };

/** Podpis narysowany palcem / rysikiem: ścieżka SVG w układzie pola o podanych wymiarach. */
export type Podpis = { sciezka: string; szer: number; wys: number; czas: string };

export function domyslneUmowy(w: Pick<Wynajem, 'klient_imie_nazwisko' | 'klient_telefon' | 'data_wynajmu' | 'data_zwrotu' | 'kwota' | 'sprzet'>, dzis: string): DaneUmowy {
  return {
    dataUmowy: dzis,
    imie: w.klient_imie_nazwisko ?? '',
    dowodSeria: '',
    dowodNumer: '',
    dowodWydany: '',
    adres: '',
    telefon: w.klient_telefon ?? '',
    od: w.data_wynajmu || null,
    do: w.data_zwrotu || null,
    kwota: w.kwota ? String(Math.round(w.kwota)) : '',
    dataPlatnosci: w.data_zwrotu || null,
    dataZwrotu: w.data_zwrotu || null,
    zaDzienZwloki: '100',
    wartoscSprzetu: '6000',
    pozycje: pozycjeZWynajmu(w.sprzet),
  };
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** RRRR-MM-DD → DD.MM.RRRR */
export const dataPl = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split('-').reverse().join('.') : '');

/** Wypełnione pole (pogrubione) albo kropki do dopisania długopisem. */
function pole(t: string | null | undefined, kropki = 24): string {
  const v = (t ?? '').trim();
  return v ? `<b>${esc(v)}</b>` : `<span class="kropki">${'.'.repeat(kropki)}</span>`;
}

const zl = (t: string) => (t.trim() ? `${t.trim()} zł` : '');

function htmlPodpisu(p: Podpis | undefined, opis: string): string {
  const rys = p
    ? `<svg viewBox="0 0 ${p.szer} ${p.wys}" width="200" height="${Math.round((200 * p.wys) / p.szer)}"><path d="${esc(p.sciezka)}" fill="none" stroke="#1A2A6C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : '<div style="height:70px"></div>';
  // „podpisano …” albo pusta linijka tej samej wysokości — kreski pod podpisami są na równi
  return `<div class="podpis">${rys}<div class="linia">${opis}</div><div class="czas">${p ? 'podpisano ' + esc(p.czas) : '&nbsp;'}</div></div>`;
}

/** Cała umowa jako HTML do wydruku / PDF (expo-print), format A4. */
export function htmlUmowy(d: DaneUmowy, podpisy: PodpisyUmowy = {}): string {
  const w = WYNAJMUJACY.silt;
  const zwrot = pole(dataPl(d.dataZwrotu), 16);
  const podpisyHtml = `<div class="podpisy">${htmlPodpisu(podpisy.najemca, 'Podpis Najemcy')}${htmlPodpisu(podpisy.wynajmujacy, 'Podpis Wynajmującego')}</div>`;
  const pozycje = (d.pozycje ?? []).filter((p) => p.sprzet.trim() || p.model.trim() || p.uwagi.trim());
  // pusty załącznik — kilka pustych wierszy do wypełnienia długopisem
  const wiersze = (pozycje.length ? pozycje : Array.from({ length: 6 }, () => null))
    .map((p, i) =>
      p
        ? `<tr><td class="n">${i + 1}</td><td>${esc(p.sprzet)}</td><td>${esc(p.model)}</td><td class="il">${esc(p.ilosc)}</td><td>${esc(p.uwagi)}</td></tr>`
        : `<tr><td class="n">${i + 1}</td><td>&nbsp;</td><td></td><td class="il"></td><td></td></tr>`,
    )
    .join('');
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 12mm 16mm; }
body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.35; color: #111; }
h1 { text-align: center; font-size: 16pt; margin: 0 0 10px; }
p { margin: 0 0 5px; text-align: justify; }
.kropki { letter-spacing: 1px; color: #555; }
.podpisy { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 18px; page-break-inside: avoid; }
.podpis { width: 45%; text-align: center; }
.linia { border-top: 1px solid #111; padding-top: 3px; }
.czas { font-size: 9pt; color: #555; }
.strona2 { page-break-before: always; }
h2 { text-align: center; font-size: 14pt; margin: 0 0 4px; }
.pod { text-align: center; margin-bottom: 12px; }
table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
th, td { border: 1px solid #888; padding: 5px 6px; text-align: left; vertical-align: top; }
th { background: #f0f0f0; }
td.n { text-align: center; width: 28px; }
td.il { text-align: center; width: 44px; }
</style></head><body>
<h1>Umowa Najmu sprzętu Paintball/ASG</h1>
<p>Zawarta w dniu ${pole(dataPl(d.dataUmowy), 16)} między ${pole(d.imie, 34)} legitymującym się dowodem osobistym seria ${pole(d.dowodSeria, 10)} nr ${pole(d.dowodNumer, 18)} wydanym przez ${pole(d.dowodWydany, 30)} zamieszkałym ${pole(d.adres, 50)} nr telefonu ${pole(d.telefon, 20)}, zwanym dalej Najemcą</p>
<p>a</p>
<p>${esc(w.nazwa)} NIP ${esc(w.nip)} zwanym dalej Wynajmującym</p>
<p>1. Wynajmujący zapewnia, że sprzęt jest sprawny i wolny od wad, a najemca potwierdza to przy odbiorze sprzętu.</p>
<p>2. W przypadku uszkodzenia sprzętu Najemca zobowiązany jest do pokrycia wszelkich kosztów związanych z przywróceniem sprzętu do stanu z momentu wypożyczenia.</p>
<p>3. Najemca nie wpłaca kaucji.</p>
<p>4. Strony ustalają całkowity koszt najmu w okresie od ${pole(dataPl(d.od), 16)} do ${pole(dataPl(d.do), 16)} na kwotę ${pole(zl(d.kwota), 16)} płatną do rąk wynajmującego w dniu ${pole(dataPl(d.dataPlatnosci), 16)}.</p>
<p>5. Najemca zobowiązuje się zwrócić sprzęt w całości w dniu ${zwrot} do godziny 22.00.</p>
<p>6. W razie zwłoki ze zwrotem sprzętu Najemca zobowiązany jest do poinformowania wynajmującego o zwłoce i uiszczenia opłaty w wysokości ${pole(zl(d.zaDzienZwloki), 10)} za każdy kolejny dzień zwłoki.</p>
<p>7. Jeśli całkowita zwłoka ze zwrotem sprzętu wyniesie więcej niż 7 dni, wynajmujący ma prawo dochodzić od najemcy zapłaty pełnej wartości sprzętu, bez dodatkowego wezwania do zwrotu sprzętu.</p>
<p>8. Strony ustalają wartość sprzętu na kwotę ${pole(zl(d.wartoscSprzetu), 14)} (poszczególne elementy wyposażenia są wyceniane na podstawie cen producenta z daty podpisania niniejszej umowy).</p>
<p>9. Do spraw nieuregulowanych niniejszą umową zastosowanie mają przepisy Kodeksu Cywilnego.</p>
<p>10. Przed zwrotem Najemca zobowiązany jest do poinformowania wynajmującego o chęci zwrotu pod nr ${esc(w.telefony)}. Wynajmujący zobowiązuje się do odbioru sprzętu w miejscu wypożyczenia w dniu ${zwrot}. Jeśli do zwrotu sprzętu nie dojdzie w dniu ${zwrot} roku z winy wynajmującego, strony ustalają najbliższy możliwy termin do zwrotu sprzętu. Najemca nie ponosi z tytułu zwłoki wynajmującego z odbiorem sprzętu żadnych kosztów czy dodatkowych opłat.</p>
<p>11. Przedmiot najmu, czyli Sprzęt Paintball, zostanie opisany w załączniku nr 1 do niniejszej umowy.</p>
${podpisyHtml}
<div class="strona2">
<h2>Załącznik nr 1 do Umowy Najmu sprzętu Paintball/ASG</h2>
<div class="pod">z dnia ${pole(dataPl(d.dataUmowy), 16)} · Najemca: ${pole(d.imie, 34)}</div>
<table><tr><th>Lp.</th><th>Sprzęt</th><th>Model</th><th>Ilość</th><th>Uwagi</th></tr>
${wiersze}
</table>
<p style="margin-top:10px">Najemca potwierdza odbiór sprawnego sprzętu wymienionego powyżej.</p>
${podpisyHtml}
</div>
</body></html>`;
}
