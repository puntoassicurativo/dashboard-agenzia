import { useState } from "react";

import { useBlocchi, SceltaMese } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { dataIt, euro, nomeMese } from "./formato";
import { Pagina } from "./Lato";

interface Cedolino {
  nome: string;
  lordo: number;
  inps_dipendente: number;
  ebisep: number;
  irpef: number;
  addizionali: number;
  netto: number;
  esito: string;
  bonifico: { conto: string; data: string } | null;
}
interface MesePersonale {
  dipendenti: Cedolino[];
  totali: Record<string, number>;
  n: number;
}
interface InfoPersonale {
  mesi: string[];
  nota: string;
}

const VOCI: [string, string][] = [
  ["lordo", "Lordo (imponibile INPS)"],
  ["inps_dipendente", "Contributi INPS a carico dei dipendenti"],
  ["irpef", "IRPEF trattenuta"],
  ["addizionali", "Addizionali regionale e comunale"],
  ["netto", "Netti pagati"],
];

/**
 * Contabilita' > Personale e contributi (phase 6). Payslip data per person: Supabase RLS lets only partners
 * (utile_accesso) read it, so employees never see salaries.
 */
export const Personale = () => {
  const q = useBlocchi<MesePersonale, InfoPersonale>("personale");
  const [scelto, setScelto] = useState<string | null>(null);
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const mesi = Object.keys(q.data.mesi).sort();
  const nota = q.data.info?.nota;
  if (mesi.length === 0)
    return (
      <Pagina titolo="Personale e contributi" sotto={nota}>
        <div className="rounded-lg border bg-card p-4 text-sm">
          Nessun cedolino letto: lo Studio GPV deve mandarli a
          fattureagenzia@gmail.com.
        </div>
      </Pagina>
    );
  const mese = scelto && q.data.mesi[scelto] ? scelto : mesi[mesi.length - 1];
  const m = q.data.mesi[mese];
  return (
    <Pagina titolo="Personale e contributi" sotto={nota}>
      <SceltaMese
        mesi={mesi}
        valore={mese}
        onChange={setScelto}
        nome={nomeMese}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {VOCI.map(([k, t]) => (
          <div key={k} className="rounded-lg border bg-card p-3">
            <div className="text-muted-foreground">{t}</div>
            <div className="text-lg font-semibold tabular-nums">
              {euro(m.totali[k])}
            </div>
          </div>
        ))}
      </div>
      <h2 className="text-base font-semibold">Cedolino per cedolino</h2>
      <div className="flex flex-col gap-2">
        {m.dipendenti.map((c) => (
          <div key={c.nome} className="rounded-lg border bg-card p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{c.nome}</span>
              <span className="tabular-nums">netto {euro(c.netto)}</span>
            </div>
            <div className="text-muted-foreground tabular-nums">
              lordo {euro(c.lordo)}, INPS {euro(c.inps_dipendente)}, IRPEF{" "}
              {euro(c.irpef)}, addizionali {euro(c.addizionali)}
            </div>
            <div
              className={
                c.esito === "pagato" ? "text-green-700" : "text-amber-700"
              }
            >
              {c.esito === "pagato" && c.bonifico
                ? `bonifico del ${dataIt(c.bonifico.data)} dal conto ${c.bonifico.conto}, uguale al netto`
                : c.esito}
            </div>
          </div>
        ))}
      </div>
    </Pagina>
  );
};
