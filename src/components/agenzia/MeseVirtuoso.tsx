/**
 * "Was the month virtuous?" block of the Andamento page: commissions accrued in the month (Saldi sheet,
 * column C) against what left the premium account (transfers to Asti and Desio, commissions left to brokers).
 * Reads andamento_blocchi type "saldi", written every morning by the local agent (saldi_mese.py).
 * Restricted like the rest of the page: RLS only lets users listed in utile_accesso read it.
 */
import { ResponsiveBar } from "@nivo/bar";
import { useQuery } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";

type Movimento = {
  riga: number;
  data: string;
  importo: number;
  descrizione?: string;
};
type ControlloBo = {
  data: string;
  righe: number[];
  saldi_c: number;
  saldi_h_i: number;
  bo: number;
  diff_c: number;
  tipo: "refuso_c" | "dettaglio" | "giorno_diverso" | "bo_diverso" | "nessuno";
};
type Bonifico = { data: string; importo: number; da?: string; a?: string };
type BancaMese = {
  saldi_asti?: number;
  banca_222_257?: number;
  ritorni_257_222?: number;
  saldi_desio?: number;
  banca_222_desio?: number;
  banca_desio_interni?: number;
  diff_asti?: number;
  diff_desio?: number;
  parziale: boolean;
  solo_saldi: (Bonifico & { riga: number; conto: string })[];
  solo_banca: Bonifico[];
  scritto_su_altro_conto: {
    riga: number;
    data: string;
    importo: number;
    scritto: string;
  }[];
  dal_222_ai_soci: Bonifico[];
};
// The three "official source wins" boxes (addendum of 13/11/2026): commissions from BO, transfers from the bank
// statements, non-insurance items from the Vittoria remittance on the Banco Desio 211900 account.
type MvProvvigioni = {
  valore: number;
  fonte: "bo" | "saldi";
  saldi: number;
  diff: number | null;
};
type MvGirato = {
  valore: number;
  fonte: "banca" | "saldi";
  saldi: number;
  saldi_asti: number;
  saldi_desio: number;
  asti: number;
  asti_lordo?: number;
  ritorni?: number;
  desio: number;
  diff: number | null;
  motivo?: string;
};
type MvPna = {
  valore: number | null;
  rimesse: { data: string; importo: number }[];
  riferita_a: string;
  decade?: number;
  diff_decade?: number;
  motivo?: string;
};
export type SaldiMese = {
  provvigioni: number;
  bo_provvigioni: number | null;
  diff_bo: number | null;
  girato_asti: number;
  girato_desio: number;
  broker: number;
  broker_dettaglio: Record<string, number>;
  una_tantum: number;
  altre_uscite: number;
  tot_uscite: number;
  avanzo: number;
  avanzo_da_gennaio: number;
  saldo_conto_premi: number | null;
  altre_entrate: Movimento[];
  uscite_altro: (Movimento & { sottotipo: string })[];
  parziale: boolean;
  al: string | null;
  controlli_bo: ControlloBo[];
  avanzo_solo_saldi?: number;
  avanzo_provvisorio?: boolean;
  mv_provv?: MvProvvigioni;
  mv_girato?: MvGirato;
  mv_pna?: MvPna;
  banca?: BancaMese;
};

const SOGLIA_DIFF = 0.05;
const haDifferenza = (d: number | null | undefined) =>
  d != null && Math.abs(d) >= SOGLIA_DIFF;

/** Fallback for rows written before the addendum: Saldi values only. */
const provvigioniDi = (v: SaldiMese): MvProvvigioni =>
  v.mv_provv ?? {
    valore: v.provvigioni,
    fonte: "saldi",
    saldi: v.provvigioni,
    diff: null,
  };
const giratoDi = (v: SaldiMese): MvGirato =>
  v.mv_girato ?? {
    valore: v.girato_asti + v.girato_desio,
    fonte: "saldi",
    saldi: v.girato_asti + v.girato_desio,
    saldi_asti: v.girato_asti,
    saldi_desio: v.girato_desio,
    asti: v.girato_asti,
    desio: v.girato_desio,
    diff: null,
  };
type InfoSaldi = {
  ultimo_giorno: string;
  bo_aggiornato: string | null;
  banca_dal: string | null;
  banca_al: string | null;
  desio_letto: boolean;
  desio_al?: string | null;
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
const intero = (v: number) =>
  Math.round(Math.abs(v)).toLocaleString("it-IT", {
    useGrouping: "always",
  } as unknown as Intl.NumberFormatOptions);
const dataIt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT")
    : "n.d.";

const NOMI_BROKER: Record<string, string> = {
  "ab broker": "AB broker",
  abi: "ABI",
  rmp: "RMP",
  emmeb: "Emmeb",
  "assicura point": "Assicura Point",
};
const nomeBroker = (n: string) =>
  NOMI_BROKER[n] ?? n.charAt(0).toUpperCase() + n.slice(1);

const SPIEGA: Record<ControlloBo["tipo"], string> = {
  refuso_c: "probabile refuso nella colonna delle provvigioni",
  dettaglio: "errore nel dettaglio dirette/intermediate, il totale è giusto",
  giorno_diverso: "stesso importo messo in un giorno diverso, si compensa",
  bo_diverso: "il foglio torna con sé stesso, BO dà un'altra cifra",
  nessuno: "non torna né il totale né il dettaglio",
};

export const useBlocchiSaldi = () =>
  useQuery({
    queryKey: ["andamento", "saldi"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese, valori, aggiornato_il")
        .eq("tipo", "saldi")
        .order("mese");
      if (error) throw error;
      const righe = (data ?? []) as {
        mese: string;
        valori: unknown;
        aggiornato_il: string;
      }[];
      const info = righe.find((r) => r.mese === "info");
      return {
        mesi: righe
          .filter((r) => /^\d{4}-\d{2}$/.test(r.mese))
          .map((r) => ({ mese: r.mese, v: r.valori as SaldiMese })),
        info: (info?.valori ?? null) as InfoSaldi | null,
        aggiornato: info?.aggiornato_il ?? null,
      };
    },
  });

const ComeCalcolato = ({ testo }: { testo: string }) => (
  <details className="mt-1 text-xs text-muted-foreground">
    <summary className="cursor-pointer select-none">come è calcolato</summary>
    <p className="mt-1">{testo}</p>
  </details>
);

const Riquadro = ({
  titolo,
  valore,
  nota,
  colore,
  come,
}: {
  titolo: string;
  valore: string;
  nota?: React.ReactNode;
  colore?: "verde" | "rosso";
  come: string;
}) => (
  <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 min-w-0">
    <div className="text-sm text-muted-foreground">{titolo}</div>
    <div
      className={`text-3xl font-semibold tabular-nums tracking-tight ${
        colore === "verde"
          ? "text-green-700 dark:text-green-400"
          : colore === "rosso"
            ? "text-red-700 dark:text-red-400"
            : ""
      }`}
    >
      {valore}
    </div>
    {nota && (
      <div className="text-sm text-muted-foreground tabular-nums">{nota}</div>
    )}
    <ComeCalcolato testo={come} />
  </div>
);

const GraficoAvanzo = ({
  mesi,
}: {
  mesi: { mese: string; v: SaldiMese }[];
}) => {
  const dati = mesi.map((m) => ({
    mese: nomeMese(m.mese).slice(0, 3),
    Avanzo: Math.round(m.v.avanzo),
  }));
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-base font-semibold mb-2">Avanzo per mese</h3>
      <div className="h-[180px]">
        <ResponsiveBar
          data={dati}
          keys={["Avanzo"]}
          indexBy="mese"
          colors={({ data }) =>
            (data.Avanzo as number) >= 0 ? "#2e7d4f" : "#b23b3b"
          }
          margin={{ top: 8, right: 4, bottom: 24, left: 44 }}
          padding={0.35}
          borderRadius={2}
          enableLabel={false}
          enableGridY
          valueScale={{ type: "linear", min: "auto", max: "auto", nice: true }}
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
          ariaLabel="Avanzo per mese"
        />
      </div>
    </div>
  );
};

const Controlli = ({ v }: { v: SaldiMese }) => {
  const b = v.banca;
  const giroconti: { data: string; importo: number; testo: string }[] = [];
  if (b) {
    b.scritto_su_altro_conto.forEach((x) =>
      giroconti.push({
        data: x.data,
        importo: x.importo,
        testo: `nel foglio è "giroconto ${x.scritto}", in banca è andato ${x.scritto === "asti" ? "a Desio" : "ad Asti"}`,
      }),
    );
    b.dal_222_ai_soci.forEach((x) =>
      giroconti.push({
        data: x.data,
        importo: x.importo,
        testo: "in banca dal conto premi al conto dei soci, nel foglio non c'è",
      }),
    );
    b.solo_banca.forEach((x) =>
      giroconti.push({
        data: x.data,
        importo: x.importo,
        testo: `in banca c'è un giroconto (${x.da} verso ${x.a}), nel foglio non lo trovo`,
      }),
    );
    b.solo_saldi.forEach((x) =>
      giroconti.push({
        data: x.data,
        importo: x.importo,
        testo: `nel foglio c'è un giroconto verso ${x.conto === "asti" ? "Asti" : "Desio"}, in banca non lo trovo`,
      }),
    );
  }
  const quanti = v.controlli_bo.length + giroconti.length;
  return (
    <details className="rounded-lg border bg-card p-4 text-sm">
      <summary className="cursor-pointer select-none font-semibold text-base">
        Controlli sul foglio Saldi{" "}
        <span className="font-normal text-muted-foreground">
          ({quanti === 0 ? "tutto a posto" : `${quanti} da guardare`})
        </span>
      </summary>
      <p className="mt-2 text-muted-foreground">
        Ogni giorno le provvigioni del foglio si confrontano con quelle di BO
        dello stesso giorno, e i giroconti con gli estratti conto. Il foglio non
        viene mai modificato: le correzioni si fanno a mano.
      </p>
      {v.controlli_bo.length > 0 && (
        <div className="mt-3">
          <div className="font-medium">Provvigioni del foglio contro BO</div>
          <ul className="mt-1 tabular-nums">
            {v.controlli_bo.map((c) => (
              <li key={c.data} className="border-t py-1.5">
                <div className="flex flex-wrap gap-x-3">
                  <span className="font-medium">{dataIt(c.data)}</span>
                  <span>foglio {euro(c.saldi_c, 2)}</span>
                  <span>BO {euro(c.bo, 2)}</span>
                  <span>differenza {euro(c.diff_c, 2)}</span>
                </div>
                <div className="text-muted-foreground">
                  {SPIEGA[c.tipo]}
                  {c.tipo === "dettaglio" &&
                    ` (dettaglio ${euro(c.saldi_h_i, 2)})`}
                  , riga {c.righe.join(", ")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {b ? (
        <div className="mt-3">
          <div className="font-medium">Giroconti contro gli estratti conto</div>
          <ul className="mt-1 space-y-0.5 tabular-nums">
            <li>
              Verso Asti: foglio {euro(b.saldi_asti ?? 0, 2)}, banca{" "}
              {euro(b.banca_222_257 ?? 0, 2)}
            </li>
            <li>
              Verso Desio: foglio {euro(b.saldi_desio ?? 0, 2)}, banca{" "}
              {euro((b.banca_222_desio ?? 0) + (b.banca_desio_interni ?? 0), 2)}
            </li>
            {(b.ritorni_257_222 ?? 0) > 0 && (
              <li className="text-muted-foreground">
                Tornati dal conto gestionale 257 al conto premi:{" "}
                {euro(b.ritorni_257_222, 2)} (non sono nel foglio)
              </li>
            )}
            {b.parziale && (
              <li className="text-muted-foreground">
                Mese non intero negli estratti: il confronto vale solo per i
                giorni letti.
              </li>
            )}
          </ul>
          {giroconti.length > 0 && (
            <ul className="mt-2 tabular-nums">
              {giroconti.map((g, i) => (
                <li
                  key={i}
                  className="flex flex-wrap justify-between gap-x-3 border-t py-1"
                >
                  <span>
                    {dataIt(g.data)} {g.testo}
                  </span>
                  <span>{euro(g.importo, 2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-3 text-muted-foreground">
          Per questo mese non c'è l'estratto conto: i giroconti non si possono
          controllare.
        </p>
      )}
    </details>
  );
};

export const MeseVirtuoso = ({ mese }: { mese: string }) => {
  const { data, isPending, error } = useBlocchiSaldi();
  if (isPending)
    return (
      <div className="text-sm text-muted-foreground">
        Carico il foglio Saldi...
      </div>
    );
  if (error)
    return (
      <div className="text-sm text-red-700">
        Errore nel caricare il foglio Saldi: {String(error.message ?? error)}
      </div>
    );
  const riga = data?.mesi.find((m) => m.mese === mese);
  if (!riga)
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Per {nomeMese(mese)} non ci sono ancora i dati del foglio Saldi.
      </div>
    );
  const v = riga.v;
  const info = data.info;
  const agg = `Aggiornato il ${dataIt(data.aggiornato)}, foglio Saldi letto fino al ${dataIt(info?.ultimo_giorno)}`;
  const provv = provvigioniDi(v);
  const girato = giratoDi(v);
  const pna = v.mv_pna;
  const pnaValore = pna?.valore ?? 0;
  const usciti = girato.valore + v.broker + v.una_tantum + v.altre_uscite;
  const virtuoso = v.avanzo > 0;
  const nm = nomeMese(mese);
  const altreUscite = v.uscite_altro;
  const frase =
    `A ${nm} le provvigioni sono state ${intero(provv.valore)} euro` +
    (pna?.valore != null
      ? ` e le partite non assicurative ${pnaValore < 0 ? "meno " : ""}${intero(pnaValore)}`
      : "") +
    `; dal conto premi ne sono usciti ${intero(usciti)}` +
    (v.una_tantum > 0
      ? `, di cui ${intero(v.una_tantum)} di uscita una tantum. `
      : ". ") +
    (v.avanzo >= 0
      ? `Il mese chiude con ${intero(v.avanzo)} euro di avanzo.`
      : `Il mese chiude con ${intero(v.avanzo)} euro in meno: è uscito più di quanto è entrato.`) +
    (v.avanzo_provvisorio
      ? " Provvisorio: mancano le partite non assicurative."
      : "");
  const notaProvv =
    provv.fonte === "saldi"
      ? "dal foglio Saldi, BO non ancora disponibile"
      : haDifferenza(provv.diff)
        ? `Foglio Saldi: ${euro(provv.saldi, 2)}, differenza ${euro(provv.diff, 2)}`
        : "uguale al foglio Saldi";
  const notaGirato =
    girato.fonte === "saldi"
      ? `Asti ${euro(girato.asti, 2)}, Desio ${euro(girato.desio, 2)}. Dal foglio Saldi: ${girato.motivo ?? "estratto conto non ancora caricato"}`
      : `Asti ${euro(girato.asti, 2)}, Desio ${euro(girato.desio, 2)}` +
        ((girato.ritorni ?? 0) > 0
          ? ` (Asti ${euro(girato.asti_lordo, 2)} meno ${euro(girato.ritorni, 2)} tornati al conto premi)`
          : "") +
        (haDifferenza(girato.diff)
          ? `. Foglio Saldi: ${euro(girato.saldi, 2)}, differenza ${euro(girato.diff, 2)}`
          : ". Uguale al foglio Saldi") +
        (haDifferenza(girato.saldi_asti - (girato.asti_lordo ?? 0)) &&
        !haDifferenza(girato.diff)
          ? ` nel totale, ma divisa diversamente fra Asti e Desio (foglio: Asti ${euro(girato.saldi_asti, 2)}, Desio ${euro(girato.saldi_desio, 2)})`
          : "");
  const notaPna = !pna
    ? "estratto Banco Desio non letto"
    : pna.valore == null
      ? `non ancora disponibile: ${pna.motivo ?? "manca l'estratto Banco Desio"}`
      : (pna.rimesse.length > 0
          ? pna.rimesse.map((r) => `rimessa del ${dataIt(r.data)}`).join(", ") +
            `, riferita a ${nomeMese(pna.riferita_a)}`
          : "nessuna rimessa questo mese") +
        (pna.decade != null
          ? haDifferenza(pna.diff_decade)
            ? `. Decade: ${euro(pna.decade, 2)}, differenza ${euro(pna.diff_decade, 2)}`
            : ". Uguale al saldo della decade"
          : "");
  const anno = mese.slice(0, 4);
  const ultimi = data.mesi
    .filter((m) => !m.v.parziale && m.mese <= mese)
    .slice(-12);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold">Il mese è stato virtuoso?</h2>
        <span
          className={`rounded px-2 py-0.5 text-sm font-medium ${
            virtuoso
              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {virtuoso ? "Sì" : "No"}
        </span>
      </div>
      <p className="text-sm -mt-1">{frase}</p>
      {v.parziale && (
        <p className="text-sm text-muted-foreground -mt-1">
          Mese in corso: foglio letto fino al {dataIt(v.al)}.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Riquadro
          titolo="Provvigioni del mese"
          valore={euro(provv.valore, 2)}
          nota={notaProvv}
          come={`Provvigioni di acquisto e incasso, danni e vita, prese da BO per giorno di giornale: sono il dato ufficiale. Se il foglio Saldi (colonna C) dà un'altra cifra, la differenza si vede qui e i giorni che non tornano sono nei controlli in fondo. Quando BO non ha ancora il mese, vale il foglio Saldi. ${agg}, BO del ${dataIt(info?.bo_aggiornato)}.`}
        />
        <Riquadro
          titolo="Partite non assicurative"
          valore={pna?.valore != null ? euro(pna.valore, 2) : "n.d."}
          nota={notaPna}
          come={`Bonifico della Direzione sul conto gestionale Banco Desio 211900 (la rimessa della terza decade), di solito fra il 7 e il 12 del mese. Si conta nel mese in cui arriva e si riferisce alle partite non assicurative del mese prima. Se il file della decade c'è, la rimessa si confronta col suo saldo. Estratto Banco Desio fino al ${dataIt(info?.desio_al)}.`}
        />
        <Riquadro
          titolo="Girato ai conti dell'agenzia"
          valore={euro(girato.valore, 2)}
          nota={notaGirato}
          come={`Quello che è davvero arrivato sui conti dell'agenzia secondo gli estratti conto: Asti 257 dal conto premi 222, meno quello che il 257 ha rimandato al 222, più Banco Desio 211900 dal 222 e dal dedicato 212000. Se il foglio Saldi (colonna E) dà un'altra cifra, la differenza si vede qui. Quando l'estratto non copre il mese, vale il foglio Saldi. ${agg}.`}
        />
        <Riquadro
          titolo="Provvigioni ai broker"
          valore={euro(v.broker, 2)}
          nota={
            Object.keys(v.broker_dettaglio).length > 0
              ? Object.entries(v.broker_dettaglio)
                  .sort((a, b) => b[1] - a[1])
                  .map(([n, x]) => `${nomeBroker(n)} ${euro(x, 2)}`)
                  .join(", ")
              : "nessuna questo mese"
          }
          come={`Foglio Saldi, colonna E: righe con "provvigioni" e il nome del broker. Restano ai broker e non passano dai conti dell'agenzia. ${agg}.`}
        />
        <Riquadro
          titolo="Avanzo del mese"
          valore={euro(v.avanzo, 2)}
          colore={v.avanzo >= 0 ? "verde" : "rosso"}
          nota={
            (v.avanzo_provvisorio
              ? "provvisorio, mancano le partite non assicurative. "
              : "") +
            (v.avanzo_solo_saldi != null &&
            haDifferenza(v.avanzo - v.avanzo_solo_saldi)
              ? `Col solo foglio Saldi: ${euro(v.avanzo_solo_saldi, 2)}`
              : "")
          }
          come={`Provvigioni del mese (da BO) più partite non assicurative (rimessa sul Banco Desio), meno il girato ai conti dell'agenzia (dagli estratti conto), le provvigioni ai broker e le altre uscite del foglio Saldi. Le altre entrate del foglio non contano. ${agg}.`}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">
            Saldo del conto premi a fine mese (foglio Saldi)
          </div>
          <div className="text-2xl font-semibold tabular-nums">
            {euro(v.saldo_conto_premi, 2)}
          </div>
          <ComeCalcolato
            testo={`Colonna G del foglio Saldi, ultima riga del mese. ${agg}.`}
          />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">
            Avanzo da gennaio {anno}
          </div>
          <div
            className={`text-2xl font-semibold tabular-nums ${
              v.avanzo_da_gennaio >= 0
                ? "text-green-700 dark:text-green-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {euro(v.avanzo_da_gennaio, 2)}
          </div>
          <ComeCalcolato
            testo={`Somma degli avanzi dei mesi da gennaio a ${nm} ${anno}, calcolati come il riquadro dell'avanzo, uscite una tantum comprese. ${agg}.`}
          />
        </div>
      </div>
      {(v.altre_entrate.length > 0 || altreUscite.length > 0) && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          {v.altre_entrate.length > 0 && (
            <>
              <div className="font-medium">
                Altre entrate del foglio Saldi{" "}
                <span className="font-normal text-muted-foreground">
                  (non sono provvigioni e non sono un ricavo)
                </span>
              </div>
              <ul className="mt-1 tabular-nums">
                {v.altre_entrate.map((x) => (
                  <li
                    key={x.riga}
                    className="flex justify-between gap-3 border-t py-1"
                  >
                    <span>
                      {dataIt(x.data)} {x.descrizione}
                    </span>
                    <span>{euro(x.importo, 2)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {altreUscite.length > 0 && (
            <>
              <div
                className={`font-medium ${v.altre_entrate.length > 0 ? "mt-3" : ""}`}
              >
                Altre uscite del foglio Saldi{" "}
                <span className="font-normal text-muted-foreground">
                  (contate nell'avanzo)
                </span>
              </div>
              <ul className="mt-1 tabular-nums">
                {altreUscite.map((x) => (
                  <li
                    key={x.riga}
                    className="flex justify-between gap-3 border-t py-1"
                  >
                    <span>
                      {dataIt(x.data)} {x.descrizione}
                    </span>
                    <span>{euro(x.importo, 2)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {ultimi.length > 1 && <GraficoAvanzo mesi={ultimi} />}
      <Controlli v={v} />
    </section>
  );
};

export default MeseVirtuoso;
