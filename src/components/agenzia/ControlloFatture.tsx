/**
 * Fatture: the general check month by month (Fabio 24/11/2026). Invoices of the drawer per cost item (the same rules
 * as the profit) against the outflows of the 257 of the same item, brokers against the Saldi sheet (backend
 * controllo_fatture.py), then two lists: invoices without a payment and outflows without an invoice.
 */
import { useState } from "react";

import type { Fattura } from "./fattureUnite";
import { dataIt, euro, nomeMese } from "./formato";
import { type Spiegazione, Spiegato } from "./Spiega";

export interface VoceControllo {
  voce: string;
  fatture: number;
  n_fatture: number;
  uscite: number;
  n_uscite: number;
  differenza: number;
}
export interface Controllo {
  dal: string;
  al: string;
  mesi: {
    mese: string;
    voci: VoceControllo[];
    fatture: number;
    uscite: number;
  }[];
  uscite_senza_fattura: {
    data: string;
    conto: string;
    importo: number;
    voce: string;
    descrizione: string;
  }[];
  totale_senza_fattura: number;
  nota: string;
}

const tondo = (v: number): number => Math.round(v * 100) / 100;
const FONTE =
  "cassetto fiscale; estratto conto del 257 con le regole dell'utile; foglio Saldi per i broker";

const spiegaVoce = (mese: string, v: VoceControllo): Spiegazione => ({
  titolo: `${v.voce}, ${nomeMese(mese)}`,
  cosa: "Fatture con data nel mese contro le uscite della stessa voce nel mese. Non devono tornare al centesimo: una fattura si paga spesso il mese dopo, la carta Nexi paga in un colpo solo le spese del mese prima, lo studio si paga col netto (senza la ritenuta).",
  calcolo: [
    { voce: `Fatture (${v.n_fatture})`, valore: v.fatture },
    { voce: `Uscite (${v.n_uscite})`, valore: v.uscite, segno: "-" },
    { voce: "Differenza", valore: v.differenza, segno: "=" },
  ],
  fonte: FONTE,
});

const spiegaMese = (m: Controllo["mesi"][number]): Spiegazione => ({
  titolo: `Fatture e uscite di ${nomeMese(m.mese)}`,
  cosa: "Somma delle voci del mese.",
  calcolo: [
    ...m.voci.map((v) => ({
      voce: `${v.voce}: fatture ${euro(v.fatture)}, uscite`,
      valore: v.uscite,
      segno: "+" as const,
    })),
    { voce: "Uscite del mese", valore: m.uscite, segno: "=" },
    { voce: "Fatture del mese", valore: m.fatture },
  ],
  fonte: FONTE,
});

const spiegaSenzaFattura = (c: Controllo): Spiegazione => ({
  titolo: "Uscite senza fattura",
  cosa: "Uscite del conto gestionale 257 nelle voci che di solito hanno una fattura (affitto, studio, professionisti, utenze, carte, formazione, subagenti e collaboratori, altre uscite) che non pagano nessuna fattura del cassetto. Possono essere spese senza fattura elettronica (affitti da privati, bollette pagate col CBILL) o fatture con un altro importo.",
  calcolo: [
    {
      voce: `${c.uscite_senza_fattura.length} uscite`,
      valore: c.totale_senza_fattura,
      segno: "=",
    },
  ],
  fonte: "estratto conto del 257; cassetto fiscale",
  elenco: {
    titolo: "Uscite senza fattura",
    colonne: ["Uscita", "Importo"],
    righe: c.uscite_senza_fattura.map((x) => [
      `${dataIt(x.data)} ${x.voce}: ${x.descrizione}`,
      x.importo,
    ]),
    totale: ["Totale", c.totale_senza_fattura],
  },
});

export const spiegaSenzaPagamento = (righe: Fattura[]): Spiegazione => {
  const totale = tondo(righe.reduce((s, r) => s + (r.importo ?? 0), 0));
  return {
    titolo: "Fatture senza pagamento",
    cosa: "Fatture del cassetto da pagare o di cui il pagamento non si trova (da verificare).",
    calcolo: [{ voce: `${righe.length} fatture`, valore: totale, segno: "=" }],
    fonte: "cassetto fiscale; estratti conto e foglio Saldi",
    elenco: {
      titolo: "Fatture senza pagamento",
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

const CELLA = "py-1 pl-2 text-right whitespace-nowrap";

export const ControlloFatture = ({
  c,
  righe,
}: {
  c: Controllo;
  righe: Fattura[];
}) => {
  const [mese, setMese] = useState(c.mesi.at(-1)?.mese ?? "");
  const m = c.mesi.find((x) => x.mese === mese);
  const senzaPagamento = righe.filter(
    (r) => r.stato === "da pagare" || r.stato === "da verificare",
  );
  const sp = spiegaSenzaPagamento(senzaPagamento);
  const sf = spiegaSenzaFattura(c);
  return (
    <section
      aria-label="Controllo fatture e uscite"
      className="rounded-2xl border bg-card p-4 text-sm"
    >
      <h2 className="text-base font-semibold">
        Controllo fatture e uscite, mese per mese
      </h2>
      <p className="text-muted-foreground">{c.nota}</p>
      <label className="mt-2 flex items-center gap-2">
        <span className="text-muted-foreground">Mese del controllo</span>
        <select
          className="rounded-md border bg-card px-2 py-1 text-sm"
          value={mese}
          onChange={(e) => setMese(e.target.value)}
        >
          {[...c.mesi].reverse().map((x) => (
            <option key={x.mese} value={x.mese}>
              {nomeMese(x.mese)}
            </option>
          ))}
        </select>
      </label>
      {m && (
        <div className="overflow-x-auto">
          <table className="mt-2 w-full tabular-nums">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">Voce</th>
                <th className="py-1 pl-2 text-right font-normal">Fatture</th>
                <th className="py-1 pl-2 text-right font-normal">Uscite</th>
                <th className="py-1 pl-2 text-right font-normal">Differenza</th>
              </tr>
            </thead>
            <tbody>
              {m.voci.map((v) => {
                const s = spiegaVoce(m.mese, v);
                return (
                  <tr key={v.voce} className="border-t align-top">
                    <td className="py-1">{v.voce}</td>
                    <td className={CELLA}>
                      <Spiegato spiega={s}>{euro(v.fatture)}</Spiegato>
                    </td>
                    <td className={CELLA}>
                      <Spiegato spiega={s}>{euro(v.uscite)}</Spiegato>
                    </td>
                    <td
                      className={`${CELLA} ${Math.abs(v.differenza) >= 1 ? "text-amber-700" : ""}`}
                    >
                      <Spiegato spiega={s}>{euro(v.differenza)}</Spiegato>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground font-semibold">
                <td className="py-1">Totale del mese</td>
                <td className={CELLA}>
                  <Spiegato spiega={spiegaMese(m)}>{euro(m.fatture)}</Spiegato>
                </td>
                <td className={CELLA}>
                  <Spiegato spiega={spiegaMese(m)}>{euro(m.uscite)}</Spiegato>
                </td>
                <td className={CELLA}>
                  <Spiegato spiega={spiegaMese(m)}>
                    {euro(tondo(m.fatture - m.uscite))}
                  </Spiegato>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="font-semibold">
            Fatture senza pagamento: {senzaPagamento.length},{" "}
            <Spiegato spiega={sp}>
              {euro(sp.calcolo?.[0]?.valore as number)}
            </Spiegato>
          </h3>
          <ul className="mt-1">
            {senzaPagamento.map((r) => (
              <li
                key={r.chiave}
                className="flex justify-between gap-2 border-t py-1 tabular-nums"
              >
                <span className="min-w-0">
                  {dataIt(r.data)} {r.fornitore}
                  <span className="block text-xs text-muted-foreground">
                    {r.dettaglio}, {r.stato}
                  </span>
                </span>
                <Spiegato spiega={r.spiega} className="whitespace-nowrap">
                  {euro(r.importo)}
                </Spiegato>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">
            Uscite senza fattura: {c.uscite_senza_fattura.length},{" "}
            <Spiegato spiega={sf}>{euro(c.totale_senza_fattura)}</Spiegato>
          </h3>
          <ul className="mt-1">
            {c.uscite_senza_fattura.map((x, i) => (
              <li
                key={`${x.data}-${i}`}
                className="flex justify-between gap-2 border-t py-1 tabular-nums"
              >
                <span className="min-w-0">
                  {dataIt(x.data)} {x.voce}
                  <span className="block text-xs text-muted-foreground break-words">
                    {x.descrizione}
                  </span>
                </span>
                <Spiegato
                  spiega={{
                    titolo: `Uscita del ${dataIt(x.data)}`,
                    cosa: `Uscita del conto ${x.conto} nella voce "${x.voce}" che non paga nessuna fattura del cassetto.`,
                    calcolo: [
                      { voce: "Uscita", valore: x.importo, segno: "=" },
                    ],
                    fonte: `estratto conto del ${x.conto}`,
                  }}
                  className="whitespace-nowrap"
                >
                  {euro(x.importo)}
                </Spiegato>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
