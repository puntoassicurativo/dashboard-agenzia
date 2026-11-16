import { useBlocchi } from "./datiLati";
import { dataIt, euro, nomeMese } from "./formato";

export interface ControlloRitenuta {
  base: number;
  attesa: number;
  perc: number;
  trattenuta: number | null;
  decadi: string[];
  differenza: number | null;
  base_vittoria: number | null;
  diff_base: number | null;
  stima_vittoria: number | null;
}

const MESI_MOSTRATI = 6;
const SOGLIA_EURO = 1;

const percIt = (p: number) => p.toLocaleString("it-IT");

/** One line per month: withheld amount against the rate applied to commissions plus PNA of that month. */
export const frase = (c: ControlloRitenuta): string => {
  const p = percIt(c.perc);
  const base =
    c.diff_base != null && Math.abs(c.diff_base) >= SOGLIA_EURO
      ? `. Base di Vittoria diversa di ${euro(c.diff_base)}`
      : "";
  if (c.trattenuta != null && c.differenza != null) {
    const dove =
      c.decadi.length > 0
        ? ` (decade del ${c.decadi.map(dataIt).join(", ")})`
        : "";
    return (
      `Ritenuta trattenuta ${euro(c.trattenuta)}${dove}, ${p}% di provvigioni e PNA del mese prima ` +
      `${euro(c.attesa)}, differenza ${euro(c.differenza)}${base}.`
    );
  }
  return (
    `File della decade del mese dopo non disponibile. ${p}% di provvigioni e PNA ${euro(c.attesa)}` +
    (c.stima_vittoria != null
      ? `, stima sulla base di Vittoria ${euro(c.stima_vittoria)}`
      : "") +
    "."
  );
};

/**
 * Contabilita' > Ritenute, top box (Fabio's answer 7, 16/11/2026): the 4.6% withholding Vittoria keeps from the
 * non-insurance items of the following month. Partners only: andamento_blocchi type "pna" (RLS).
 */
export const RitenutaCompagnia = () => {
  const q = useBlocchi<
    { controllo_ritenuta?: ControlloRitenuta | null },
    unknown
  >("pna");
  if (!q.data) return null;
  const mesi = Object.entries(q.data.mesi)
    .filter(([, v]) => v.controllo_ritenuta)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, MESI_MOSTRATI);
  if (mesi.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="font-medium">
        Ritenuta che la compagnia trattiene all'agenzia
      </div>
      <div className="text-muted-foreground">
        Si trattiene dalle partite non assicurative nelle decadi del mese dopo.
      </div>
      <ul className="mt-2 space-y-1">
        {mesi.map(([mese, v]) => (
          <li key={mese} className="border-t pt-1">
            <span className="font-medium">Provvigioni di {nomeMese(mese)}</span>
            <span className="block text-muted-foreground tabular-nums">
              {frase(v.controllo_ritenuta as ControlloRitenuta)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
