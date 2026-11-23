/**
 * Fatture: first entry of the partners' menu (Lorenzo 22/11/2026, answer 2 to the menu schema; Fabio 17/11/2026: opening
 * he wants to see every invoice at once). One page in place of Tutte le fatture, Fatture e pagamenti and Fatture
 * subagenti: the full list straight away, split by month from the newest, with a filter by type and by payment. Every
 * amount and every month total explains itself. Partners only (andamento_blocchi is protected by RLS).
 */
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { useBlocchi } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import {
  type Bolletta,
  type BrokerRiga,
  type Fattura,
  type FatturaCassetto,
  type FatturaSub,
  filtra,
  spiegaRicerca,
  perMese,
  type Stato,
  STATI,
  testoImporto,
  type Tipo,
  TIPI,
  unisciFatture,
} from "./fattureUnite";
import { dataIt, euro, nomeMese } from "./formato";
import { Pagina } from "./Lato";
import { Spiegato } from "./Spiega";

interface Tombale {
  rate: { data: string; importo: number; stato: string }[];
  rate_totali: number;
  pagate: number;
  restano_nel_prospetto: number;
  rate_senza_importo: number;
  ultima: string;
  totale_prospetto: number;
  arrivato: string;
}
interface InfoCassetto {
  n_fatture: number;
  /** rows of the CSV list without their XML (23/11/2026) */
  senza_xml?: number;
  mesi_senza_xml?: string[];
  errori: { file: string; errore: string }[];
  uscite_al: string | null;
  nota: string;
}

/** sub_fatture rows have keys "AAAA-MM|CHI": read as they are, with a query key of their own (no shared cache shape). */
const useFattureSub = () =>
  useQuery({
    queryKey: ["fatture", "sub_fatture"],
    queryFn: async (): Promise<Record<string, FatturaSub>> => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori")
        .eq("tipo", "sub_fatture");
      if (error) throw error;
      const righe = (data ?? []) as { mese: string; valori: FatturaSub }[];
      return Object.fromEntries(
        righe
          .filter((r) => r.mese.includes("|"))
          .map((r) => [r.mese, r.valori]),
      );
    },
  });

const COLORE: Record<Stato, string> = {
  pagata: "",
  "da pagare": "text-pa-rosso",
  "importo diverso": "text-pa-rosso",
  "da arrivare": "text-muted-foreground",
  "da verificare": "text-amber-700",
};

const RigaElenco = ({ r }: { r: Fattura }) => (
  <tr className="border-t align-top">
    <td className="py-1.5 pr-2 whitespace-nowrap hidden sm:table-cell">
      {dataIt(r.data)}
    </td>
    <td className="py-1.5 pr-2">
      {r.fornitore}
      <span className="block text-xs text-muted-foreground">
        <span className="sm:hidden">{dataIt(r.data)}, </span>
        {r.dettaglio}
      </span>
    </td>
    <td className="py-1.5 text-right whitespace-nowrap">
      <Spiegato spiega={r.spiega}>{testoImporto(r)}</Spiegato>
    </td>
    <td className="py-1.5 pl-2 text-right hidden sm:table-cell whitespace-nowrap">
      {r.ritenuta ? euro(r.ritenuta) : ""}
    </td>
    <td className={`py-1.5 pl-2 text-right ${COLORE[r.stato]}`}>{r.pagata}</td>
  </tr>
);

const Scelta = <T extends string>({
  etichetta,
  valore,
  voci,
  onChange,
}: {
  etichetta: string;
  valore: T;
  voci: [T, string][];
  onChange: (v: T) => void;
}) => (
  <label className="flex items-center gap-2 text-sm">
    <span className="text-muted-foreground">{etichetta}</span>
    <select
      className="rounded-md border bg-card px-2 py-1 text-sm"
      value={valore}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {voci.map(([v, t]) => (
        <option key={v} value={v}>
          {t}
        </option>
      ))}
    </select>
  </label>
);

const RiquadroTombale = ({ t }: { t: Tombale }) => (
  <div className="rounded-2xl border border-l-4 border-l-pa-blu bg-card p-4 text-sm">
    <div className="font-semibold">Rateizzazione tombale 2018-2022</div>
    <div className="text-muted-foreground tabular-nums mt-1">
      Pagate {t.pagate} rate di {t.rate_totali}. Restano{" "}
      <Spiegato
        spiega={{
          titolo: "Rate della tombale ancora da pagare",
          cosa: "Rate del prospetto dello studio non ancora addebitate. Ogni rata è l'F24 di fine mese sul conto gestionale: costo non deducibile, già nei conti.",
          calcolo: [
            { voce: "Totale del prospetto", valore: t.totale_prospetto },
            {
              voce: `Rate già pagate (${t.pagate})`,
              valore:
                Math.round(
                  (t.totale_prospetto - t.restano_nel_prospetto) * 100,
                ) / 100,
              segno: "-",
            },
            { voce: "Restano", valore: t.restano_nel_prospetto, segno: "=" },
          ],
          fonte: `prospetto dello studio arrivato il ${dataIt(t.arrivato)}; estratti conto`,
          elenco: {
            titolo: "Rate della tombale",
            colonne: ["Data", "Importo", "Stato"],
            righe: t.rate.map((x) => [dataIt(x.data), x.importo, x.stato]),
          },
        }}
      >
        {euro(t.restano_nel_prospetto)}
      </Spiegato>{" "}
      nel prospetto dello studio
      {t.rate_senza_importo > 0 &&
        ` più ${t.rate_senza_importo} rate da comunicare, l'ultima a ${nomeMese(t.ultima)}`}
      .
    </div>
  </div>
);

export const Fatture = () => {
  const sub = useFattureSub();
  const broker = useBlocchi<{ righe?: BrokerRiga[] }, unknown>("broker_saldi");
  const cassetto = useBlocchi<{ fatture?: FatturaCassetto[] }, InfoCassetto>(
    "fatture",
  );
  const bollette = useBlocchi<unknown, { bollette: Bolletta[] }>("bollette");
  const tombale = useBlocchi<unknown, Tombale | null>("tombale");
  const [parametri, setParametri] = useSearchParams();
  const tipo = (parametri.get("tipo") ?? "tutte") as Tipo | "tutte";
  const stato = (parametri.get("stato") ?? "tutti") as Stato | "tutti";
  const cerca = parametri.get("cerca") ?? "";
  const cambia = (chiave: string, valore: string, base: string) => {
    const p = new URLSearchParams(parametri);
    if (valore === base) p.delete(chiave);
    else p.set(chiave, valore);
    setParametri(p, { replace: true });
  };

  const qs = [sub, broker, cassetto, bollette, tombale];
  if (qs.some((q) => q.isPending))
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  const errore = qs.find((q) => q.error)?.error;
  if (errore) return <ErroreCaricamento errore={errore} />;

  const tutte = unisciFatture({
    sub: sub.data ?? {},
    broker: broker.data?.mesi ?? {},
    cassetto: cassetto.data?.mesi ?? {},
    bollette: bollette.data?.info?.bollette ?? [],
  });
  const righe = filtra(tutte, tipo, stato, cerca);
  const mesi = perMese(righe);
  const infoCassetto = cassetto.data?.info;
  const filtrate = tipo !== "tutte" || stato !== "tutti" || cerca.trim() !== "";
  return (
    <div className="pt-4 md:pt-0">
      <Pagina
        titolo="Fatture"
        sotto={`Tutte le fatture, dalla più recente: subagenti, collaboratori, broker, bollette e fornitori del cassetto fiscale. ${tutte.length} in tutto. Passa sopra (o tocca) un importo per vedere il calcolo.`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Scelta
            etichetta="Tipo"
            valore={tipo}
            voci={[
              ["tutte", "Tutte"],
              ...(Object.entries(TIPI) as [Tipo, string][]),
            ]}
            onChange={(v) => cambia("tipo", v, "tutte")}
          />
          <Scelta
            etichetta="Pagamento"
            valore={stato}
            voci={[
              ["tutti", "Tutti"],
              ...STATI.map((s): [Stato, string] => [s, s]),
            ]}
            onChange={(v) => cambia("stato", v, "tutti")}
          />
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Cerca</span>
            <input
              type="search"
              className="w-44 rounded-md border bg-card px-2 py-1 text-sm"
              placeholder="fornitore, es. Marradi"
              value={cerca}
              onChange={(e) => cambia("cerca", e.target.value, "")}
            />
          </label>
          {filtrate && (
            <span className="text-sm text-muted-foreground">
              {righe.length} di {tutte.length}
            </span>
          )}
        </div>

        {cerca.trim() !== "" && righe.length > 0 && (
          <div className="rounded-2xl border border-l-4 border-l-pa-blu bg-card p-4 text-sm">
            {righe.length} {righe.length === 1 ? "fattura" : "fatture"} con "
            {cerca.trim()}", totale{" "}
            <Spiegato
              spiega={spiegaRicerca(righe, cerca)}
              className="font-semibold"
            >
              {euro(
                Math.round(
                  righe.reduce((s, r) => s + (r.importo ?? 0), 0) * 100,
                ) / 100,
              )}
            </Spiegato>
          </div>
        )}

        {mesi.length === 0 && (
          <div className="rounded-lg border bg-card p-4 text-sm">
            Nessuna fattura con questi filtri.
          </div>
        )}
        {mesi.map((m) => (
          <section
            key={m.mese}
            aria-label={nomeMese(m.mese)}
            className="rounded-2xl border bg-card p-4 text-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold capitalize">
                {nomeMese(m.mese)}
              </h2>
              <span className="text-muted-foreground tabular-nums">
                {m.righe.length} {m.righe.length === 1 ? "fattura" : "fatture"},{" "}
                <Spiegato
                  spiega={m.spiega}
                  className="font-semibold text-foreground"
                >
                  {euro(m.totale)}
                </Spiegato>
              </span>
            </div>
            <div className="overflow-x-auto">
              {/* fixed columns: the amounts stay aligned from one month to the next */}
              <table className="mt-2 w-full table-fixed tabular-nums">
                <thead className="text-muted-foreground text-left">
                  <tr>
                    <th className="font-normal py-1 hidden sm:table-cell w-28">
                      Data
                    </th>
                    <th className="font-normal">Fornitore</th>
                    <th className="font-normal text-right w-28 sm:w-32">
                      Importo
                    </th>
                    <th className="font-normal text-right hidden sm:table-cell w-28">
                      Ritenuta
                    </th>
                    <th className="font-normal text-right w-24 sm:w-48">
                      Pagata il
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {m.righe.map((r) => (
                    <RigaElenco key={r.chiave} r={r} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {tombale.data?.info && <RiquadroTombale t={tombale.data.info} />}
        {infoCassetto && infoCassetto.n_fatture === 0 && (
          <p className="text-xs text-muted-foreground">
            Fatture del cassetto fiscale: non ancora arrivate.{" "}
            {infoCassetto.nota}
          </p>
        )}
        {infoCassetto && (infoCassetto.senza_xml ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground">
            {infoCassetto.senza_xml} fatture del cassetto vengono solo
            dall'elenco, senza l'XML: ritenuta e netto non si leggono e il
            pagamento si ricava dal bonifico quando c'è il nome del fornitore.
            Mesi da scaricare col download massivo:{" "}
            {(infoCassetto.mesi_senza_xml ?? []).map(nomeMese).join(", ")}.
          </p>
        )}
        {infoCassetto && infoCassetto.errori.length > 0 && (
          <div className="rounded-lg border border-red-300 p-3 text-sm">
            <div className="font-medium text-red-700">File non letti</div>
            <ul className="list-disc pl-5">
              {infoCassetto.errori.map((e) => (
                <li key={e.file}>
                  {e.file}: {e.errore}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Pagina>
    </div>
  );
};

export default Fatture;
