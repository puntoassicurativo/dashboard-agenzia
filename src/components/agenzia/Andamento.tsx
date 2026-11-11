/**
 * Pagina "Andamento mese" della SNC: entrate, uscite per voce, utile, prelievi dei soci, stima delle tasse.
 * Legge le tabelle utile_mese e utile_info, scritte dall'agente agenti\cruscotto_agenzia (utile.py)
 * dall'estratto conto del conto operativo 257. Riservata: la RLS fa vedere i dati solo agli utenti
 * elencati in utile_accesso; il menu mostra la voce solo a loro.
 */
import { ResponsiveBar } from "@nivo/bar";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import {
  CosaManca,
  type InfoModello,
  type Ponte,
  PonteBanca,
  Spese222,
} from "./ContoAgenzia";
import { type Anno, DaGennaio, useBloccoAnno } from "./DaGennaio";
import { MeseVirtuoso } from "./MeseVirtuoso";

type Voci = Record<string, number>;
type Dettaglio = Record<string, { chi: string; importo: number }[]>;
type ValoriMese = {
  entrate: Voci;
  uscite: Voci;
  sotto: Voci;
  tot_entrate: number;
  tot_uscite: number;
  utile: number;
  resta: number;
  dettaglio: Dettaglio;
  parziale: boolean;
  dal: string;
  al: string;
  ponte?: Ponte;
};
type RigaMese = { mese: string; valori: ValoriMese };
type Info = {
  periodo: { dal: string; al: string; stima_dal: string };
  fonte: string;
  anno: Record<string, number>;
  ipotesi: string[];
  da_chiarire: string[];
  da_classificare: { data: string; importo: number; chi: string }[];
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
const breve = (m: string) =>
  `${MESI[parseInt(m.slice(5, 7), 10) - 1].slice(0, 3)} ${m.slice(2, 4)}`;
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
const num = (v: number) =>
  Math.round(v).toLocaleString("it-IT", {
    useGrouping: "always",
  } as unknown as Intl.NumberFormatOptions);
const dataIt = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("it-IT");

/** true se l'utente collegato puo' vedere l'andamento mese (riga sua in utile_accesso). */
export const useAccessoUtile = () =>
  useQuery({
    queryKey: ["utile", "accesso"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("utile_accesso")
        .select("user_id")
        .limit(1);
      if (error) return false;
      return (data?.length ?? 0) > 0;
    },
    staleTime: 10 * 60 * 1000,
  });

const useAndamento = () =>
  useQuery({
    queryKey: ["utile", "dati"],
    queryFn: async () => {
      const sb = getSupabaseClient();
      const [m, i, mo] = await Promise.all([
        sb.from("utile_mese").select("mese, valori").order("mese"),
        sb.from("utile_info").select("valori").eq("id", 1).limit(1),
        sb
          .from("andamento_blocchi")
          .select("mese, valori")
          .eq("tipo", "modello")
          .order("mese"),
      ]);
      if (m.error) throw m.error;
      if (i.error) throw i.error;
      // dall'11/11/2026 i mesi seguono il modello (provvigioni maturate, broker): se l'agente li ha scritti
      // si usano al posto della sola cassa del 257
      const modello = new Map(
        ((mo.data ?? []) as { mese: string; valori: unknown }[]).map((r) => [
          r.mese,
          r.valori,
        ]),
      );
      return {
        mesi: ((m.data ?? []) as RigaMese[]).map((r) =>
          modello.has(r.mese)
            ? { mese: r.mese, valori: modello.get(r.mese) as ValoriMese }
            : r,
        ),
        info: (i.data?.[0]?.valori ?? null) as Info | null,
        modello: (modello.get("info") ?? null) as InfoModello | null,
      };
    },
  });

const Riquadro = ({
  titolo,
  valore,
  nota,
  verde,
}: {
  titolo: string;
  valore: string;
  nota?: string;
  verde?: boolean;
}) => (
  <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 min-w-0">
    <div className="text-sm text-muted-foreground">{titolo}</div>
    <div
      className={`text-3xl font-semibold tabular-nums tracking-tight ${verde ? "text-green-700 dark:text-green-400" : ""}`}
    >
      {valore}
    </div>
    {nota && (
      <div className="text-sm text-muted-foreground tabular-nums">{nota}</div>
    )}
  </div>
);

const confronto = (prima: number | undefined, mesePrima: string | undefined) =>
  prima == null || !mesePrima
    ? undefined
    : `${MESI[parseInt(mesePrima.slice(5, 7), 10) - 1]} ${euro(prima)}`;

const GraficoUtile = ({ mesi }: { mesi: RigaMese[] }) => {
  // solo il mese nelle etichette: con l'anno sul telefono si accavallano (l'anno e' nella tabella)
  const dati = mesi.map((m) => ({
    mese: MESI[parseInt(m.mese.slice(5, 7), 10) - 1].slice(0, 3),
    Utile: Math.round(m.valori.utile),
  }));
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold mb-2">
        Utile dell'agenzia per mese
      </h2>
      <div className="h-[200px]">
        <ResponsiveBar
          data={dati}
          keys={["Utile"]}
          indexBy="mese"
          colors={({ data }) =>
            (data.Utile as number) >= 0 ? "#2e7d4f" : "#b23b3b"
          }
          margin={{ top: 8, right: 4, bottom: 24, left: 44 }}
          padding={0.35}
          borderRadius={2}
          enableLabel={false}
          enableGridY
          axisLeft={{
            tickSize: 0,
            tickPadding: 6,
            tickValues: 4,
            format: (v: number) => `${Math.round(v / 1000)}k`,
          }}
          axisBottom={{ tickSize: 0, tickPadding: 6 }}
          theme={{
            text: { fill: "var(--muted-foreground)", fontSize: 11 },
            grid: { line: { stroke: "var(--border)", strokeWidth: 1 } },
          }}
          tooltip={({ value, indexValue }) => (
            <div className="rounded border bg-popover px-2 py-1 text-sm text-popover-foreground shadow">
              {indexValue}: <strong>{euro(value as number)}</strong>
            </div>
          )}
          role="img"
          ariaLabel="Utile dell'agenzia per mese"
        />
      </div>
    </div>
  );
};

const GRUPPO_PERSONALE = [
  "Personale dipendente",
  "Subagenti e collaboratori (bonifici netti)",
  "F24: ritenute e contributi di dipendenti e subagenti, IRAP",
];
/** Voci di uscita con le tre del personale per prime, vicine, sotto un titolo comune. */
const ordinaUscite = (chiavi: string[]) => [
  ...GRUPPO_PERSONALE.filter((k) => chiavi.includes(k)),
  ...chiavi.filter((k) => !GRUPPO_PERSONALE.includes(k)),
];

const TabellaMesi = ({
  mesi,
  anno,
}: {
  mesi: RigaMese[];
  anno?: Anno | null;
}) => {
  const ga = anno?.voci;
  const colGa = (v: number | undefined | null) =>
    anno ? (
      <td className="px-1 py-1 text-right font-semibold">{v ? num(v) : "0"}</td>
    ) : null;
  const righe = (gruppo: "entrate" | "uscite" | "sotto") => {
    const tot: Record<string, number> = {};
    mesi.forEach((m) =>
      Object.entries(m.valori[gruppo]).forEach(
        ([k, v]) => (tot[k] = (tot[k] ?? 0) + v),
      ),
    );
    return Object.keys(tot).sort((a, b) =>
      gruppo === "entrate" ? tot[b] - tot[a] : tot[a] - tot[b],
    );
  };
  const cella = (v: number | undefined) => (
    <td className={`px-1 py-1 text-right ${!v ? "text-muted-foreground" : ""}`}>
      {v ? num(v) : "0"}
    </td>
  );
  const somma = (f: (m: RigaMese) => number) =>
    mesi.reduce((s, m) => s + f(m), 0);
  const Riga = ({
    nome,
    f,
    forte,
    daGennaio,
  }: {
    nome: string;
    f: (m: RigaMese) => number;
    forte?: string;
    daGennaio?: number;
  }) => (
    <tr className={`border-t ${forte ?? ""}`}>
      <th className="px-1 py-1 text-left font-normal sticky left-0 bg-card min-w-[150px] md:min-w-[160px]">
        {nome}
      </th>
      {mesi.map((m) => (
        <td key={m.mese} className="px-1 py-1 text-right">
          {num(f(m))}
        </td>
      ))}
      <td className="px-1 py-1 text-right font-semibold">{num(somma(f))}</td>
      {colGa(daGennaio)}
    </tr>
  );
  const Sezione = ({ t }: { t: string }) => (
    <tr>
      <th
        colSpan={mesi.length + (anno ? 3 : 2)}
        className="px-2 pt-3 pb-1 text-left text-primary font-semibold sticky left-0 bg-card"
      >
        {t}
      </th>
    </tr>
  );
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-xs 2xl:text-sm tabular-nums whitespace-nowrap">
        <thead>
          <tr className="text-muted-foreground">
            <th className="sticky left-0 bg-card" />
            {mesi.map((m) => (
              <th key={m.mese} className="px-1 py-2 text-right font-medium">
                {breve(m.mese)}
              </th>
            ))}
            <th className="px-1 py-2 text-right font-medium">Ultimi 12 mesi</th>
            {anno && (
              <th className="px-1 py-2 text-right font-medium">
                Da gennaio {anno.anno}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          <Sezione t="Entrate" />
          {righe("entrate").map((k) => (
            <tr key={k} className="border-t">
              <th className="px-1 py-1 text-left font-normal sticky left-0 bg-card whitespace-normal min-w-[150px] md:min-w-[160px]">
                {k}
              </th>
              {mesi.map((m) => (
                <Cella key={m.mese} v={m.valori.entrate[k]} cella={cella} />
              ))}
              <td className="px-1 py-1 text-right font-semibold">
                {num(somma((m) => m.valori.entrate[k] ?? 0))}
              </td>
              {colGa(ga?.entrate[k])}
            </tr>
          ))}
          <Riga
            nome="Totale entrate"
            f={(m) => m.valori.tot_entrate}
            forte="font-semibold"
            daGennaio={(anno?.modello ?? anno?.cassa_257)?.entrate}
          />
          <Sezione t="Uscite dell'agenzia" />
          {GRUPPO_PERSONALE.some((k) => righe("uscite").includes(k)) && (
            <tr>
              <th
                colSpan={mesi.length + (anno ? 3 : 2)}
                className="px-1 pt-2 text-left font-medium italic sticky left-0 bg-card"
              >
                Personale e collaboratori
              </th>
            </tr>
          )}
          {ordinaUscite(righe("uscite")).map((k, i, tutte) => (
            <Fragment key={k}>
              <tr className="border-t">
                <th className="px-1 py-1 text-left font-normal sticky left-0 bg-card whitespace-normal min-w-[150px] md:min-w-[160px]">
                  {k}
                </th>
                {mesi.map((m) => (
                  <Cella key={m.mese} v={m.valori.uscite[k]} cella={cella} />
                ))}
                <td className="px-1 py-1 text-right font-semibold">
                  {num(somma((m) => m.valori.uscite[k] ?? 0))}
                </td>
                {colGa(ga?.uscite[k])}
              </tr>
              {GRUPPO_PERSONALE.includes(k) &&
                !GRUPPO_PERSONALE.includes(tutte[i + 1]) && (
                  <Riga
                    nome="Totale personale e collaboratori"
                    f={(m) =>
                      GRUPPO_PERSONALE.reduce(
                        (s, g) => s + (m.valori.uscite[g] ?? 0),
                        0,
                      )
                    }
                    forte="font-semibold italic"
                    daGennaio={
                      anno
                        ? GRUPPO_PERSONALE.reduce(
                            (s, g) => s + (anno.voci.uscite[g] ?? 0),
                            0,
                          )
                        : undefined
                    }
                  />
                )}
            </Fragment>
          ))}
          <Riga
            nome="Totale uscite"
            f={(m) => m.valori.tot_uscite}
            forte="font-semibold"
            daGennaio={
              anno ? -(anno.modello ?? anno.cassa_257).uscite : undefined
            }
          />
          <Riga
            nome="Utile dell'agenzia"
            f={(m) => m.valori.utile}
            forte="font-semibold bg-muted"
            daGennaio={(anno?.modello ?? anno?.cassa_257)?.utile}
          />
          <Sezione t="Sotto l'utile" />
          {righe("sotto").map((k) => (
            <tr key={k} className="border-t">
              <th className="px-1 py-1 text-left font-normal sticky left-0 bg-card whitespace-normal min-w-[150px] md:min-w-[160px]">
                {k}
              </th>
              {mesi.map((m) => (
                <Cella key={m.mese} v={m.valori.sotto[k]} cella={cella} />
              ))}
              <td className="px-1 py-1 text-right font-semibold">
                {num(somma((m) => m.valori.sotto[k] ?? 0))}
              </td>
              {colGa(ga?.sotto[k])}
            </tr>
          ))}
          <Riga
            nome="Resta dopo prelievi e rate"
            f={(m) => m.valori.resta}
            forte="font-semibold"
            daGennaio={
              ga
                ? [ga.entrate, ga.uscite, ga.sotto]
                    .flatMap((x) => Object.values(x))
                    .reduce((s, x) => s + x, 0)
                : undefined
            }
          />
        </tbody>
      </table>
    </div>
  );
};
const Cella = ({
  v,
  cella,
}: {
  v: number | undefined;
  cella: (v: number | undefined) => React.ReactNode;
}) => <>{cella(v)}</>;

const Voce = ({
  k,
  righe,
  tot,
}: {
  k: string;
  righe: { chi: string; importo: number }[];
  tot: number;
}) => (
  <details
    className={`border-t py-2 ${GRUPPO_PERSONALE.includes(k) ? "pl-3" : ""}`}
  >
    <summary className="flex justify-between gap-3 cursor-pointer">
      <span>{k}</span>
      <span className="font-semibold tabular-nums">{euro(tot)}</span>
    </summary>
    <ul className="mt-1 pl-4 text-sm text-muted-foreground">
      {righe.map((r) => (
        <li key={r.chi} className="flex justify-between gap-3 tabular-nums">
          <span className="truncate">{r.chi}</span>
          <span>{euro(r.importo, 2)}</span>
        </li>
      ))}
    </ul>
  </details>
);

const VociMese = ({ m }: { m: RigaMese }) => {
  const voci = Object.entries(m.valori.dettaglio)
    .filter(([k]) => !(k in m.valori.entrate))
    .map(([k, righe]) => ({
      k,
      righe,
      tot: righe.reduce((s, r) => s + r.importo, 0),
    }))
    .sort((a, b) => a.tot - b.tot)
    .sort(
      (a, b) =>
        Number(!GRUPPO_PERSONALE.includes(a.k)) -
        Number(!GRUPPO_PERSONALE.includes(b.k)),
    );
  const totPersonale = voci
    .filter((v) => GRUPPO_PERSONALE.includes(v.k))
    .reduce((s, v) => s + v.tot, 0);
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold mb-2">
        Uscite di {nomeMese(m.mese)} voce per voce
      </h2>
      {totPersonale !== 0 && (
        <div className="flex justify-between gap-3 border-t pt-2 font-medium">
          <span>Personale e collaboratori</span>
          <span className="tabular-nums">{euro(totPersonale)}</span>
        </div>
      )}
      {voci
        .filter((v) => !(v.k in m.valori.sotto))
        .map((v) => (
          <Voce key={v.k} {...v} />
        ))}
      {voci.some((v) => v.k in m.valori.sotto) && (
        <>
          <h3 className="mt-4 text-sm font-semibold">
            Sotto l'utile{" "}
            <span className="font-normal text-muted-foreground">
              (non sono uscite dell'agenzia)
            </span>
          </h3>
          {voci
            .filter((v) => v.k in m.valori.sotto)
            .map((v) => (
              <Voce key={v.k} {...v} />
            ))}
        </>
      )}
    </div>
  );
};

const Tasse = ({ info }: { info: Info }) => {
  const a = info.anno;
  const righe: [string, number, boolean?][] = [
    ["Entrate (cassa del 257)", a.entrate],
    ["Uscite dal conto gestionale 257", a.uscite],
    ["Utile di cassa del 257", a.utile, true],
    ["Uscite che si possono dedurre", a.deducibili],
    ["Reddito imponibile stimato della SNC", a.imponibile, true],
    ["IRAP della SNC, 3,9%", a.irap],
    ["Quota di ogni socio (metà)", a.quota_socio],
    ["Contributi INPS commercianti per socio", a.inps_socio],
    ["IRPEF per socio", a.irpef_socio],
    ["Addizionali regionale e comunale per socio", a.addizionali_socio],
    ["Tasse e contributi per socio", a.tasse_socio, true],
    ["Tasse e contributi per tutti e due i soci", a.tasse_due_soci, true],
    ["Prelievi dei soci negli stessi 12 mesi", a.prelievi_soci],
  ];
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-base font-semibold">
        Tasse, stima sugli ultimi 12 mesi
      </h2>
      <p className="text-sm text-muted-foreground mb-2">
        Dal {dataIt(info.periodo.stima_dal)} al {dataIt(info.periodo.al)}. È una
        stima, la cifra vera la dà Mauro.
      </p>
      <table className="w-full text-sm tabular-nums">
        <tbody>
          {righe.map(([n, v, b]) => (
            <tr key={n} className={`border-t ${b ? "font-semibold" : ""}`}>
              <td className="py-1.5 pr-2">{n}</td>
              <td className="py-1.5 text-right whitespace-nowrap">{euro(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
        {info.ipotesi.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
};

export const AndamentoPage = () => {
  const accesso = useAccessoUtile();
  const anno = useBloccoAnno();
  const { data, isPending, error } = useAndamento();
  const completi = (data?.mesi ?? []).filter((m) => !m.valori.parziale);
  const [scelto, setScelto] = useState<string | null>(null);

  if (accesso.data === false)
    return (
      <div className="p-4 text-muted-foreground">
        Questa pagina è riservata ai soci.
      </div>
    );
  if (isPending || accesso.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (error)
    return (
      <div className="p-4 text-red-700">
        Errore nel caricare i dati: {String(error.message ?? error)}
      </div>
    );
  if (!data || completi.length === 0)
    return (
      <div className="p-4 text-muted-foreground">
        Nessun dato: manca l'estratto conto in input\banca.
      </div>
    );

  const idx = scelto
    ? completi.findIndex((m) => m.mese === scelto)
    : completi.length - 1;
  const m = completi[idx];
  const prec = idx > 0 ? completi[idx - 1] : undefined;
  const ultimi = completi.slice(-12);
  const prelievi = Object.entries(m.valori.sotto)
    .filter(([k]) => k.toLowerCase().includes("soci"))
    .reduce((s, [, v]) => s + v, 0);
  const prelieviPrec = prec
    ? Object.entries(prec.valori.sotto)
        .filter(([k]) => k.toLowerCase().includes("soci"))
        .reduce((s, [, v]) => s + v, 0)
    : undefined;
  const info = data.info;

  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full px-4 pt-2 pb-28 md:px-0 md:pt-0 md:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Andamento mese della SNC</h1>
        <label className="text-sm flex items-center gap-2">
          Mese
          <select
            className="rounded border bg-background px-2 py-1"
            value={m.mese}
            onChange={(e) => setScelto(e.target.value)}
          >
            {[...completi].reverse().map((x) => (
              <option key={x.mese} value={x.mese}>
                {nomeMese(x.mese)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <MeseVirtuoso mese={m.mese} />
      <DaGennaio />

      <h2 className="text-lg font-semibold mt-4">
        Entrate, uscite e utile dell'agenzia
      </h2>
      <p className="text-sm text-muted-foreground -mt-2">
        Entrate: provvigioni maturate del foglio Saldi e altre entrate del conto
        gestionale 257. Uscite: quelle del conto gestionale 257 di Banca di Asti
        {info ? ` (estratto aggiornato al ${dataIt(info.periodo.al)})` : ""} e
        le provvigioni lasciate ai broker. Utile = entrate meno tutte le uscite,
        IVA compresa.
      </p>
      <p className="text-sm font-medium -mt-2">
        I prelievi di Fabio e Claudio NON sono dentro le uscite: sono la
        distribuzione dell'utile e stanno sotto.
      </p>
      {data.modello && (
        <p className="text-sm rounded border border-amber-300 bg-amber-50 px-3 py-2 -mt-1 dark:border-amber-800 dark:bg-amber-950/40">
          {data.modello.nota}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Riquadro
          titolo={`Entrate di ${nomeMese(m.mese)}`}
          valore={euro(m.valori.tot_entrate)}
          nota={confronto(prec?.valori.tot_entrate, prec?.mese)}
        />
        <Riquadro
          titolo="Uscite dell'agenzia"
          valore={euro(-m.valori.tot_uscite)}
          nota={confronto(
            prec ? -prec.valori.tot_uscite : undefined,
            prec?.mese,
          )}
        />
        <Riquadro
          titolo="Utile dell'agenzia"
          valore={euro(m.valori.utile)}
          verde={m.valori.utile >= 0}
          nota={confronto(prec?.valori.utile, prec?.mese)}
        />
        <Riquadro
          titolo="Prelievi di Fabio e Claudio (sotto l'utile)"
          valore={euro(-prelievi)}
          nota={confronto(
            prelieviPrec != null ? -prelieviPrec : undefined,
            prec?.mese,
          )}
        />
      </div>

      {m.valori.ponte && (
        <PonteBanca p={m.valori.ponte} mese={nomeMese(m.mese)} />
      )}
      <GraficoUtile mesi={ultimi} />
      <VociMese m={m} />
      <h2 className="text-base font-semibold -mb-2">Mese per mese</h2>
      <TabellaMesi mesi={ultimi} anno={anno.data?.a} />
      {data.modello && <CosaManca voci={data.modello.cosa_manca} />}
      {data.modello && data.modello.spese_222.length > 0 && (
        <Spese222 spese={data.modello.spese_222} />
      )}
      {info && <Tasse info={info} />}

      {info && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          <h2 className="text-base font-semibold mb-2">
            Cosa resta da chiarire
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            {info.da_chiarire.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {info.da_classificare.length > 0 && (
            <>
              <div className="mt-3 font-medium">
                Uscite che l'agente non sa ancora dove mettere
              </div>
              <ul className="mt-1 text-muted-foreground">
                {info.da_classificare.map((r, i) => (
                  <li
                    key={i}
                    className="flex justify-between gap-3 tabular-nums border-t py-1"
                  >
                    <span>
                      {r.data} {r.chi}
                    </span>
                    <span>{euro(r.importo, 2)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AndamentoPage;
