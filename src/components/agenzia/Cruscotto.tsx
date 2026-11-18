/**
 * Pagina principale della dashboard di agenzia (Punto Assicurativo, agenzia Vittoria 346).
 * Legge l'ultima riga della tabella `cruscotto`, scritta ogni mattina dall'agente
 * agenti\cruscotto_agenzia sul PC di Lorenzo. Cinque numeri e un grafico dei 12 mesi.
 */
import { ResponsiveBar } from "@nivo/bar";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { useBlocchi } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { useBloccoFiscale } from "./Fiscale";
import {
  ConfrontoMesi,
  type MeseRiepilogo,
  RiquadroProvvigioniMese,
  ScegliMese,
} from "./MeseCruscotto";
import { euro, euroSegno, Riquadro, Variazione } from "./Riquadro";
import { Sezione } from "./Sezione";

type Delta = {
  np: number;
  ann: number;
  delta: number;
  np_pezzi: number;
  ann_pezzi: number;
  delta_pezzi: number;
};
type DeltaLinea = { mese: Delta; mese_ap: Delta; ytd: Delta; ytd_ap: Delta };
type Valori = {
  provvigioni: {
    mese: string;
    valore: number;
    ap: number;
    cresc: number | null;
    ultimo_mese_chiuso: { mese: string; totale: number } | null;
  };
  avanzo: {
    valore: number;
    data: string | null;
    descrizione: string;
    prec_valore: number | null;
    prec_data: string | null;
  };
  incassi: {
    auto: number;
    re: number;
    totale: number;
    auto_ap: number;
    re_ap: number;
    totale_ap: number;
    cresc_auto: number | null;
    cresc_re: number | null;
    cresc_totale: number | null;
  };
  delta_auto: DeltaLinea;
  delta_re: DeltaLinea;
  /** 18/11/2026: one entry per month of the year (month picker); older rows do not have it. */
  mesi?: MeseRiepilogo[];
};
type Mese = {
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

const polizze = (n: number) =>
  `${n >= 0 ? "+" : ""}${n} ${Math.abs(n) === 1 ? "polizza" : "polizze"}`;
const pctSegno = (v: number | null) =>
  v == null
    ? "n.d."
    : `${v >= 0 ? "+" : ""}${v.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
const dataIt = (iso: string | null) =>
  iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
      })
    : "";
const nomeMese = (aaaa_mm: string) =>
  MESI[parseInt(aaaa_mm.slice(5, 7), 10) - 1];

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

const RiquadroDelta = ({
  titolo,
  d,
  mese,
  delMese,
}: {
  titolo: string;
  d: DeltaLinea;
  mese: string;
  /** delta of the month chosen with the picker (default: the running month) */
  delMese: Delta;
}) => (
  <Riquadro
    titolo={titolo}
    valore={euroSegno(d.ytd.delta)}
    colore={d.ytd.delta >= 0 ? "verde" : "rosso"}
  >
    <span
      className={`self-start rounded-full px-2.5 py-0.5 font-medium ${
        d.ytd.delta_pezzi >= 0
          ? "bg-pa-verde-chiaro text-pa-verde"
          : "bg-pa-rosso-chiaro text-pa-rosso"
      }`}
    >
      {d.ytd.delta_pezzi >= 0 ? "▲" : "▼"} {polizze(d.ytd.delta_pezzi)}
    </span>
    <span className="text-muted-foreground hidden sm:block">
      da inizio anno: {d.ytd.np_pezzi} nuove, {d.ytd.ann_pezzi} perse
    </span>
    <span className="text-muted-foreground">
      anno scorso {euroSegno(d.ytd_ap.delta)}
    </span>
    <span className="text-muted-foreground hidden sm:block">
      {nomeMese(mese)} {euroSegno(delMese.delta)},{" "}
      {polizze(delMese.delta_pezzi)}
    </span>
  </Riquadro>
);

/** Bar towards Fabio's target: how much of the costs still needed the costs he expects (Tombolato, cars) cover. */
const BarraObiettivo = ({
  previsti,
  mancanti,
}: {
  previsti: number;
  mancanti: number;
}) => {
  const quota = mancanti > 0 ? Math.min(1, previsti / mancanti) : 1;
  return (
    <div className="mt-2">
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
    </div>
  );
};

const GraficoMesi = ({ mesi }: { mesi: Mese[] }) => {
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

const ComeLeggere = () => (
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

export const Cruscotto = () => {
  const { data, isPending, error } = useCruscotto();
  const [scelto, setScelto] = useState<string | null>(null);
  const [confronto, setConfronto] = useState<[string, string]>(["", ""]);
  // partners only: the fiscale block is protected by RLS, for everyone else it is empty and the tile is not shown
  const fiscale = useBloccoFiscale();
  const saldi = useBlocchi<{ saldo_conto_premi: number | null }, unknown>(
    "saldi",
  );
  const fp = fiscale.data?.proiezione;
  const obiettivo =
    fiscale.data && fp
      ? {
          previsto: fp.utile_fiscale,
          obiettivo: fiscale.data.obiettivo ?? fiscale.data.soglia,
          mancanti:
            fiscale.data.costi_mancanti ??
            fp.utile_fiscale - (fiscale.data.obiettivo ?? fiscale.data.soglia),
          previsti: fiscale.data.costi_previsti?.totale ?? null,
          conPrevisti: fiscale.data.utile_fiscale_con_previsti ?? null,
          sopra: fiscale.data.sopra_obiettivo ?? null,
        }
      : null;
  if (isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (error) return <ErroreCaricamento errore={error} />;
  if (!data)
    return (
      <div className="p-4 text-muted-foreground">
        Nessun dato ancora: l'agente non ha ancora girato.
      </div>
    );

  const v = data.valori;
  const mesiAnno = v.mesi?.length ? v.mesi : [meseDaRiga(data)];
  const m =
    mesiAnno.find((x) => x.mese === scelto) ?? mesiAnno[mesiAnno.length - 1];
  const inc = v.incassi;
  const anno = data.data_dati.slice(0, 4);
  const aggiornato = new Date(data.aggiornato_il).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  // small charts: only real monthly series (provvigioni and incassi from the cruscotto row, saldo and utile fiscale
  // from the partners' blocks); delta auto and RE have no monthly series yet, so no chart there
  const mesi = data.mensile ?? [];
  const serieProvv = mesi.map((m) => m.provvigioni);
  let cumulo = 0;
  const serieIncassi = mesi
    .filter((m) => m.mese.startsWith(anno))
    .map((m) => (cumulo += m.incassi_auto + m.incassi_re));
  const serieSaldo = Object.entries(saldi.data?.mesi ?? {})
    .slice(-12)
    .map(([, x]) => x.saldo_conto_premi)
    .filter((x): x is number => x != null);
  let cumuloF = 0;
  const serieFiscale = Object.entries(fiscale.data?.per_mese ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, x]) => (cumuloF += x.utile_fiscale));

  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full px-4 pt-4 pb-28 md:px-0 md:pt-0 md:pb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <h1 className="text-2xl font-semibold text-pa-blu">Imperia Sanremo</h1>
        {mesiAnno.length > 1 && (
          <ScegliMese mesi={mesiAnno} scelto={m.mese} onScegli={setScelto} />
        )}
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full bg-pa-verde"
            aria-hidden
          />
          Dati al {dataIt(data.data_dati)}, aggiornati il {aggiornato}
        </div>
      </div>

      {data.avvisi && data.avvisi.length > 0 && (
        <div className="rounded-lg border border-amber-500 bg-amber-50 dark:bg-amber-950 p-3 text-sm">
          ⚠ {data.avvisi.join(" · ")}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <RiquadroProvvigioniMese m={m} serie={serieProvv} />

        <Riquadro
          titolo="Avanzo del conto premi"
          valore={euro(v.avanzo.valore)}
          colore={v.avanzo.valore < 0 ? "rosso" : "verde"}
          coloraValore
          serie={serieSaldo.length > 1 ? serieSaldo : undefined}
          etichettaSerie="Saldo del conto premi a fine mese, ultimi 12 mesi"
        >
          {v.avanzo.prec_valore != null && (
            <span className="text-muted-foreground font-medium">
              il {dataIt(v.avanzo.prec_data)} era {euro(v.avanzo.prec_valore)}
            </span>
          )}
          <span className="text-muted-foreground">
            ultimo movimento {dataIt(v.avanzo.data)}
            {v.avanzo.descrizione ? `, ${v.avanzo.descrizione}` : ""}
          </span>
        </Riquadro>

        <Riquadro
          titolo={`Incassi da inizio ${anno}`}
          valore={euro(inc.totale)}
          serie={serieIncassi}
          etichettaSerie={`Incassi progressivi del ${anno}`}
        >
          <Variazione
            pct={inc.cresc_totale}
            testo={`sul ${parseInt(anno) - 1}`}
          />
          <span className="text-muted-foreground">
            auto {pctSegno(inc.cresc_auto)}, RE {pctSegno(inc.cresc_re)}
          </span>
          <span className="text-muted-foreground hidden sm:block">
            auto {euro(inc.auto)}, RE {euro(inc.re)}
          </span>
        </Riquadro>

        <RiquadroDelta
          titolo="Delta auto"
          d={v.delta_auto}
          mese={m.mese}
          delMese={m.delta_auto}
        />
        <RiquadroDelta
          titolo="Delta RE"
          d={v.delta_re}
          mese={m.mese}
          delMese={m.delta_re}
        />

        {obiettivo ? (
          <Riquadro
            titolo="Utile fiscale previsto"
            valore={euro(obiettivo.previsto)}
            serie={serieFiscale.length > 1 ? serieFiscale : undefined}
            etichettaSerie="Utile fiscale da gennaio, mese per mese"
          >
            <span className="font-semibold text-foreground">
              obiettivo {euro(obiettivo.obiettivo)}
            </span>
            <span className="text-muted-foreground">
              {obiettivo.mancanti > 0
                ? `mancano ${euro(obiettivo.mancanti)} di costi`
                : "obiettivo raggiunto"}
            </span>
            {obiettivo.conPrevisti != null && obiettivo.previsti != null && (
              <>
                <span className="text-muted-foreground">
                  coi costi previsti da Fabio {euro(obiettivo.conPrevisti)}
                  {obiettivo.sopra != null &&
                    (obiettivo.sopra >= 0
                      ? ` (+${euro(obiettivo.sopra)})`
                      : ` (mancano ${euro(-obiettivo.sopra)})`)}
                </span>
                <BarraObiettivo
                  previsti={obiettivo.previsti}
                  mancanti={obiettivo.mancanti}
                />
              </>
            )}
          </Riquadro>
        ) : (
          <ComeLeggere />
        )}
      </div>

      {obiettivo && (
        <Sezione id="cruscotto.come-leggere" titolo="Come leggere">
          <ComeLeggere />
        </Sezione>
      )}
      {mesiAnno.length > 1 && (
        <Sezione id="cruscotto.confronto" titolo="Confronta due mesi">
          <ConfrontoMesi
            mesi={mesiAnno}
            primo={confronto[0] || m.mese}
            secondo={
              confronto[1] || mesiAnno[Math.max(0, mesiAnno.length - 2)].mese
            }
            onPrimo={(x) => setConfronto([x, confronto[1]])}
            onSecondo={(x) => setConfronto([confronto[0], x])}
          />
        </Sezione>
      )}
      {data.mensile && (
        <Sezione
          id="cruscotto.mesi"
          titolo="Incassi e provvigioni mese per mese"
          riassunto={`${data.mensile.length} mesi`}
        >
          <GraficoMesi mesi={data.mensile} />
        </Sezione>
      )}
    </div>
  );
};

export default Cruscotto;
