/**
 * Tasse: "Fatture ricevute non ancora pagate" (Fabio 24/11/2026). Costs on the way, shown next to the taxes: they do
 * NOT enter the profit, which stays computed on the bank movements (an invoice counts when it is paid, otherwise it
 * would be counted twice). Partners only (andamento_blocchi is protected by RLS).
 */
import { Link } from "react-router";

import { useBlocchi } from "./datiLati";
import { daCassetto } from "./fattureCassetto";
import type { Fattura, FatturaCassetto } from "./fattureUnite";
import { dataIt, euro } from "./formato";
import { type Spiegazione, Spiegato } from "./Spiega";

const tondo = (v: number): number => Math.round(v * 100) / 100;
const somma = (righe: Fattura[]): number =>
  tondo(righe.reduce((s, r) => s + (r.importo ?? 0), 0));

/** The invoices of the drawer still to pay ("da pagare") or with no payment found ("da verificare"). */
export const nonPagate = (
  mesi: Record<string, { fatture?: FatturaCassetto[] }>,
): Fattura[] =>
  Object.values(mesi)
    .flatMap((m) => (m.fatture ?? []).map((f, i) => daCassetto(f, i)))
    .filter((r) => r.stato === "da pagare" || r.stato === "da verificare")
    .sort((a, b) => b.data.localeCompare(a.data));

export const spiegaNonPagate = (righe: Fattura[]): Spiegazione => {
  const da = righe.filter((r) => r.stato === "da pagare");
  const ver = righe.filter((r) => r.stato === "da verificare");
  const totale = somma(righe);
  return {
    titolo: "Fatture ricevute non ancora pagate",
    cosa: "Fatture del cassetto fiscale di cui negli estratti conto (e nel foglio Saldi per i broker) non c'è il pagamento. Sono costi in arrivo: NON entrano nell'utile, che si calcola sui pagamenti; entrano quando si pagano. Quelle da verificare possono essere già pagate con un'altra descrizione o con la carta.",
    calcolo: [
      { voce: `Da pagare (${da.length})`, valore: somma(da) },
      { voce: `Da verificare (${ver.length})`, valore: somma(ver), segno: "+" },
      { voce: "Totale", valore: totale, segno: "=" },
    ],
    fonte:
      "cassetto fiscale; estratti conto e foglio Saldi per i pagamenti (pagina Fatture)",
    elenco: {
      titolo: "Fatture ricevute non ancora pagate",
      colonne: ["Fattura", "Importo", "Stato"],
      righe: righe.map((r) => [
        `${dataIt(r.data)} ${r.fornitore}, ${r.dettaglio}`,
        r.importo,
        r.stato,
      ]),
      totale: ["Totale", totale, ""],
    },
  };
};

export const FattureNonPagate = () => {
  const q = useBlocchi<{ fatture?: FatturaCassetto[] }, unknown>("fatture");
  if (q.isPending || q.error) return null;
  const righe = nonPagate(q.data?.mesi ?? {});
  if (righe.length === 0) return null;
  const sp = spiegaNonPagate(righe);
  const da = righe.filter((r) => r.stato === "da pagare");
  return (
    <section
      aria-label="Fatture ricevute non ancora pagate"
      className="rounded-lg border border-l-4 border-l-amber-500 bg-card p-3 text-sm sm:p-4"
    >
      <h2 className="text-base font-semibold">
        Fatture ricevute non ancora pagate
      </h2>
      <p className="mt-1 tabular-nums">
        {righe.length} fatture,{" "}
        <Spiegato spiega={sp} className="font-semibold">
          {euro(sp.calcolo?.[2]?.valore as number)}
        </Spiegato>
        , di cui da pagare {da.length} per{" "}
        <Spiegato spiega={sp}>{euro(somma(da))}</Spiegato>.
      </p>
      <p className="mt-1 text-muted-foreground">
        Costi in arrivo: non entrano nell'utile (che conta i pagamenti) finché
        non si pagano. L'elenco con lo stato di ognuna è in{" "}
        <Link to="/fatture?stato=da%20pagare" className="text-pa-blu">
          Fatture
        </Link>
        .
      </p>
    </section>
  );
};
