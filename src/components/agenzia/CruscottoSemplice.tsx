/**
 * Main page of the agency dashboard (Lorenzo 22/11/2026: "simple things, and on each one you can press and it goes to
 * another page"). Every number keeps its explanation (hover or tap) and the whole tile opens its detail page
 * (CruscottoDettaglio.tsx).
 *
 * 25/11/2026, Cruscotto proposal approved by Lorenzo (output\BO_Vittoria_Piano\Proposta_Cruscotto):
 * - "Da decidere" on top: what waits for a partner, each line opens the right page (DaDecidere.tsx);
 * - bands named by the question they answer: Come vendiamo, Soldi e risultato, Mix del portafoglio;
 * - one period for the whole page (Da gennaio / Mese) and always the same comparison, the same period of last year;
 * - red line only for a drop beyond 10% or a negative premium account, otherwise just the pill;
 * - a label on each tile says how the number counts (per competenza, per cassa, ...);
 * - month by month bars, this year next to last year (BarreMesi.tsx);
 * - on the phone one column, label on the left and number on the right.
 * The month picked stays in the address and follows into the detail pages.
 */
import type { ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { BarreMesi, LegendaBarre, type PuntoMese } from "./BarreMesi";
import {
  dataIt,
  type DatiCruscotto,
  polizze,
  useDatiCruscotto,
} from "./Cruscotto";
import { DaDecidere } from "./DaDecidere";
import { useBlocchi } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { type MeseRiepilogo, meseSolo, ScegliMese } from "./MeseCruscotto";
import { euro, euroSegno } from "./Riquadro";
import { type Spiegazione, Spiegato } from "./Spiega";
import {
  type PartiMix,
  quota,
  quotaTesto,
  spiegaAvanzo,
  spiegaCrescita,
  spiegaDeltaAnnoPrima,
  spiegaDeltaMese,
  spiegaDeltaMeseAnnoPrima,
  spiegaDeltaYtd,
  spiegaDifferenzaProvv,
  spiegaIncassi,
  spiegaIncassiMeseTot,
  spiegaMix,
  spiegaObiettivo,
  spiegaPolizze,
  spiegaProvv,
  spiegaProvvYtd,
  spiegaUtileFiscale,
  periodoMese,
  dataBreve,
} from "./spiegaCruscotto";
import {
  type Area,
  spiegaVitaAnnoPrima,
  spiegaVitaMese,
  spiegaVitaMeseAnnoPrima,
  spiegaVitaYtd,
  type VitaInfo,
  type VitaMese,
} from "./spiegaVita";

export type Periodo = "anno" | "mese";

/** A drop beyond this (in %) gets the red line; a smaller one only the pill (proposal of 25/11/2026). */
export const SOGLIA_ALLARME = -10;

const tondo = (v: number): number => Math.round(v * 100) / 100;
const giornoDi = (iso: string): number => parseInt(iso.slice(8, 10), 10);
const variazione = (ac: number, ap: number) => ({
  diff: tondo(ac - ap),
  pct: ap ? ((ac - ap) / Math.abs(ap)) * 100 : null,
});
const inAllarme = (pct: number | null): boolean =>
  pct != null && pct < SOGLIA_ALLARME;
const pctTesto = (v: number): string =>
  `${v >= 0 ? "+" : ""}${v.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;

/** Pill with arrow and word (never colour alone). */
export const Pillola = ({ su, testo }: { su: boolean; testo: string }) => (
  <span
    className={`self-start rounded-full px-2.5 py-0.5 font-medium ${
      su
        ? "bg-pa-verde-chiaro text-pa-verde"
        : "bg-pa-rosso-chiaro text-pa-rosso"
    }`}
  >
    {su ? "▲" : "▼"} {testo}
  </span>
);

const Forse = ({
  spiega,
  children,
}: {
  spiega?: Spiegazione;
  children: ReactNode;
}) => (spiega ? <Spiegato spiega={spiega}>{children}</Spiegato> : children);

/** Difference on last year, in euro and in %, with its own explanation. */
const Differenza = ({
  diff,
  pct,
  testo,
  spiega,
}: {
  diff: number;
  pct: number | null;
  testo: string;
  spiega?: Spiegazione;
}) => {
  const su = diff >= 0;
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium sm:text-sm ${
        su
          ? "bg-pa-verde-chiaro text-pa-verde"
          : "bg-pa-rosso-chiaro text-pa-rosso"
      }`}
    >
      {su ? "▲" : "▼"} <Forse spiega={spiega}>{euroSegno(diff)}</Forse>
      {pct != null ? ` (${pctTesto(pct)})` : ""}
      <span className="hidden sm:inline"> {testo}</span>
    </span>
  );
};

interface SchedaProps {
  /** detail page (/cruscotto/<voce>); without it the tile does not open anything */
  voce?: string;
  ricerca: string;
  titolo: string;
  valore: string;
  spiega: Spiegazione;
  /** how the number counts: per competenza, per cassa, ... */
  etichetta: string;
  spiegaEtichetta?: string;
  allarme?: boolean;
  valoreRosso?: boolean;
  differenza?: ReactNode;
  righe?: ReactNode;
  sotto?: ReactNode;
}

/**
 * One tile. Computer: card with label, number, pill, notes and bars. Phone: one row, label on the left and number on
 * the right (bars and notes hidden). A click anywhere opens the detail page; the number keeps its own explanation.
 */
const Scheda = ({
  voce,
  ricerca,
  titolo,
  valore,
  spiega,
  etichetta,
  spiegaEtichetta,
  allarme,
  valoreRosso,
  differenza,
  righe,
  sotto,
}: SchedaProps) => {
  const vai = useNavigate();
  const indirizzo = voce ? `/cruscotto/${voce}${ricerca}` : null;
  return (
    <div
      className={`flex min-w-0 flex-col gap-1 rounded-2xl border border-l-4 bg-card px-3 py-2.5 shadow-sm sm:p-4 ${
        allarme ? "border-l-pa-rosso" : "border-l-transparent"
      } ${indirizzo ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md" : ""}`}
      onClick={indirizzo ? () => vai(indirizzo) : undefined}
    >
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-stretch sm:gap-1">
        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
          <div className="text-sm text-muted-foreground">{titolo}</div>
          <span
            className="self-start whitespace-nowrap rounded-md bg-pa-blu-chiaro px-1.5 py-0.5 text-[11px] font-medium text-pa-blu"
            title={spiegaEtichetta}
          >
            {etichetta}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 sm:items-start">
          <div
            className={`text-lg font-bold tabular-nums tracking-tight sm:text-2xl xl:text-3xl ${
              valoreRosso ? "text-pa-rosso" : "text-foreground"
            }`}
          >
            <Spiegato spiega={spiega}>{valore}</Spiegato>
          </div>
          {differenza}
        </div>
      </div>
      {righe && (
        <div className="hidden flex-col gap-0.5 text-xs text-muted-foreground tabular-nums sm:flex sm:text-sm">
          {righe}
        </div>
      )}
      {sotto}
      {indirizzo && (
        <Link
          to={indirizzo}
          className="hidden min-h-10 items-center self-start text-sm font-medium text-pa-blu no-underline hover:underline sm:inline-flex"
          aria-label={`${titolo}: apri il dettaglio`}
          // the tile navigates too: stop the click here, or Back has to be pressed twice (review R041)
          onClick={(e) => e.stopPropagation()}
        >
          Dettagli ›
        </Link>
      )}
    </div>
  );
};

const Fascia = ({
  titolo,
  sotto,
  destra,
  children,
}: {
  titolo: string;
  sotto?: string;
  destra?: ReactNode;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-2" aria-label={titolo}>
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="text-xs font-bold uppercase tracking-wider text-pa-blu">
        {titolo}
        {sotto && (
          <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">
            {sotto}
          </span>
        )}
      </h2>
      {destra}
    </div>
    {children}
  </section>
);

// ------------------------------------------------------------------ the figures of each period

interface Vendita {
  chiave: string;
  voce: string;
  titolo: string;
  etichetta: string;
  spiegaEtichetta: string;
  ac: number;
  ap: number;
  valore: string;
  spiega: Spiegazione;
  spiegaDiff?: Spiegazione;
  righe?: ReactNode;
  punti: PuntoMese[];
}

const PER_COMPETENZA =
  "Conta le provvigioni quando maturano, cioè il giorno in cui il cliente paga il titolo, non quando la compagnia le versa.";
const PER_CASSA = "Conta i premi il giorno in cui sono stati incassati.";
const PORTAFOGLIO =
  "Movimenti del portafoglio: polizze nuove meno polizze annullate, in premio imponibile.";

const puntiMesi = (
  mesi: MeseRiepilogo[],
  ac: (m: MeseRiepilogo) => number,
  ap: (m: MeseRiepilogo) => number,
): PuntoMese[] =>
  mesi.map((m) => ({
    mese: m.mese,
    ac: ac(m),
    ap: ap(m),
    parziale: m.parziale,
  }));

const puntiVita = (
  mesi: MeseRiepilogo[],
  vitaMesi: Record<string, VitaMese>,
  area: Area,
): PuntoMese[] =>
  mesi
    .filter((m) => vitaMesi[m.mese])
    .map((m) => ({
      mese: m.mese,
      ac: vitaMesi[m.mese].ac[area],
      ap: vitaMesi[m.mese].ap[area],
      parziale: vitaMesi[m.mese].parziale,
    }));

const RigaPolizze = ({
  nome,
  ac,
  ap,
  anno,
}: {
  nome: string;
  ac: Parameters<typeof spiegaPolizze>[1];
  ap: Parameters<typeof spiegaPolizze>[1];
  anno: number;
}) => (
  <span>
    <Spiegato spiega={spiegaPolizze(nome, ac)}>
      {polizze(ac.delta_pezzi)}
    </Spiegato>
    , nel {anno - 1} {polizze(ap.delta_pezzi)}
  </span>
);

const vendite = (
  p: DatiCruscotto,
  periodo: Periodo,
  info: VitaInfo | null | undefined,
  vitaMesi: Record<string, VitaMese>,
): Vendita[] => {
  const { m, v, mesiAnno: mesi, annoN } = p;
  const out: Vendita[] = [];
  const delta = (nome: string, chiave: "delta_auto" | "delta_re"): Vendita => {
    const k = chiave === "delta_auto" ? "delta_auto_ap" : "delta_re_ap";
    const d = v[chiave];
    const anno = periodo === "anno";
    const ac = anno ? d.ytd : m[chiave];
    const ap = anno ? d.ytd_ap : m[k];
    return {
      chiave,
      voce: "delta",
      titolo: nome,
      etichetta: "portafoglio",
      spiegaEtichetta: PORTAFOGLIO,
      ac: ac.delta,
      ap: ap.delta,
      valore: euroSegno(ac.delta),
      spiega: anno
        ? spiegaDeltaYtd(nome, d, mesi, chiave, p.data.data_dati, p.deltaLetto)
        : spiegaDeltaMese(nome, m, chiave),
      spiegaDiff: anno
        ? spiegaDeltaAnnoPrima(nome, d, annoN)
        : spiegaDeltaMeseAnnoPrima(nome, m, chiave),
      righe: <RigaPolizze nome={nome} ac={ac} ap={ap} anno={annoN} />,
      punti: puntiMesi(
        mesi,
        (x) => x[chiave].delta,
        (x) => x[k].delta,
      ),
    };
  };
  if (periodo === "anno") {
    const provv = spiegaProvvYtd(mesi);
    out.push({
      chiave: "provv",
      voce: "provvigioni",
      titolo: "Provvigioni da gennaio",
      etichetta: "per competenza",
      spiegaEtichetta: PER_COMPETENZA,
      ac: mesi.reduce((s, x) => s + x.provv, 0),
      ap: mesi.reduce((s, x) => s + x.provv_ap, 0),
      valore: euro(mesi.reduce((s, x) => s + x.provv, 0)),
      spiega: provv,
      // same figures, its own title: the number and the pill are two different buttons
      spiegaDiff: {
        ...provv,
        titolo: `Provvigioni: differenza sul ${annoN - 1}`,
      },
      punti: puntiMesi(
        mesi,
        (x) => x.provv,
        (x) => x.provv_ap,
      ),
    });
    const inc = v.incassi;
    out.push({
      chiave: "inc",
      voce: "incassi",
      titolo: "Incassi da gennaio",
      etichetta: "per cassa",
      spiegaEtichetta: PER_CASSA,
      ac: inc.totale,
      ap: inc.totale_ap,
      valore: euro(inc.totale),
      spiega: spiegaIncassi(inc, annoN, p.data.data_dati),
      spiegaDiff: spiegaCrescita(
        "Incassi",
        inc.totale,
        inc.totale_ap,
        inc.cresc_totale,
        annoN,
      ),
      punti: puntiMesi(
        mesi,
        (x) => x.incassi_auto + x.incassi_re,
        (x) => x.incassi_auto_ap + x.incassi_re_ap,
      ),
    });
    if (info)
      (["vita", "prot"] as const).forEach((area) =>
        out.push({
          chiave: area,
          voce: area === "vita" ? "vita" : "protezione",
          titolo: `${area === "vita" ? "Vita" : "Protezione"} da gennaio`,
          etichetta: "per cassa",
          spiegaEtichetta: PER_CASSA,
          ac: info.ytd[area],
          ap: info.ytd_ap[area],
          valore: euro(info.ytd[area]),
          spiega: spiegaVitaYtd(info, area),
          spiegaDiff: spiegaVitaAnnoPrima(info, area),
          punti: puntiVita(mesi, vitaMesi, area),
        }),
      );
  } else {
    out.push({
      chiave: "provv",
      voce: "provvigioni",
      titolo: `Provvigioni di ${meseSolo(m.mese)}${m.parziale ? ` fino al ${giornoDi(m.fino_al)}` : ""}`,
      etichetta: "per competenza",
      spiegaEtichetta: PER_COMPETENZA,
      ac: m.provv,
      ap: m.provv_ap,
      valore: euro(m.provv),
      spiega: spiegaProvv(m),
      spiegaDiff: spiegaDifferenzaProvv(m),
      punti: puntiMesi(
        mesi,
        (x) => x.provv,
        (x) => x.provv_ap,
      ),
    });
    const inc = spiegaIncassiMeseTot(m);
    out.push({
      chiave: "inc",
      voce: "incassi",
      titolo: `Incassi di ${meseSolo(m.mese)}${m.parziale ? ` fino al ${giornoDi(m.fino_al)}` : ""}`,
      etichetta: "per cassa",
      spiegaEtichetta: PER_CASSA,
      ac: m.incassi_auto + m.incassi_re,
      ap: m.incassi_auto_ap + m.incassi_re_ap,
      valore: euro(m.incassi_auto + m.incassi_re),
      spiega: inc,
      spiegaDiff: { ...inc, titolo: `Incassi: differenza sul ${annoN - 1}` },
      punti: puntiMesi(
        mesi,
        (x) => x.incassi_auto + x.incassi_re,
        (x) => x.incassi_auto_ap + x.incassi_re_ap,
      ),
    });
    const vm = vitaMesi[m.mese];
    if (vm)
      (["vita", "prot"] as const).forEach((area) =>
        out.push({
          chiave: area,
          voce: area === "vita" ? "vita" : "protezione",
          titolo: `${area === "vita" ? "Vita" : "Protezione"} di ${meseSolo(m.mese)}${vm.parziale ? ` fino al ${giornoDi(vm.fino_al)}` : ""}`,
          etichetta: "per cassa",
          spiegaEtichetta: PER_CASSA,
          ac: vm.ac[area],
          ap: vm.ap[area],
          valore: euro(vm.ac[area]),
          spiega: spiegaVitaMese(m.mese, vm, area),
          spiegaDiff: spiegaVitaMeseAnnoPrima(m.mese, vm, area),
          punti: puntiVita(mesi, vitaMesi, area),
        }),
      );
  }
  out.push(delta("Delta auto", "delta_auto"), delta("Delta RE", "delta_re"));
  return out;
};

// ------------------------------------------------------------------ profit against the target

const BarraObiettivo = ({
  previsto,
  obiettivo,
  conPrevisti,
}: {
  previsto: number;
  obiettivo: number;
  conPrevisti: number | null;
}) => {
  const fondo = Math.max(previsto, obiettivo, conPrevisti ?? 0) * 1.08 || 1;
  const pos = (v: number) =>
    `${Math.max(0, Math.min(100, (v / fondo) * 100))}%`;
  return (
    <div
      className="relative mb-5 mt-3 hidden h-3 rounded-full bg-pa-blu-chiaro sm:block"
      role="img"
      aria-label={`previsti ${euro(previsto)}, obiettivo ${euro(obiettivo)}${conPrevisti != null ? `, coi costi previsti ${euro(conPrevisti)}` : ""}`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-pa-blu"
        style={{ width: pos(previsto) }}
      />
      <div
        className="absolute -inset-y-1.5 w-0.5 bg-foreground"
        style={{ left: pos(obiettivo) }}
      >
        <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted-foreground">
          obiettivo {euro(obiettivo)}
        </span>
      </div>
      {conPrevisti != null && (
        <div
          className="absolute -inset-y-1 w-0.5 bg-pa-verde"
          style={{ left: pos(conPrevisti) }}
          title={`coi costi previsti ${euro(conPrevisti)}`}
        />
      )}
    </div>
  );
};

// ------------------------------------------------------------------ mix of the portfolio

const COLORI_MIX = { auto: "#1f3864", re: "#4f8fd6", vita: "#a7c6ec" };
const TESTO_MIX = { auto: "#ffffff", re: "#ffffff", vita: "#1f3864" };
const NOMI_MIX = { auto: "Auto", re: "RE", vita: "Vita" };

const BarraMix = ({ anno, parti }: { anno: number; parti: PartiMix }) => {
  const tot = parti.auto + parti.re + parti.vita;
  return (
    <div className="grid grid-cols-[2.75rem_1fr] items-center gap-2">
      <span className="text-sm font-semibold text-muted-foreground">
        {anno}
      </span>
      <div className="flex h-6 gap-0.5 overflow-hidden rounded-md">
        {(["auto", "re", "vita"] as const).map((k) => {
          const q = quota(parti[k], tot) ?? 0;
          return (
            <div
              key={k}
              className="flex items-center overflow-hidden whitespace-nowrap pl-1.5 text-xs font-semibold"
              style={{
                width: `${q}%`,
                minWidth: q > 0 ? "2.25rem" : 0,
                background: COLORI_MIX[k],
                color: TESTO_MIX[k],
              }}
            >
              {q >= 14 ? `${NOMI_MIX[k]} ` : ""}
              {quotaTesto(q)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Mix = ({
  p,
  periodo,
  info,
  vitaMesi,
}: {
  p: DatiCruscotto;
  periodo: Periodo;
  info: VitaInfo | null | undefined;
  vitaMesi: Record<string, VitaMese>;
}) => {
  const { m, v, annoN } = p;
  let a: PartiMix, b: PartiMix, testoPeriodo: string, fonte: string;
  if (periodo === "anno") {
    if (!info) return null;
    a = { auto: v.incassi.auto, re: v.incassi.re, vita: info.ytd.totale };
    b = {
      auto: v.incassi.auto_ap,
      re: v.incassi.re_ap,
      vita: info.ytd_ap.totale,
    };
    testoPeriodo = `da gennaio al ${dataBreve(p.data.data_dati)}`;
    fonte = "NA302 per i mesi chiusi e NA013 dopo, come il riquadro Incassi";
  } else {
    const vm = vitaMesi[m.mese];
    if (!vm) return null;
    a = { auto: m.incassi_auto, re: m.incassi_re, vita: vm.ac.totale };
    b = { auto: m.incassi_auto_ap, re: m.incassi_re_ap, vita: vm.ap.totale };
    testoPeriodo = periodoMese(m);
    fonte = "NA013";
  }
  const spiega = spiegaMix(testoPeriodo, a, b, annoN, fonte);
  const ta = a.auto + a.re + a.vita;
  const tb = b.auto + b.re + b.vita;
  return (
    <Fascia titolo="Mix del portafoglio" sotto={testoPeriodo}>
      <div className="flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <BarraMix anno={annoN} parti={a} />
        <BarraMix anno={annoN - 1} parti={b} />
        <p className="text-xs text-muted-foreground sm:text-sm">
          Quota sugli incassi:{" "}
          <Spiegato spiega={spiega}>
            auto {quotaTesto(quota(a.auto, ta))} (nel {annoN - 1}{" "}
            {quotaTesto(quota(b.auto, tb))})
          </Spiegato>
          , RE {quotaTesto(quota(a.re, ta))}, Vita e protezione{" "}
          {quotaTesto(quota(a.vita, ta))}. Obiettivo: far scendere l'auto.
        </p>
      </div>
    </Fascia>
  );
};

// ------------------------------------------------------------------ the page

const SceltaPeriodo = ({
  periodo,
  onScegli,
}: {
  periodo: Periodo;
  onScegli: (p: Periodo) => void;
}) => (
  <div
    role="group"
    aria-label="Periodo"
    className="inline-flex rounded-full border bg-card p-0.5 text-sm"
  >
    {(
      [
        ["anno", "Da gennaio"],
        ["mese", "Mese"],
      ] as const
    ).map(([k, nome]) => (
      <button
        key={k}
        type="button"
        aria-pressed={periodo === k}
        onClick={() => onScegli(k)}
        className={`rounded-full px-3 py-1 font-semibold ${
          periodo === k
            ? "bg-pa-blu text-white"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {nome}
      </button>
    ))}
  </div>
);

/** Header shared by the main page and the detail pages: name, period, month picker, data date. */
export const Testata = ({
  p,
  scegli,
  titolo = "Imperia Sanremo",
  sinistra,
  periodo,
  onPeriodo,
}: {
  p: DatiCruscotto;
  scegli: (mese: string) => void;
  titolo?: string;
  sinistra?: ReactNode;
  /** main page only: with "anno" the month picker is hidden (the figures run from January to the data date) */
  periodo?: Periodo;
  onPeriodo?: (p: Periodo) => void;
}) => (
  <div className="flex flex-col gap-2">
    {sinistra}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold text-pa-blu">{titolo}</h1>
      <div className="flex flex-wrap items-center gap-3">
        {periodo && onPeriodo && (
          <SceltaPeriodo periodo={periodo} onScegli={onPeriodo} />
        )}
        {periodo !== "anno" && p.mesiAnno.length > 1 && (
          <ScegliMese mesi={p.mesiAnno} scelto={p.m.mese} onScegli={scegli} />
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className="inline-block h-2 w-2 rounded-full bg-pa-verde"
          aria-hidden
        />
        Dati al {dataIt(p.data.data_dati)}, aggiornati il {p.aggiornato}
      </div>
    </div>
  </div>
);

const Pagina = ({
  p,
  ricerca,
  periodo,
}: {
  p: DatiCruscotto;
  ricerca: string;
  periodo: Periodo;
}) => {
  const vita = useBlocchi<VitaMese, VitaInfo>("vita");
  const info = vita.data?.info;
  const vitaMesi = vita.data?.mesi ?? {};
  const lista = vendite(p, periodo, info, vitaMesi);
  const av = p.v.avanzo;
  const o = p.obiettivo;
  const f = p.fiscaleSpiega;
  const perVendite =
    periodo === "anno"
      ? `dal 1/1 al ${dataIt(p.data.data_dati)}, contro lo stesso periodo del ${p.annoN - 1}`
      : `${periodoMese(p.m)}, contro lo stesso periodo del ${p.annoN - 1}`;
  return (
    <>
      <DaDecidere />
      <Fascia
        titolo="Come vendiamo"
        sotto={perVendite}
        destra={<LegendaBarre anno={p.annoN} />}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {lista.map((x) => {
            const { diff, pct } = variazione(x.ac, x.ap);
            return (
              <Scheda
                key={x.chiave}
                voce={x.voce}
                ricerca={ricerca}
                titolo={x.titolo}
                valore={x.valore}
                spiega={x.spiega}
                etichetta={x.etichetta}
                spiegaEtichetta={x.spiegaEtichetta}
                allarme={inAllarme(pct)}
                differenza={
                  <Differenza
                    diff={diff}
                    pct={pct}
                    testo={`sul ${p.annoN - 1}`}
                    spiega={x.spiegaDiff}
                  />
                }
                righe={x.righe}
                sotto={
                  <BarreMesi
                    punti={x.punti}
                    anno={p.annoN}
                    etichetta={x.titolo}
                    evidenzia={periodo === "mese" ? p.m.mese : undefined}
                  />
                }
              />
            );
          })}
        </div>
        {periodo === "anno" && (
          <p className="hidden text-xs text-muted-foreground sm:block">
            Le barrette degli incassi vengono dal giornale di cassa mese per
            mese (NA013); il totale da gennaio usa NA302 per i mesi chiusi, come
            la mail della compagnia: per questo la somma delle barrette non è
            identica al numero.
          </p>
        )}
      </Fascia>
      <Fascia titolo="Soldi e risultato">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          <Scheda
            voce="avanzo"
            ricerca={ricerca}
            titolo="Saldo del conto premi"
            valore={euro(av.valore)}
            spiega={spiegaAvanzo(av, p.saldiMese, p.movimentiAvanzo)}
            etichetta="oggi"
            spiegaEtichetta="Ultima riga del foglio Saldi, non dipende dal periodo scelto."
            allarme={av.valore < 0}
            valoreRosso={av.valore < 0}
            righe={
              av.prec_valore != null && (
                <span>
                  il {dataIt(av.prec_data)} era {euro(av.prec_valore)}
                </span>
              )
            }
          />
          {o && f && (
            <Scheda
              voce="utile-fiscale"
              ricerca={ricerca}
              titolo="Utile fiscale previsto a dicembre"
              valore={euro(o.previsto)}
              spiega={spiegaUtileFiscale(f)}
              etichetta="misto"
              spiegaEtichetta="Entrate per competenza (provvigioni maturate), costi per cassa (pagamenti dalla banca). Previsione a dicembre, non dipende dal periodo scelto."
              righe={
                <>
                  <span>
                    {o.mancanti > 0 ? (
                      <>
                        mancano{" "}
                        <Spiegato spiega={spiegaObiettivo(f)}>
                          {euro(o.mancanti)}
                        </Spiegato>{" "}
                        di costi per l'obiettivo di {euro(o.obiettivo)}
                      </>
                    ) : (
                      <>obiettivo di {euro(o.obiettivo)} raggiunto</>
                    )}
                  </span>
                  {o.conPrevisti != null && (
                    <span>
                      coi costi previsti da Fabio{" "}
                      <Forse spiega={p.conPrevisti}>
                        {euro(o.conPrevisti)}
                      </Forse>
                      {o.sopra != null &&
                        (o.sopra >= 0
                          ? `, ${euro(o.sopra)} sopra l'obiettivo`
                          : `, mancano ancora ${euro(-o.sopra)}`)}
                    </span>
                  )}
                </>
              }
              sotto={
                <BarraObiettivo
                  previsto={o.previsto}
                  obiettivo={o.obiettivo}
                  conPrevisti={o.conPrevisti}
                />
              }
            />
          )}
        </div>
      </Fascia>
      <Mix p={p} periodo={periodo} info={info} vitaMesi={vitaMesi} />
    </>
  );
};

export const Cruscotto = () => {
  const { q, dati, scegli, ricerca } = useDatiCruscotto();
  const [parametri, setParametri] = useSearchParams();
  // a month in the address (back from a detail page) means the month view; otherwise from January
  const periodo: Periodo =
    parametri.get("periodo") === "mese" ||
    (parametri.get("periodo") == null && parametri.get("mese") != null)
      ? "mese"
      : "anno";
  const scegliPeriodo = (nuovo: Periodo) => {
    const x = new URLSearchParams(parametri);
    x.set("periodo", nuovo);
    setParametri(x, { replace: true });
  };
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  if (!dati)
    return (
      <div className="p-4 text-muted-foreground">
        Nessun dato ancora: l'agente non ha ancora girato.
      </div>
    );
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-28 pt-4 md:px-0 md:pb-8 md:pt-0">
      <Testata
        p={dati}
        scegli={scegli}
        periodo={periodo}
        onPeriodo={scegliPeriodo}
      />
      {dati.data.avvisi && dati.data.avvisi.length > 0 && (
        <div className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm dark:bg-amber-950">
          ⚠ {dati.data.avvisi.join(" · ")}
        </div>
      )}
      <Pagina p={dati} ricerca={ricerca} periodo={periodo} />
      <p className="text-xs text-muted-foreground">
        Passa sopra (o tocca) un numero per vedere il calcolo; tocca il riquadro
        per aprire il dettaglio.
      </p>
    </div>
  );
};

export default Cruscotto;
