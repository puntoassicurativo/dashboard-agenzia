/**
 * Non-insurance items (PNA) and withholding tax of the Andamento page: company incentives and contributions
 * (revenue), deductions made by the company (costs) and the withholding tax kept by the company (taxes already
 * paid, outside costs). Reads andamento_blocchi type "pna", written every morning by the local agent (pna.py)
 * from BusinessObjects (accrual basis) or, for a month BO has not published yet, from the decade file.
 * Restricted like the rest of the page through RLS on utile_accesso.
 */
import { useQuery } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";

export type PnaMese = {
  fonte: "bo" | "decade";
  fonte_data?: string | null;
  ricavi: Record<string, number>;
  una_tantum: Record<string, number>;
  costi: Record<string, number>;
  da_classificare: Record<string, number>;
  pna_ricavi: number;
  trattenute: number;
  ritenuta: number | null;
  ritenuta_fonte: "decade" | "stima" | "manca";
};
export type PnaInfo = {
  descrizioni: Record<string, string>;
  anno: {
    anno: string;
    al: string | null;
    ricavi: number;
    una_tantum: number;
    trattenute: number;
    ritenuta: number;
  };
  manuali: { voce: string; fino_a: string; importo: number; fonte: string }[];
  nota: string;
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
const nomeMese = (m: string) =>
  `${MESI[parseInt(m.slice(5, 7), 10) - 1]} ${m.slice(0, 4)}`;
const euro = (v: number | null | undefined, decimali = 2) =>
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

export const useBlocchiPna = () =>
  useQuery({
    queryKey: ["andamento", "pna"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori")
        .eq("tipo", "pna")
        .order("mese");
      if (error) throw error;
      const righe = (data ?? []) as { mese: string; valori: unknown }[];
      return {
        mesi: Object.fromEntries(
          righe
            .filter((r) => /^\d{4}-\d{2}$/.test(r.mese))
            .map((r) => [r.mese, r.valori as PnaMese]),
        ) as Record<string, PnaMese>,
        info: (righe.find((r) => r.mese === "info")?.valori ??
          null) as PnaInfo | null,
      };
    },
  });

const Elenco = ({
  voci,
  descr,
  segno,
}: {
  voci: Record<string, number>;
  descr: Record<string, string>;
  segno: 1 | -1;
}) => (
  <ul className="mt-1 text-sm text-muted-foreground">
    {Object.entries(voci)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .map(([cod, v]) => (
        <li
          key={cod}
          className="flex justify-between gap-3 border-t py-1 tabular-nums"
        >
          <span className="min-w-0">
            {descr[cod] ? descr[cod].toLowerCase() : `codice ${cod}`}
          </span>
          <span className="whitespace-nowrap">{euro(segno * v)}</span>
        </li>
      ))}
  </ul>
);

const Riquadro = ({
  titolo,
  valore,
  sotto,
  children,
}: {
  titolo: string;
  valore: number | null;
  sotto?: string;
  children?: React.ReactNode;
}) => (
  <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 min-w-0">
    <div className="text-sm text-muted-foreground">{titolo}</div>
    <div className="text-2xl font-semibold tabular-nums">
      {valore == null ? "non ancora" : euro(valore)}
    </div>
    {sotto && <div className="text-xs text-muted-foreground">{sotto}</div>}
    {children && (
      <details className="text-sm">
        <summary className="cursor-pointer select-none text-xs text-muted-foreground">
          voce per voce
        </summary>
        {children}
      </details>
    )}
  </div>
);

export const PnaBlocco = ({
  mese,
  dati,
}: {
  mese: string;
  dati: { mesi: Record<string, PnaMese>; info: PnaInfo | null };
}) => {
  const p = dati.mesi[mese];
  const info = dati.info;
  const descr = info?.descrizioni ?? {};
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">
          Partite non assicurative e ritenuta di {nomeMese(mese)}
        </h2>
        {info && <p className="text-sm text-muted-foreground">{info.nota}</p>}
      </div>
      {!p ? (
        <p className="text-sm text-muted-foreground">
          Per questo mese la compagnia non ha ancora pubblicato le partite non
          assicurative.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {p.fonte === "bo"
              ? "Fonte: BusinessObjects, Prospetto Competenze del mese."
              : `Fonte: file della decade del ${dataIt(p.fonte_data)}. BusinessObjects non ha ancora pubblicato questo mese.`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Riquadro
              titolo="Incentivi e contributi della compagnia (entrate)"
              valore={p.pna_ricavi}
              sotto={
                Object.keys(p.una_tantum).length
                  ? `di cui una tantum ${euro(Object.values(p.una_tantum).reduce((s, v) => s + v, 0))}`
                  : undefined
              }
            >
              <Elenco voci={p.ricavi} descr={descr} segno={1} />
            </Riquadro>
            <Riquadro
              titolo="Trattenute della compagnia: fondo pensione, polizze dell'agenzia, GAV (uscite)"
              valore={-p.trattenute}
            >
              <Elenco voci={p.costi} descr={descr} segno={-1} />
            </Riquadro>
            <Riquadro
              titolo="Ritenuta d'acconto trattenuta dalla compagnia (imposte già versate, non è un'uscita)"
              valore={p.ritenuta}
              sotto={
                p.ritenuta_fonte === "decade"
                  ? "Dal file della decade del mese dopo (codice 5601): la ritenuta di un mese la trattengono nelle decadi del mese successivo."
                  : p.ritenuta_fonte === "stima"
                    ? "Stima: base del Prospetto Ritenute per 20% per 23%."
                    : "Non ancora disponibile: arriva con le decadi del mese dopo."
              }
            />
          </div>
          {Object.keys(p.da_classificare).length > 0 && (
            <div className="text-sm rounded border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40">
              Codici nuovi che l'agente non sa ancora dove mettere (non sono nei
              conti):
              <Elenco voci={p.da_classificare} descr={descr} segno={1} />
            </div>
          )}
        </>
      )}
      {info?.anno.al && (
        <div className="text-sm border-t pt-2">
          <div className="font-medium">
            Da gennaio a {nomeMese(info.anno.al)}
          </div>
          <ul className="mt-1 space-y-0.5 tabular-nums">
            <li className="flex justify-between gap-3">
              <span>Incentivi e contributi</span>
              <span>{euro(info.anno.ricavi)}</span>
            </li>
            {info.anno.una_tantum > 0 && (
              <li className="flex justify-between gap-3 text-muted-foreground">
                <span>di cui una tantum</span>
                <span>{euro(info.anno.una_tantum)}</span>
              </li>
            )}
            <li className="flex justify-between gap-3">
              <span>Trattenute della compagnia</span>
              <span>{euro(-info.anno.trattenute)}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Ritenute d'acconto (imposte già versate)</span>
              <span>{euro(info.anno.ritenuta)}</span>
            </li>
          </ul>
        </div>
      )}
      {info && info.manuali.length > 0 && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          Scritti a mano, fuori da BusinessObjects:{" "}
          {info.manuali
            .map(
              (x) =>
                `${x.voce} fino a ${nomeMese(x.fino_a)} ${euro(x.importo)} (${x.fonte})`,
            )
            .join("; ")}
          .
        </div>
      )}
    </div>
  );
};

export const Pna = ({ mese }: { mese: string }) => {
  const q = useBlocchiPna();
  if (q.isPending || q.error || !q.data?.info) return null;
  return <PnaBlocco mese={mese} dati={q.data} />;
};
