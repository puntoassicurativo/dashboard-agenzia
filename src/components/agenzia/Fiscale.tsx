/**
 * "How much becomes profit" part of the Andamento page: revenue, costs, deductible costs, estimated taxable
 * profit and taxes, from January to the last complete month and projected to December, plus a small box for the
 * selected month and Fabio's target with the deductible costs still missing. Data: andamento_blocchi type "fiscale" (agent,
 * fiscale.py). Everything here is an estimate; the real figure comes from the accountant's tax return.
 */
import { useQuery } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { SimulaTasse } from "./SimulaTasse";

type Colonna = {
  provvigioni: number;
  pna: number;
  altre?: number;
  ricavi: number;
  costi: number;
  utile: number;
  deducibili: number;
  non_deducibili?: Record<string, number>;
  utile_fiscale: number;
  irap: number;
  quota_socio: number;
  inps_socio: number;
  irpef_socio: number;
  addizionali_socio: number;
  tasse_socio: number;
  tasse_due_soci: number;
  ritenute: number;
  resta_da_versare: number;
  prelievi_soci: number;
  imposte_soci_pagate?: number;
};
export type Fiscale = {
  anno: string;
  dal: string | null;
  al: string | null;
  mesi_usati: number;
  da_gennaio: Colonna;
  proiezione: Colonna | null;
  per_mese: Record<
    string,
    { provvigioni: number; utile: number; utile_fiscale: number }
  >;
  avviso: boolean;
  soglia: number;
  /** Fabio's target taxable profit (16/11/2026); older rows only have soglia. */
  obiettivo?: number;
  obiettivo_come?: string;
  costi_mancanti?: number | null;
  /** Fabio 18/11/2026: costs still to be recorded (Tombolato, cars), with what has already been paid. */
  costi_previsti?: {
    voci: {
      voce: string;
      importo: number;
      fonte: string;
      pagato: number;
      resta: number;
    }[];
    totale: number;
    nota: string;
  };
  utile_fiscale_con_previsti?: number | null;
  /** positive = above the target */
  sopra_obiettivo?: number | null;
  anno_dopo_nota?: string;
  mesi_senza_ritenuta?: string[];
  da_confermare: string[];
  ipotesi: string[];
  /** Banco Desio loans (18/11/2026): interest and charges of the year, next year from the plan. */
  mutui?: {
    da_gennaio: number;
    resto_anno: number;
    anno: number;
    interessi_anno: number;
    mesi_dal_piano: string[];
    anno_dopo: {
      anno: number;
      interessi: number;
      oneri: number;
      capitale: number;
    };
  } | null;
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
const euro = (v: number | null | undefined) =>
  v == null
    ? "n.d."
    : v.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
        useGrouping: "always",
      } as unknown as Intl.NumberFormatOptions);

export const useBloccoFiscale = () =>
  useQuery({
    queryKey: ["andamento", "fiscale"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori")
        .eq("tipo", "fiscale")
        .order("mese", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0]?.valori ?? null) as Fiscale | null;
    },
  });

const RIGHE: [keyof Colonna, string, boolean?][] = [
  ["provvigioni", "Provvigioni maturate (foglio Saldi)"],
  ["pna", "Incentivi e contributi della compagnia"],
  ["altre", "Altre entrate"],
  ["ricavi", "Ricavi", true],
  ["costi", "Costi totali"],
  ["utile", "Utile dell'agenzia", true],
  ["deducibili", "Costi che si possono dedurre"],
  ["utile_fiscale", "Utile fiscale stimato", true],
  ["irap", "IRAP della SNC, 3,9%"],
  ["quota_socio", "Quota di ogni socio (metà)"],
  ["inps_socio", "Contributi INPS commercianti per socio"],
  ["irpef_socio", "IRPEF per socio"],
  ["addizionali_socio", "Addizionali regionale e comunale per socio"],
  ["tasse_socio", "Tasse e contributi per socio", true],
  ["tasse_due_soci", "Tasse e contributi dei due soci", true],
  ["ritenute", "Ritenute già trattenute dalla compagnia"],
  [
    "resta_da_versare",
    "Resta da versare (IRAP più tasse dei soci meno ritenute)",
    true,
  ],
  ["prelievi_soci", "Prelievi dei soci nello stesso periodo"],
  [
    "imposte_soci_pagate",
    "Rate delle imposte dei soci pagate dal conto Banco Desio",
  ],
];

export const FiscaleBlocco = ({ f, mese }: { f: Fiscale; mese: string }) => {
  const dg = f.da_gennaio;
  const pr = f.proiezione;
  const m = f.per_mese[mese];
  const nonDed = Object.entries(dg.non_deducibili ?? {});
  return (
    <div className="flex flex-col gap-3">
      {m && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          Su <strong>{euro(m.provvigioni)}</strong> di provvigioni di{" "}
          {nomeMese(mese)}, <strong>{euro(m.utile)}</strong> sono utile
          dell'agenzia e <strong>{euro(m.utile_fiscale)}</strong> utile fiscale.
        </div>
      )}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-base font-semibold">
          Quanto diventa utile, e le tasse
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          È una stima. La cifra vera la dà Mauro con la dichiarazione.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-muted-foreground">
                <th />
                <th className="py-1 pl-2 text-right font-medium">
                  {f.al
                    ? `Da gennaio a ${nomeMese(f.al)} ${f.anno}`
                    : "Da gennaio"}
                </th>
                <th className="py-1 pl-2 text-right font-medium">
                  Proiezione a dicembre (stima)
                </th>
              </tr>
            </thead>
            <tbody>
              {RIGHE.map(([k, nome, forte]) => (
                <tr
                  key={k}
                  className={`border-t ${forte ? "font-semibold" : ""}`}
                >
                  <td className="py-1.5 pr-2">{nome}</td>
                  <td className="py-1.5 pl-2 text-right whitespace-nowrap">
                    {euro(dg[k] as number)}
                  </td>
                  <td className="py-1.5 pl-2 text-right whitespace-nowrap">
                    {pr && pr[k] != null ? euro(pr[k] as number) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {nonDed.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Costi che non si deducono:{" "}
            {nonDed.map(([k, v]) => `${k} ${euro(v)}`).join(", ")}.
          </p>
        )}
        {(f.mesi_senza_ritenuta ?? []).length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Ritenuta non ancora disponibile per{" "}
            {(f.mesi_senza_ritenuta ?? []).map(nomeMese).join(", ")}: arriva con
            le decadi del mese dopo.
          </p>
        )}
        {f.mutui && (
          <p className="mt-1 text-sm text-muted-foreground">
            Interessi e oneri dei mutui nel {f.anno}: {euro(f.mutui.anno)} (di
            cui interessi {euro(f.mutui.interessi_anno)}); nel{" "}
            {f.mutui.anno_dopo.anno} dal piano interessi{" "}
            {euro(f.mutui.anno_dopo.interessi)} e oneri{" "}
            {euro(f.mutui.anno_dopo.oneri)}.
          </p>
        )}
        {f.da_confermare.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Da confermare con lo studio: {f.da_confermare.join(", ")}.
          </p>
        )}
        <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
          {f.ipotesi.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <SimulaTasse
        defaultProfit={pr?.utile_fiscale ?? dg.utile_fiscale}
        defaultWithheld={pr?.ritenute ?? dg.ritenute}
      />
    </div>
  );
};

/**
 * Fabio's target (16/11/2026): 175,000 of profit. Neutral box with how many more deductible costs are needed to
 * get there with today's figures, or "target reached" when none are needed. Next to it, the projected real profit.
 */
export const AvvisoUtile = ({ f }: { f: Fiscale }) => {
  if (!f.proiezione) return null;
  const obiettivo = f.obiettivo ?? f.soglia;
  const mancanti = f.costi_mancanti ?? f.proiezione.utile_fiscale - obiettivo;
  const come = f.obiettivo_come ? ` (${f.obiettivo_come})` : "";
  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      {mancanti > 0 ? (
        <p>
          Obiettivo di Fabio {euro(obiettivo)} di utile. Con i conti di oggi
          l'utile fiscale previsto a fine {f.anno} è{" "}
          {euro(f.proiezione.utile_fiscale)}: per arrivarci servono circa{" "}
          {euro(mancanti)} di costi deducibili in più{come}. È una stima.
        </p>
      ) : (
        <p>
          Obiettivo raggiunto: l'utile fiscale previsto a fine {f.anno} è{" "}
          {euro(f.proiezione.utile_fiscale)}, l'obiettivo di Fabio è{" "}
          {euro(obiettivo)}. È una stima.
        </p>
      )}
      <p className="mt-1 text-muted-foreground">
        Utile vero previsto a fine {f.anno}: {euro(f.proiezione.utile)}.
      </p>
    </div>
  );
};

export const FiscaleSezione = ({ mese }: { mese: string }) => {
  const q = useBloccoFiscale();
  if (!q.data) return null;
  return <FiscaleBlocco f={q.data} mese={mese} />;
};
