/** Number, month and date formats of the agency pages: one place, a different name for each behaviour (review R025). */

const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

export const euro = (v: number | null | undefined, decimali = 2): string =>
  v == null || Number.isNaN(v)
    ? "n.d."
    : `${v.toLocaleString("it-IT", {
        minimumFractionDigits: decimali,
        maximumFractionDigits: decimali,
        useGrouping: "always",
      } as unknown as Intl.NumberFormatOptions)} €`;

/** "2026-11" -> "novembre 2026". */
export const nomeMese = (m: string): string => {
  const [a, mm] = m.split("-");
  const n = MESI[Number(mm) - 1];
  return n ? `${n} ${a}` : m;
};
export const nomeMeseAnno = nomeMese;

/** "2026-11" -> "novembre" (month only). */
export const meseSolo = (m: string): string =>
  MESI[parseInt(m.slice(5, 7), 10) - 1] ?? m;

/** Italian number, always with the thousands dot (the browser leaves it out below 10.000, review R100). */
export const numero = (v: number, decimali = 0): string =>
  v.toLocaleString("it-IT", {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
    useGrouping: "always",
  } as unknown as Intl.NumberFormatOptions);

export const euroIntero = (v: number | null | undefined): string => euro(v, 0);

export const tondo = (v: number): number => Math.round(v * 100) / 100;

/** "Fatture di 2026-10 dal cassetto" -> "Fatture di ottobre 2026 dal cassetto" (texts written by the agent). */
export const mesiInLettere = (t: string): string =>
  // not inside a folder path (input\fatture\2026-10) nor a full date (2026-10-05). The character before is captured
  // and put back: a lookbehind throws SyntaxError on iOS Safari before 16.4 (review R015).
  t.replace(
    /(^|[^\\/\w-])(\d{4}-\d{2})(?![-\w])/g,
    (_m, prima: string, mese: string) => prima + nomeMese(mese),
  );

export const dataIt = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT")
    : "n.d.";
