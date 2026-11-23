/**
 * Data and full tiles of the agency main page (Punto Assicurativo, Vittoria agency 346). Reads the last row of the
 * `cruscotto` table, written every morning by agenti\cruscotto_agenzia on Lorenzo's PC.
 * 22/11/2026 (Lorenzo): the main page is simple (CruscottoSemplice.tsx, one number per tile) and each tile opens its
 * own page (CruscottoDettaglio.tsx) with the full tile, the lists and the charts that live here.
 */
import { ResponsiveBar } from "@nivo/bar";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { useBlocchi } from "./datiLati";
import { useBloccoFiscale } from "./Fiscale";
import type { MeseRiepilogo } from "./MeseCruscotto";
import { euro, euroSegno, Riquadro, Variazione } from "./Riquadro";
import { type Spiegazione, Spiegato } from "./Spiega";
import {
  type FiscaleCruscotto,
  type Incassi,
  type MovimentiAvanzo,
  spiegaAvanzo,
  spiegaConPrevisti,
  spiegaCrescita,
  spiegaDeltaAnnoPrima,
  spiegaDeltaMese,
  spiegaDeltaYtd,
  spiegaIncassi,
  spiegaIncassiRamo,
  spiegaNuovePerse,
  spiegaObiettivo,
  spiegaPolizze,
  spiegaUtileFiscale,
} from "./spiegaCruscotto";

export type Delta = {
  np: number;
  ann: number;
  delta: number;
  np_pezzi: number;
  ann_pezzi: number;
  delta_pezzi: number;
};
export type DeltaLinea = {
  mese: Delta;
  mese_ap: Delta;
  ytd: Delta;
  ytd_ap: Delta;
};
export type Avanzo = {
  valore: number;
  data: string | null;
  descrizione: string;
  prec_valore: number | null;
  prec_data: string | null;
};
type Valori = {
  provvigioni: {
    mese: string;
    valore: number;
    ap: number;
    cresc: number | null;
    ultimo_mese_chiuso: { mese: string; totale: number } | null;
  };
  avanzo: Avanzo;
  incassi: Incassi;
  delta_auto: DeltaLinea;
  delta_re: DeltaLinea;
  /** 22/11/2026: when NA108 was read (the midday check reads it again). */
  delta_letto?: string;
  /** 18/11/2026: one entry per month of the year (month picker); older rows do not have it. */
  mesi?: MeseRiepilogo[];
};
export type Mese = {
  mese: string;
  incassi_auto: number;
  incassi_re: number;
  provvigioni: number;
  parziale: boolean;
};
type Riga = {
  data_dati: string;
  aggiornato_il: string;
  valori: Valori;
  mensile: Mese[];
  avvisi: string[] | null;
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
const MESI_BREVI = MESI.map((m) => m.slice(0, 3));

export const polizze = (n: number) =>
  `${n >= 0 ? "+" : ""}${n} ${Math.abs(n) === 1 ? "polizza" : "polizze"}`;
export const pctSegno = (v: number | null) =>
  v == null
    ? "n.d."
    : `${v >= 0 ? "+" : ""}${v.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
export const dataIt = (iso: string | null) =>
  iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
      })
    : "";
const nomeMese = (aaaa_mm: string) =>
  MESI[parseInt(aaaa_mm.slice(5, 7), 10) - 1];
const oraIt = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const useCruscotto = () =>
  useQuery({
    queryKey: ["cruscotto", "ultimo"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("cruscotto")
        .select("*")
        .order("data_dati", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as Riga | null;
    },
  });

/** Running month built from the old fields, for rows written before the month picker (18/11/2026). */
const meseDaRiga = (r: Riga): MeseRiepilogo => {
  const p = r.valori.provvigioni;
  return {
    mese: p.mese,
    fino_al: r.data_dati,
    parziale: true,
    provv: p.valore,
    provv_ap: p.ap,
    differenza: Math.round((p.valore - p.ap) * 100) / 100,
    cresc: p.cresc,
    incassi_auto: 0,
    incassi_re: 0,
    incassi_auto_ap: 0,
    incassi_re_ap: 0,
    delta_auto: r.valori.delta_auto.mese,
    delta_auto_ap: r.valori.delta_auto.mese_ap,
    delta_re: r.valori.delta_re.mese,
    delta_re_ap: r.valori.delta_re.mese_ap,
  };
};

type BloccoFiscale = ReturnType<typeof useBloccoFiscale>["data"];

/** Everything the main page and the detail pages show, computed once from the loaded rows. */
const calcola = (
  data: Riga,
  scelto: string | null,
  fiscale: BloccoFiscale,
  saldi: Record<string, { saldo_conto_premi: number | null }>,
  movimentiAvanzo: MovimentiAvanzo | null,
) => {
  const v = data.valori;
  const mesiAnno = v.mesi?.length ? v.mesi : [meseDaRiga(data)];
  const m =
    mesiAnno.find((x) => x.mese === scelto) ?? mesiAnno[mesiAnno.length - 1];
  const anno = data.data_dati.slice(0, 4);
  const annoN = parseInt(anno, 10);
  // small charts: only real monthly series (provvigioni and incassi from the cruscotto row, saldo and utile fiscale
  // from the partners' blocks)
  const mensile = data.mensile ?? [];
  let cumulo = 0;
  const serieIncassi = mensile
    .filter((x) => x.mese.startsWith(anno))
    .map((x) => (cumulo += x.incassi_auto + x.incassi_re));
  const saldiMese = Object.entries(saldi)
    .slice(-12)
    .filter(
      (x): x is [string, { saldo_conto_premi: number }] =>
        x[1].saldo_conto_premi != null,
    )
    .map(([mese, x]): [string, number] => [mese, x.saldo_conto_premi]);
  let cumuloF = 0;
  const serieFiscale = Object.entries(fiscale?.per_mese ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, x]) => (cumuloF += x.utile_fiscale));
  const fp = fiscale?.proiezione;
  const fiscaleSpiega =
    fiscale && fp ? (fiscale as unknown as FiscaleCruscotto) : null;
  const obiettivo =
    fiscale && fp
      ? {
          previsto: fp.utile_fiscale,
          obiettivo: fiscale.obiettivo ?? fiscale.soglia,
          mancanti:
            fiscale.costi_mancanti ??
            fp.utile_fiscale - (fiscale.obiettivo ?? fiscale.soglia),
          previsti: fiscale.costi_previsti?.totale ?? null,
          conPrevisti: fiscale.utile_fiscale_con_previsti ?? null,
          sopra: fiscale.sopra_obiettivo ?? null,
        }
      : null;
  return {
    data,
    v,
    mesiAnno,
    m,
    anno,
    annoN,
    aggiornato: oraIt(data.aggiornato_il),
    deltaLetto: v.delta_letto ? oraIt(v.delta_letto) : null,
    serieProvv: mensile.map((x) => x.provvigioni),
    serieIncassi,
    serieSaldo: saldiMese.map(([, x]) => x),
    serieFiscale,
    saldiMese,
    movimentiAvanzo,
    obiettivo,
    fiscaleSpiega,
    conPrevisti: fiscaleSpiega ? spiegaConPrevisti(fiscaleSpiega) : undefined,
  };
};
export type DatiCruscotto = ReturnType<typeof calcola>;

/** Loads the main page rows; the month picked stays in the address (?mese=), so it follows into the detail pages. */
export const useDatiCruscotto = () => {
  const q = useCruscotto();
  // partners only: these blocks are protected by RLS, for everyone else they are empty and their tiles are not shown
  const fiscale = useBloccoFiscale();
  const saldi = useBlocchi<{ saldo_conto_premi: number | null }, unknown>(
    "saldi",
  );
  const avanzo = useBlocchi<unknown, MovimentiAvanzo>("avanzo");
  const [parametri, setParametri] = useSearchParams();
  const scelto = parametri.get("mese");
  const scegli = (mese: string) => {
    const p = new URLSearchParams(parametri);
    p.set("mese", mese);
    setParametri(p, { replace: true });
  };
  const dati = q.data
    ? calcola(
        q.data,
        scelto,
        fiscale.data,
        saldi.data?.mesi ?? {},
        avanzo.data?.info ?? null,
      )
    : null;
  return { q, dati, scegli, ricerca: scelto ? `?mese=${scelto}` : "" };
};

// ------------------------------------------------------------------ full tiles (detail pages)

export const RiquadroDelta = ({
  titolo,
  d,
  m,
  chiave,
  mesi,
  datiAl,
  anno,
  letto,
}: {
  titolo: string;
  d: DeltaLinea;
  /** month chosen with the picker (default: the running month) */
  m: MeseRiepilogo;
  chiave: "delta_auto" | "delta_re";
  mesi: MeseRiepilogo[];
  datiAl: string;
  anno: number;
  letto: string | null;
}) => {
  const delMese: Delta = m[chiave];
  return (
    <Riquadro
      titolo={titolo}
      valore={euroSegno(d.ytd.delta)}
      colore={d.ytd.delta >= 0 ? "verde" : "rosso"}
      spiega={spiegaDeltaYtd(titolo, d, mesi, chiave, datiAl, letto)}
    >
      <span
        className={`self-start rounded-full px-2.5 py-0.5 font-medium ${
          d.ytd.delta_pezzi >= 0
            ? "bg-pa-verde-chiaro text-pa-verde"
            : "bg-pa-rosso-chiaro text-pa-rosso"
        }`}
      >
        {d.ytd.delta_pezzi >= 0 ? "▲" : "▼"}{" "}
        <Spiegato spiega={spiegaPolizze(titolo, d.ytd)}>
          {polizze(d.ytd.delta_pezzi)}
        </Spiegato>
      </span>
      <span className="text-muted-foreground">
        da inizio anno:{" "}
        <Spiegato spiega={spiegaNuovePerse(titolo, d.ytd, "nuove")}>
          {d.ytd.np_pezzi} nuove
        </Spiegato>
        ,{" "}
        <Spiegato spiega={spiegaNuovePerse(titolo, d.ytd, "perse")}>
          {d.ytd.ann_pezzi} perse
        </Spiegato>
      </span>
      <span className="text-muted-foreground">
        anno scorso{" "}
        <Spiegato spiega={spiegaDeltaAnnoPrima(titolo, d, anno)}>
          {euroSegno(d.ytd_ap.delta)}
        </Spiegato>
      </span>
      <span className="text-muted-foreground">
        {nomeMese(m.mese)}{" "}
        <Spiegato spiega={spiegaDeltaMese(titolo, m, chiave)}>
          {euroSegno(delMese.delta)}
        </Spiegato>
        , {polizze(delMese.delta_pezzi)}
      </span>
      {letto && (
        <span className="text-xs text-muted-foreground">
          report della compagnia letto il {letto}
        </span>
      )}
    </Riquadro>
  );
};

/** Bar towards Fabio's target: how much of the costs still needed the costs he expects (Tombolato, cars) cover. */
const BarraObiettivo = ({
  previsti,
  mancanti,
  spiega,
}: {
  previsti: number;
  mancanti: number;
  spiega?: Spiegazione;
}) => {
  const quota = mancanti > 0 ? Math.min(1, previsti / mancanti) : 1;
  return (
    <div className="mt-2 flex flex-col gap-1">
      <div
        className="h-2.5 w-full rounded-full bg-muted overflow-hidden"
        role="img"
        aria-label={`costi previsti ${Math.round(quota * 100)}% di quelli che servono`}
      >
        <div
          className="h-full rounded-full bg-pa-verde"
          style={{ width: `${quota * 100}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        i costi previsti coprono il{" "}
        {spiega ? (
          <Spiegato spiega={spiega}>{Math.round(quota * 100)}%</Spiegato>
        ) : (
          `${Math.round(quota * 100)}%`
        )}{" "}
        di quelli che mancano
      </span>
    </div>
  );
};

export const GraficoMesi = ({ mesi }: { mesi: Mese[] }) => {
  const [tabella, setTabella] = useState(false);
  const scuro = document.documentElement.classList.contains("dark");
  const colori = scuro ? ["#3987e5", "#d95926"] : ["#2a78d6", "#eb6834"];
  const dati = mesi.map((m) => ({
    mese:
      MESI_BREVI[parseInt(m.mese.slice(5, 7), 10) - 1] +
      (m.parziale ? "*" : ""),
    Auto: Math.round(m.incassi_auto),
    RE: Math.round(m.incassi_re),
  }));
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h2 className="text-base font-semibold">
          Incassi per mese, ultimi 12 mesi
        </h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: colori[0] }}
            />{" "}
            Auto
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: colori[1] }}
            />{" "}
            RE
          </span>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveBar
          data={dati}
          keys={["Auto", "RE"]}
          indexBy="mese"
          colors={colori}
          margin={{ top: 8, right: 4, bottom: 24, left: 44 }}
          padding={0.35}
          innerPadding={2}
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
          tooltip={({ id, value, indexValue }) => (
            <div className="rounded border bg-popover px-2 py-1 text-sm text-popover-foreground shadow">
              {indexValue} {id}: <strong>{euro(value as number)}</strong>
            </div>
          )}
          role="img"
          ariaLabel="Incassi auto e RE per mese, ultimi 12 mesi"
        />
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>
          * mese in corso, fino a ieri. Fonte titoli incassati (NA013).
        </span>
        <button className="underline" onClick={() => setTabella(!tabella)}>
          {tabella ? "Nascondi tabella" : "Mostra tabella"}
        </button>
      </div>
      {tabella && (
        <table className="mt-2 w-full text-sm tabular-nums">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="font-normal">Mese</th>
              <th className="font-normal text-right">Auto</th>
              <th className="font-normal text-right">RE</th>
              <th className="font-normal text-right">Provvigioni</th>
            </tr>
          </thead>
          <tbody>
            {mesi.map((m) => (
              <tr key={m.mese} className="border-t">
                <td>
                  {nomeMese(m.mese)} {m.mese.slice(0, 4)}
                  {m.parziale ? "*" : ""}
                </td>
                <td className="text-right">{euro(m.incassi_auto)}</td>
                <td className="text-right">{euro(m.incassi_re)}</td>
                <td className="text-right">{euro(m.provvigioni)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export const ComeLeggere = () => (
  <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground flex flex-col gap-1">
    <div className="text-foreground font-medium">Come leggere</div>
    <span>
      Delta = nuova produzione meno annullamenti, in premio imponibile.
    </span>
    <span>
      Auto e RE come nella mail di Vittoria: gli infortuni del conducente stanno
      nel RE.
    </span>
    <span>Confronti sullo stesso periodo dell'anno scorso.</span>
  </div>
);

export const RiquadroAvanzo = ({ p }: { p: DatiCruscotto }) => {
  const av = p.v.avanzo;
  const spiega = spiegaAvanzo(av, p.saldiMese, p.movimentiAvanzo);
  return (
    <Riquadro
      titolo="Avanzo del conto premi"
      valore={euro(av.valore)}
      colore={av.valore < 0 ? "rosso" : "verde"}
      coloraValore
      serie={p.serieSaldo.length > 1 ? p.serieSaldo : undefined}
      etichettaSerie="Saldo del conto premi a fine mese, ultimi 12 mesi"
      spiega={spiega}
    >
      {av.prec_valore != null && (
        <span className="text-muted-foreground font-medium">
          il {dataIt(av.prec_data)} era{" "}
          <Spiegato spiega={spiega}>{euro(av.prec_valore)}</Spiegato>
        </span>
      )}
      <span className="text-muted-foreground">
        ultimo movimento {dataIt(av.data)}
        {av.descrizione ? `, ${av.descrizione}` : ""}
      </span>
    </Riquadro>
  );
};

export const RiquadroIncassi = ({ p }: { p: DatiCruscotto }) => {
  const inc = p.v.incassi;
  const spiega = spiegaIncassi(inc, p.annoN, p.data.data_dati);
  return (
    <Riquadro
      titolo={`Incassi da inizio ${p.anno}`}
      valore={euro(inc.totale)}
      serie={p.serieIncassi}
      etichettaSerie={`Incassi progressivi del ${p.anno}`}
      spiega={spiega}
    >
      <Variazione pct={inc.cresc_totale} testo={`sul ${p.annoN - 1}`} />
      <span className="text-muted-foreground">
        auto{" "}
        <Spiegato
          spiega={spiegaCrescita(
            "Auto",
            inc.auto,
            inc.auto_ap,
            inc.cresc_auto,
            p.annoN,
          )}
        >
          {pctSegno(inc.cresc_auto)}
        </Spiegato>
        , RE{" "}
        <Spiegato
          spiega={spiegaCrescita(
            "RE",
            inc.re,
            inc.re_ap,
            inc.cresc_re,
            p.annoN,
          )}
        >
          {pctSegno(inc.cresc_re)}
        </Spiegato>
      </span>
      <span className="text-muted-foreground">
        auto{" "}
        <Spiegato
          spiega={spiegaIncassiRamo(inc, "auto", p.annoN, p.data.data_dati)}
        >
          {euro(inc.auto)}
        </Spiegato>
        , RE{" "}
        <Spiegato
          spiega={spiegaIncassiRamo(inc, "re", p.annoN, p.data.data_dati)}
        >
          {euro(inc.re)}
        </Spiegato>
      </span>
    </Riquadro>
  );
};

export const RiquadroUtileFiscale = ({ p }: { p: DatiCruscotto }) => {
  const o = p.obiettivo;
  const f = p.fiscaleSpiega;
  if (!o || !f) return null;
  return (
    <Riquadro
      titolo="Utile fiscale previsto"
      valore={euro(o.previsto)}
      serie={p.serieFiscale.length > 1 ? p.serieFiscale : undefined}
      etichettaSerie="Utile fiscale da gennaio, mese per mese"
      spiega={spiegaUtileFiscale(f)}
    >
      <span className="font-semibold text-foreground">
        obiettivo{" "}
        <Spiegato spiega={spiegaObiettivo(f)}>{euro(o.obiettivo)}</Spiegato>
      </span>
      <span className="text-muted-foreground">
        {o.mancanti > 0 ? (
          <>
            mancano{" "}
            <Spiegato spiega={spiegaObiettivo(f)}>{euro(o.mancanti)}</Spiegato>{" "}
            di costi
          </>
        ) : (
          "obiettivo raggiunto"
        )}
      </span>
      {o.conPrevisti != null && o.previsti != null && (
        <>
          <span className="text-muted-foreground">
            coi costi previsti da Fabio{" "}
            {p.conPrevisti ? (
              <Spiegato spiega={p.conPrevisti}>{euro(o.conPrevisti)}</Spiegato>
            ) : (
              euro(o.conPrevisti)
            )}
            {o.sopra != null && (
              <>
                {" ("}
                {p.conPrevisti ? (
                  <Spiegato spiega={p.conPrevisti}>
                    {o.sopra >= 0
                      ? `+${euro(o.sopra)}`
                      : `mancano ${euro(-o.sopra)}`}
                  </Spiegato>
                ) : o.sopra >= 0 ? (
                  `+${euro(o.sopra)}`
                ) : (
                  `mancano ${euro(-o.sopra)}`
                )}
                {")"}
              </>
            )}
          </span>
          <BarraObiettivo
            previsti={o.previsti}
            mancanti={o.mancanti}
            spiega={p.conPrevisti}
          />
        </>
      )}
    </Riquadro>
  );
};
