/**
 * Blocco "Da gennaio a oggi" della pagina Andamento: il contatore dell'anno chiesto da Fabio.
 * Legge andamento_blocchi tipo "anno" (una riga per anno), calcolata dall'agente agenti\cruscotto_agenzia (anno.py):
 * mesi da gennaio all'ultimo mese completo, mese in corso a parte, proiezione a dicembre senza le voci una tantum.
 */
import { useQuery } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";

type Somme = {
  provvigioni: number;
  girato: number;
  broker: number;
  una_tantum: number;
  avanzo: number;
  altre_uscite: number;
};
type Totali = {
  entrate: number;
  uscite: number;
  utile: number;
  prelievi_soci: number;
  entrate_una_tantum: number;
  uscite_una_tantum?: number;
  su_100_uscite: number | null;
};
export type Anno = {
  anno: string;
  mesi: string[];
  dal: string | null;
  al: string | null;
  cassa_257: Totali;
  /** dall'11/11/2026: provvigioni maturate e costi con i broker (null finche' l'agente non lo scrive) */
  modello?: Totali | null;
  voci: {
    entrate: Record<string, number>;
    uscite: Record<string, number>;
    sotto: Record<string, number>;
  };
  saldi: Somme;
  saldi_anno_prima: Somme;
  anno_prima: string;
  proiezione: {
    entrate: number | null;
    uscite: number | null;
    utile: number | null;
    provvigioni: number | null;
    girato: number | null;
    una_tantum_entrate: number;
    una_tantum_uscite_saldi: number;
    mesi_usati: number;
  };
  in_corso: {
    mese: string;
    banca_al: string | null;
    saldi_al: string | null;
    entrate: number | null;
    uscite: number | null;
    provvigioni: number | null;
    girato: number | null;
  } | null;
  confronto_uscite: string;
};

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
const nomeMese = (m: string) => MESI[parseInt(m.slice(5, 7), 10) - 1];
const euro = (v: number | null | undefined, decimali = 0) =>
  v == null
    ? "n.d."
    : v.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: decimali,
        maximumFractionDigits: decimali,
        useGrouping: "always",
      } as unknown as Intl.NumberFormatOptions);
const dataIt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT")
    : "n.d.";
const crescita = (ora: number, prima: number) =>
  prima
    ? `${ora >= prima ? "+" : ""}${(((ora - prima) / prima) * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`
    : "";

/** Riga "anno" piu' recente (l'anno in corso). */
export const useBloccoAnno = () =>
  useQuery({
    queryKey: ["andamento", "anno"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori, aggiornato_il")
        .eq("tipo", "anno")
        .order("mese");
      if (error) throw error;
      const r = (data ?? []).at(-1) as
        | { valori: Anno; aggiornato_il: string }
        | undefined;
      return r ? { a: r.valori, aggiornato: r.aggiornato_il } : null;
    },
  });

const Numero = ({
  titolo,
  valore,
  nota,
  colore,
}: {
  titolo: string;
  valore: string;
  nota?: string;
  colore?: boolean;
}) => (
  <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 min-w-0">
    <div className="text-sm text-muted-foreground">{titolo}</div>
    <div
      className={`text-3xl font-semibold tabular-nums tracking-tight ${colore ? "text-green-700 dark:text-green-400" : ""}`}
    >
      {valore}
    </div>
    {nota && <div className="text-sm text-muted-foreground">{nota}</div>}
  </div>
);

export const DaGennaio = () => {
  const { data, isPending, error } = useBloccoAnno();
  if (isPending) return null;
  if (error || !data)
    return (
      <div className="text-sm text-muted-foreground">
        Contatore dell'anno non ancora calcolato.
      </div>
    );
  const { a, aggiornato } = data;
  if (!a.al) return null;
  const c = a.modello ?? a.cassa_257;
  const p = a.proiezione;
  const finoA = `${nomeMese(a.al)} ${a.anno}`;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Da gennaio a {finoA}</h2>
      <p className="text-sm -mt-1">
        Su 100 euro di entrate,{" "}
        {c.su_100_uscite != null ? Math.round(c.su_100_uscite) : "n.d."} sono di
        uscite.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Numero
          titolo="Entrate da gennaio"
          valore={euro(c.entrate)}
          nota={
            a.modello
              ? "provvigioni maturate (foglio Saldi) e altre entrate del 257"
              : "girato dal conto premi al conto gestionale 257 e altre entrate"
          }
        />
        <Numero
          titolo="Uscite dell'agenzia da gennaio"
          valore={euro(c.uscite)}
          nota={
            a.modello
              ? "conto gestionale 257, broker e uscite una tantum del foglio"
              : undefined
          }
        />
        <Numero
          titolo="Utile da gennaio"
          valore={euro(c.utile)}
          colore={c.utile >= 0}
        />
      </div>
      <div className="rounded-lg border bg-card p-4 text-sm">
        <div className="font-medium">
          Dal foglio Saldi, stessi mesi dei due anni
        </div>
        <ul className="mt-1 tabular-nums">
          {(
            [
              [
                "Provvigioni maturate da gennaio",
                a.saldi.provvigioni,
                a.saldi_anno_prima.provvigioni,
              ],
              [
                "Girato ai conti dell'agenzia da gennaio",
                a.saldi.girato,
                a.saldi_anno_prima.girato,
              ],
            ] as [string, number, number][]
          ).map(([nome, ora, prima]) => (
            <li key={nome} className="border-t py-1.5">
              <div>{nome}</div>
              <div className="flex flex-wrap gap-x-4 text-muted-foreground">
                <span>
                  {a.anno}:{" "}
                  <strong className="text-foreground">{euro(ora)}</strong>
                </span>
                <span>
                  {a.anno_prima}: {euro(prima)}
                </span>
                <span>{crescita(ora, prima)}</span>
              </div>
            </li>
          ))}
        </ul>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
          <li>Stessi mesi, da gennaio a {nomeMese(a.al)}, nei due anni.</li>
          {a.saldi_anno_prima.altre_uscite > 0 && (
            <li>
              Nel {a.anno_prima} il foglio ha anche{" "}
              {euro(a.saldi_anno_prima.altre_uscite)} di uscite senza una
              descrizione chiara (non contate nel girato): il confronto del
              girato va letto con questa avvertenza.
            </li>
          )}
          <li>{a.confronto_uscite}</li>
        </ul>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 text-sm">
          <div className="font-medium">
            Prelievi dei soci da gennaio{" "}
            <span className="font-normal text-muted-foreground">
              (non sono uscite dell'agenzia)
            </span>
          </div>
          <div className="text-2xl font-semibold tabular-nums mt-1">
            {euro(c.prelievi_soci)}
          </div>
        </div>
        {a.in_corso && (
          <div className="rounded-lg border bg-card p-4 text-sm">
            <div className="font-medium">
              {nomeMese(a.in_corso.mese).replace(/^./, (x) => x.toUpperCase())}{" "}
              fino al giorno{" "}
              {dataIt(a.in_corso.saldi_al ?? a.in_corso.banca_al)}{" "}
              <span className="font-normal text-muted-foreground">
                (non sommato sopra)
              </span>
            </div>
            <ul className="mt-1 tabular-nums space-y-0.5">
              <li>Provvigioni maturate {euro(a.in_corso.provvigioni)}</li>
              <li>Entrate sul 257 {euro(a.in_corso.entrate)}</li>
              <li>Uscite dal 257 {euro(a.in_corso.uscite)}</li>
            </ul>
          </div>
        )}
      </div>
      <div className="rounded-lg border bg-card p-4 text-sm">
        <div className="font-medium">
          Proiezione a dicembre{" "}
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            stima
          </span>
        </div>
        <ul className="mt-1 tabular-nums space-y-0.5">
          <li>Provvigioni maturate {euro(p.provvigioni)}</li>
          <li>Entrate {euro(p.entrate)}</li>
          <li>Uscite dell'agenzia {euro(p.uscite)}</li>
          <li className="font-semibold">Utile {euro(p.utile)}</li>
        </ul>
        <p className="mt-2 text-muted-foreground">
          Media dei {p.mesi_usati} mesi completi moltiplicata per 12, senza le
          voci una tantum
          {p.una_tantum_entrate > 0 &&
            `: entrate una tantum ${euro(p.una_tantum_entrate)} non messe nella media`}
          {p.una_tantum_uscite_saldi > 0 &&
            `; uscita una tantum dal foglio Saldi ${euro(p.una_tantum_uscite_saldi)}`}
          . Aggiornato il {dataIt(aggiornato)}.
        </p>
      </div>
    </section>
  );
};

export default DaGennaio;
