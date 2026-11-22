/**
 * Card of style 2 used by the main page: coloured line on the left (green grows, red goes badly, blue neutral),
 * big number, notes below and an optional small chart. Moved out of Cruscotto.tsx (18/11/2026) so the month
 * picker can reuse it.
 */
import type { ReactNode } from "react";

import { Spark } from "./Spark";
import { type Spiegazione, Spiegato } from "./Spiega";

export type Colore = "verde" | "blu" | "rosso";

const RIGA: Record<Colore, string> = {
  verde: "border-l-pa-verde",
  blu: "border-l-pa-blu",
  rosso: "border-l-pa-rosso",
};
const TESTO: Record<Colore, string> = {
  verde: "text-pa-verde",
  blu: "text-foreground",
  rosso: "text-pa-rosso",
};

// useGrouping "always": in Italian the browser leaves out the dot below 10,000 (2604 instead of 2.604)
export const euro = (v: number | null | undefined, decimali = 0): string =>
  v == null
    ? "n.d."
    : v.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: decimali,
        maximumFractionDigits: decimali,
        useGrouping: "always",
      } as unknown as Intl.NumberFormatOptions);
export const euroSegno = (v: number): string => (v > 0 ? "+" : "") + euro(v);

/** Change with arrow and word, never colour alone (style 2: in a small pill). */
export const Variazione = ({
  pct,
  testo,
}: {
  pct: number | null;
  testo: string;
}) => {
  if (pct == null)
    return <span className="text-muted-foreground">{testo}: n.d.</span>;
  const su = pct >= 0;
  return (
    <span
      className={`self-start rounded-full px-2.5 py-0.5 font-medium ${
        su
          ? "bg-pa-verde-chiaro text-pa-verde"
          : "bg-pa-rosso-chiaro text-pa-rosso"
      }`}
    >
      {su ? "▲" : "▼"} {su ? "+" : ""}
      {pct.toLocaleString("it-IT", { maximumFractionDigits: 1 })}% {testo}
    </span>
  );
};

export interface RiquadroProps {
  titolo: string;
  valore: string;
  colore?: Colore;
  /** Fabio 18/11/2026: the number itself in green or red too (surplus), not only the line on the left. */
  coloraValore?: boolean;
  serie?: number[];
  etichettaSerie?: string;
  azione?: ReactNode;
  /** 22/11/2026: the explanation of the big number (panel on hover or tap, full list on click). */
  spiega?: Spiegazione;
  children?: ReactNode;
}

export const Riquadro = ({
  titolo,
  valore,
  colore = "blu",
  coloraValore = false,
  serie,
  etichettaSerie,
  azione,
  spiega,
  children,
}: RiquadroProps) => (
  <div
    className={`rounded-2xl border border-l-4 ${RIGA[colore]} bg-card p-3.5 sm:p-5 flex flex-col gap-1 min-w-0 shadow-sm`}
  >
    <div className="flex flex-wrap items-center justify-between gap-1">
      <div className="text-sm text-muted-foreground">{titolo}</div>
      {azione}
    </div>
    <div
      className={`text-xl sm:text-3xl font-bold tabular-nums tracking-tight ${
        coloraValore ? TESTO[colore] : "text-foreground"
      }`}
    >
      {spiega ? <Spiegato spiega={spiega}>{valore}</Spiegato> : valore}
    </div>
    <div className="text-xs sm:text-sm flex flex-col gap-1 tabular-nums">
      {children}
    </div>
    {serie && <Spark valori={serie} etichetta={etichettaSerie ?? titolo} />}
  </div>
);
