/** Number and date formats shared by the Contabilita' and Amministrazione pages. */

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

export const nomeMese = (m: string): string => {
  const [a, mm] = m.split("-");
  const n = MESI[Number(mm) - 1];
  return n ? `${n} ${a}` : m;
};

export const dataIt = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT")
    : "n.d.";
