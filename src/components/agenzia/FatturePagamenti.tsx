import { useState } from "react";

import { useBlocchi, SceltaMese } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { dataIt, euro, nomeMese } from "./formato";
import { Pagina } from "./Lato";

interface Fattura {
  fornitore: string;
  numero: string;
  data: string;
  tipo_testo: string;
  imponibile: number;
  iva: number;
  ritenuta: number;
  totale: number;
  netto: number;
  scadenza: string | null;
  esito: string;
  pagamento: { conto: string; data: string } | null;
}
interface MeseFatture {
  fatture: Fattura[];
  conteggi: Record<string, number>;
  totale: number;
  imponibile: number;
  iva: number;
  ritenute: number;
}
interface InfoFatture {
  mesi: string[];
  n_fatture: number;
  errori: { file: string; errore: string }[];
  uscite_al: string | null;
  nota: string;
}

const COLORE: Record<string, string> = {
  pagata: "text-green-700",
  "pagata, nome non trovato": "text-amber-700",
  "non ancora pagata": "text-red-700",
  "nota di credito": "text-muted-foreground",
};

/** Contabilita' > Fatture e pagamenti (phase 5 of the 13/11/2026 plan): tax-drawer invoices matched to bank exits. */
export const FatturePagamenti = () => {
  const q = useBlocchi<MeseFatture, InfoFatture>("fatture");
  const [scelto, setScelto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("tutte");
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const info = q.data.info;
  const mesi = Object.keys(q.data.mesi).sort();
  if (!info || mesi.length === 0)
    return (
      <Pagina titolo="Fatture e pagamenti">
        <div className="rounded-lg border bg-card p-4 text-sm space-y-2">
          <p className="font-medium">
            Non ci sono ancora fatture da controllare.
          </p>
          <p>
            Ogni mese, verso il 5: dal cassetto fiscale (Fatture e
            Corrispettivi, Consultazione, Fatture ricevute) si scaricano gli XML
            del mese prima e si mettono nella cartella{" "}
            <code>input\fatture\AAAA-MM</code> sul PC di Lorenzo. Il giro della
            mattina dopo le legge e le confronta con le uscite in banca.
          </p>
        </div>
      </Pagina>
    );
  const mese = scelto && q.data.mesi[scelto] ? scelto : mesi[mesi.length - 1];
  const m = q.data.mesi[mese];
  const lista = m.fatture.filter(
    (f) => filtro === "tutte" || f.esito === filtro,
  );
  return (
    <Pagina titolo="Fatture e pagamenti" sotto={info.nota}>
      <div className="flex flex-wrap items-center gap-3">
        <SceltaMese
          mesi={mesi}
          valore={mese}
          onChange={setScelto}
          nome={nomeMese}
        />
        <select
          className="rounded border bg-background px-2 py-1 text-sm"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option value="tutte">Tutte ({m.fatture.length})</option>
          {Object.entries(m.conteggi).map(([e, n]) => (
            <option key={e} value={e}>
              {e} ({n})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {[
          ["Imponibile", m.imponibile],
          ["IVA", m.iva],
          ["Ritenute", m.ritenute],
          ["Totale fatture", m.totale],
        ].map(([t, v]) => (
          <div key={t as string} className="rounded-lg border bg-card p-3">
            <div className="text-muted-foreground">{t}</div>
            <div className="text-lg font-semibold tabular-nums">
              {euro(v as number)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {lista.map((f) => (
          <div
            key={`${f.fornitore}-${f.numero}`}
            className="rounded-lg border bg-card p-3 text-sm"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">{f.fornitore}</span>
              <span className="tabular-nums font-semibold">
                {euro(f.totale)}
              </span>
            </div>
            <div className="text-muted-foreground">
              {f.tipo_testo} n. {f.numero} del {dataIt(f.data)}
              {f.ritenuta > 0 && `, ritenuta ${euro(f.ritenuta)}`}, da pagare{" "}
              {euro(f.netto)}
              {f.scadenza && `, scadenza ${dataIt(f.scadenza)}`}
            </div>
            <div className={COLORE[f.esito] ?? ""}>
              {f.esito}
              {f.pagamento &&
                ` il ${dataIt(f.pagamento.data)} dal conto ${f.pagamento.conto}`}
            </div>
          </div>
        ))}
      </div>
      {info.errori.length > 0 && (
        <div className="rounded-lg border border-red-300 p-3 text-sm">
          <div className="font-medium text-red-700">File non letti</div>
          <ul className="list-disc pl-5">
            {info.errori.map((e) => (
              <li key={e.file}>
                {e.file}: {e.errore}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Uscite in banca lette fino al {dataIt(info.uscite_al)}.
      </p>
    </Pagina>
  );
};
