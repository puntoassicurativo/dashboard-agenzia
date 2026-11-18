import { useQuery } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { useAccessoUtile } from "./Andamento";
import { type RigaLato, FattoNota, useRighe } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { dataIt, euro, nomeMese } from "./formato";
import { Pagina } from "./Lato";

/** Public part (sezione_righe "SFT", every logged-in user): only what is done, no amounts. */
interface DatiFattura {
  mese: string;
  subagente: string;
  stato: string;
  arrivata: boolean;
  giusta: boolean | "decade_mancante" | null;
  pagata: boolean;
  pagata_il: string | null;
  pagata_diversa?: boolean;
  con_decadi: boolean;
}

/** Amounts (andamento_blocchi "sub_fatture", partners only through RLS). */
interface CifreFattura {
  atteso: {
    imponibile: number;
    completo: boolean;
    decadi: { decade: string; totale: number }[];
  } | null;
  fattura: {
    numero: string | null;
    data: string | null;
    imponibile: number | null;
    bollo: number | null;
    ritenuta: number | null;
    netto: number | null;
  } | null;
  bonifico: { data: string; importo: number; conto: string } | null;
  bonifico_diverso: { data: string; importo: number; conto: string } | null;
  differenze: Record<string, number> | null;
}

const useCifre = (isSocio: boolean) =>
  useQuery({
    queryKey: ["andamento", "sub_fatture"],
    enabled: isSocio,
    queryFn: async (): Promise<Record<string, CifreFattura>> => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori")
        .eq("tipo", "sub_fatture");
      if (error) throw error;
      const righe = (data ?? []) as { mese: string; valori: CifreFattura }[];
      return Object.fromEntries(righe.map((x) => [x.mese, x.valori]));
    },
  });

/** A check mark with its word: never colour alone. */
const Spunta = ({ si, testo }: { si: boolean | null; testo: string }) => (
  <span
    className={
      si === true
        ? "text-green-700"
        : si === false
          ? "text-red-700"
          : "text-muted-foreground"
    }
  >
    {si === true ? "✓" : si === false ? "✗" : "–"} {testo}
  </span>
);

export const SchedaFattura = ({
  r,
  cifre,
}: {
  r: RigaLato<DatiFattura>;
  cifre?: CifreFattura;
}) => {
  const d = r.dati;
  const giusta =
    d.giusta === "decade_mancante" ? null : d.arrivata ? d.giusta : null;
  const f = cifre?.fattura;
  return (
    <div
      className={`rounded-lg border bg-card p-3 text-sm flex flex-col gap-1 ${r.fatto ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-semibold">
          {d.subagente}, {nomeMese(d.mese)}
        </span>
        <span className="flex flex-wrap gap-3">
          <Spunta
            si={d.arrivata ? true : null}
            testo={
              d.arrivata ? "fattura arrivata" : "fattura non ancora arrivata"
            }
          />
          {d.con_decadi && (
            <Spunta
              si={giusta}
              testo={
                d.giusta === "decade_mancante"
                  ? "decade mancante"
                  : "fattura giusta"
              }
            />
          )}
          {d.arrivata && (
            <Spunta
              si={d.pagata ? true : d.pagata_diversa ? false : null}
              testo={
                d.pagata
                  ? `pagata il ${dataIt(d.pagata_il)}`
                  : d.pagata_diversa
                    ? "pagata con un importo diverso"
                    : "non ancora pagata"
              }
            />
          )}
        </span>
      </div>
      {f && f.netto != null && (
        <div className="text-muted-foreground tabular-nums">
          Fattura {f.numero ?? ""} del {dataIt(f.data)}: imponibile{" "}
          {euro(f.imponibile)}
          {f.bollo ? `, bollo ${euro(f.bollo)}` : ""}, ritenuta{" "}
          {euro(f.ritenuta)}, netto {euro(f.netto)}
        </div>
      )}
      {cifre?.atteso && (
        <div className="text-muted-foreground tabular-nums">
          Dalle decadi (
          {cifre.atteso.decadi.map((x) => dataIt(x.decade)).join(", ")}
          ): {euro(cifre.atteso.imponibile)}
          {!cifre.atteso.completo && ", manca almeno una decade"}
          {cifre.differenze?.imponibile != null &&
            Math.abs(cifre.differenze.imponibile) >= 0.01 &&
            cifre.atteso.completo && (
              // Fabio 18/11/2026: under 1 euro it is a small error, shown in grey, not in red
              <span
                className={
                  Math.abs(cifre.differenze.imponibile) < SOGLIA_EURO
                    ? "text-muted-foreground"
                    : "text-red-700"
                }
              >
                , differenza {euro(cifre.differenze.imponibile)}
              </span>
            )}
        </div>
      )}
      {cifre?.bonifico_diverso && (
        <div className="text-red-700 tabular-nums">
          Bonifico del {dataIt(cifre.bonifico_diverso.data)}:{" "}
          {euro(cifre.bonifico_diverso.importo)}, netto della fattura{" "}
          {euro(f?.netto)}
        </div>
      )}
      <FattoNota r={r} />
    </div>
  );
};

/** Differences under this amount are right (Fabio, 18/11/2026); same as fonti.SOGLIA_EURO in the agent. */
const SOGLIA_EURO = 1;

/** Amministrazione > Fatture subagenti (piano 16/11/2026, fase 8): one row per sub-agent and month, three checks. */
export const FattureSubagenti = () => {
  const q = useRighe<DatiFattura>("SFT");
  const accesso = useAccessoUtile();
  const cifre = useCifre(accesso.data === true);
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const mesi = [...new Set(q.data.righe.map((r) => r.dati.mese))]
    .sort()
    .reverse();
  return (
    <Pagina titolo="Fatture dei subagenti" sotto={q.data.info?.riepilogo.nota}>
      {mesi.length === 0 && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          Nessuna fattura ancora.
        </div>
      )}
      {mesi.map((mese, i) => (
        <details key={mese} open={i === 0} className="flex flex-col gap-2">
          <summary className="cursor-pointer select-none text-base font-semibold py-1">
            {nomeMese(mese)}
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {q.data.righe
              .filter((r) => r.dati.mese === mese)
              .map((r) => (
                <SchedaFattura
                  key={r.chiave}
                  r={r}
                  cifre={cifre.data?.[r.chiave]}
                />
              ))}
          </div>
        </details>
      ))}
    </Pagina>
  );
};
