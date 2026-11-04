/**
 * Umowa najmu sprzętu Paintball/ASG — tekst 1:1 z papierowego wzoru SILT (pokazanego przez Michała 04.11).
 * Pola, które dotąd wpisywano długopisem, wypełnia aplikacja. ŻADNE pole nie jest obowiązkowe
 * (czasem wynajem dla zaufanej osoby) — puste drukuje się jako kropki do ewentualnego dopisania ręcznie.
 * Umowa powstaje tylko w telefonie (PDF do udostępnienia), na serwer nic nie trafia — numery dowodów zostają u nas i u klienta.
 */

import type { Wynajem } from './typy';
import { tekstSprzetu } from './wynajem';

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
  sprzet: string;
};

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
    sprzet: tekstSprzetu(w.sprzet, ', '),
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
export function htmlUmowy(d: DaneUmowy, podpisy: { najemca?: Podpis; wynajmujacy?: Podpis } = {}): string {
  const w = WYNAJMUJACY.silt;
  const zwrot = pole(dataPl(d.dataZwrotu), 16);
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
<p style="margin-top:12px"><b>Załącznik nr 1 — sprzęt:</b> ${pole(d.sprzet, 60)}</p>
<div class="podpisy">${htmlPodpisu(podpisy.najemca, 'Podpis Najemcy')}${htmlPodpisu(podpisy.wynajmujacy, 'Podpis Wynajmującego')}</div>
</body></html>`;
}
