/**
 * Month picker of the main page (Fabio, 18/11/2026): "how do I pick the different months" and "I always need the
 * difference between what we collected up to today in the current month and the same period of the same month last
 * year" (collected = total commissions). The agent writes one entry per month of the year in valori.mesi
 * (calcolo.mesi_anno): current month from the 1st to the data date against the same days of last year, closed
 * months whole against whole. The total of the previous month is no longer shown (Fabio: not interesting).
 */
import { euro, euroSegno, Riquadro } from "./Riquadro";
import { type Spiegazione, Spiegato } from "./Spiega";
import {
  meseSolo,
  periodoAnnoPrima,
  spiegaDeltaMese,
  spiegaDifferenzaProvv,
  spiegaIncassiMese,
  spiegaMancano,
  spiegaProvv,
  spiegaProvvAp,
  spiegaQuota,
} from "./spiegaCruscotto";

/** Wraps a number in its explanation when there is one. */
const Forse = ({
  spiega,
  children,
}: {
  spiega?: Spiegazione;
  children: React.ReactNode;
}) => (spiega ? <Spiegato spiega={spiega}>{children}</Spiegato> : children);

type DeltaMese = {
  np: number;
  ann: number;
  delta: number;
  np_pezzi: number;
  ann_pezzi: number;
  delta_pezzi: number;
};
export interface MeseRiepilogo {
  mese: string;
  fino_al: string;
  parziale: boolean;
  provv: number;
  provv_ap: number;
  differenza: number;
  cresc: number | null;
  /** whole month of last year and what is still to come if this year ends like it (18/11/2026 call) */
  provv_ap_mese?: number;
  mancano?: number;
  incassi_auto: number;
  incassi_re: number;
  incassi_auto_ap: number;
  incassi_re_ap: number;
  delta_auto: DeltaMese;
  delta_auto_ap: DeltaMese;
  delta_re: DeltaMese;
  delta_re_ap: DeltaMese;
  /** 22/11/2026: commissions of the month line by line (rows written before that day do not have them). */
  provv_linee?: Record<string, LineaProvv>;
  provv_linee_ap?: Record<string, LineaProvv>;
}
export interface LineaProvv {
  provv: number;
  titoli: number;
}
export type { DeltaMese };

// month names live in spiegaCruscotto.ts (no import cycle with the explanations); re-exported for the other pages
export { meseSolo, periodoAnnoPrima };
const giorno = (iso: string): number => parseInt(iso.slice(8, 10), 10);
const pct = (v: number | null): string =>
  v == null
    ? "n.d."
    : `${v >= 0 ? "+" : ""}${v.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;

export interface ScegliMeseProps {
  mesi: MeseRiepilogo[];
  scelto: string;
  onScegli: (mese: string) => void;
}

export const ScegliMese = ({ mesi, scelto, onScegli }: ScegliMeseProps) => (
  <label className="flex items-center gap-2 text-sm">
    <span className="text-muted-foreground">Mese</span>
    <select
      className="rounded-md border bg-card px-2 py-1 text-sm font-medium"
      value={scelto}
      onChange={(e) => onScegli(e.target.value)}
    >
      {[...mesi].reverse().map((m) => (
        <option key={m.mese} value={m.mese}>
          {meseSolo(m.mese)} {m.mese.slice(0, 4)}
          {m.parziale ? ` (fino al ${giorno(m.fino_al)})` : ""}
        </option>
      ))}
    </select>
  </label>
);

/** Difference in euro in a pill, with arrow and word (never colour alone). */
const Differenza = ({
  valore,
  testo,
  spiega,
}: {
  valore: number;
  testo: string;
  spiega?: Spiegazione;
}) => {
  const su = valore >= 0;
  return (
    <span
      className={`self-start rounded-full px-2.5 py-0.5 font-medium ${
        su
          ? "bg-pa-verde-chiaro text-pa-verde"
          : "bg-pa-rosso-chiaro text-pa-rosso"
      }`}
    >
      {su ? "▲" : "▼"} <Forse spiega={spiega}>{euroSegno(valore)}</Forse>{" "}
      {testo}
    </span>
  );
};

const giorniDelMese = (aaaaMm: string): number =>
  new Date(
    parseInt(aaaaMm.slice(0, 4), 10),
    parseInt(aaaaMm.slice(5, 7), 10),
    0,
  ).getDate();

/** Running month: "novembre 2025 intero" and how much is still to come, with a bar of the share reached. */
const AncoraDaFare = ({ m }: { m: MeseRiepilogo }) => {
  if (m.provv_ap_mese == null || m.mancano == null) return null;
  const quota =
    m.provv_ap_mese > 0 ? Math.min(1, m.provv / m.provv_ap_mese) : 1;
  const annoPrima = parseInt(m.mese.slice(0, 4), 10) - 1;
  return (
    <div className="mt-1 flex flex-col gap-1">
      <span className="font-semibold text-foreground">
        {meseSolo(m.mese)} {annoPrima} intero {euro(m.provv_ap_mese)}
        {m.mancano > 0 ? ": mancano " : ": superato di "}
        <Forse spiega={spiegaMancano(m)}>{euro(Math.abs(m.mancano))}</Forse>
      </span>
      <div
        className="h-2.5 w-full rounded-full bg-muted overflow-hidden"
        role="img"
        aria-label={`fatto il ${Math.round(quota * 100)}% del ${meseSolo(m.mese)} ${annoPrima}`}
      >
        <div
          className="h-full rounded-full bg-pa-blu"
          style={{ width: `${quota * 100}%` }}
        />
      </div>
      <span className="text-muted-foreground">
        <Forse spiega={spiegaQuota(m)}>{Math.round(quota * 100)}% fatto</Forse>,
        giorno {giorno(m.fino_al)} di {giorniDelMese(m.mese)}
      </span>
    </div>
  );
};

export const RiquadroProvvigioniMese = ({
  m,
  serie,
}: {
  m: MeseRiepilogo;
  serie?: number[];
}) => (
  <Riquadro
    titolo={`Provvigioni di ${meseSolo(m.mese)}${m.parziale ? ` fino al ${giorno(m.fino_al)}` : ""}`}
    valore={euro(m.provv)}
    colore={m.differenza >= 0 ? "verde" : "rosso"}
    serie={serie}
    etichettaSerie="Provvigioni degli ultimi 12 mesi"
    spiega={spiegaProvv(m)}
  >
    <Differenza
      valore={m.differenza}
      testo={`sul ${parseInt(m.mese.slice(0, 4), 10) - 1}`}
      spiega={spiegaDifferenzaProvv(m)}
    />
    <span className="text-muted-foreground">
      {periodoAnnoPrima(m)}:{" "}
      <Spiegato spiega={spiegaProvvAp(m)}>{euro(m.provv_ap)}</Spiegato> (
      <Spiegato spiega={spiegaDifferenzaProvv(m)}>{pct(m.cresc)}</Spiegato>)
    </span>
    {m.parziale && <AncoraDaFare m={m} />}
  </Riquadro>
);

type RigaConfronto = [
  string,
  (m: MeseRiepilogo) => string,
  ((m: MeseRiepilogo) => Spiegazione)?,
];
const RIGHE_CONFRONTO: RigaConfronto[] = [
  ["Provvigioni", (m) => euro(m.provv), spiegaProvv],
  ["Stesso periodo un anno prima", (m) => euro(m.provv_ap), spiegaProvvAp],
  ["Differenza", (m) => euroSegno(m.differenza), spiegaDifferenzaProvv],
  [
    "Incassi auto",
    (m) => euro(m.incassi_auto),
    (m) => spiegaIncassiMese(m, "auto"),
  ],
  ["Incassi RE", (m) => euro(m.incassi_re), (m) => spiegaIncassiMese(m, "re")],
  [
    "Delta auto",
    (m) => euroSegno(m.delta_auto.delta),
    (m) => spiegaDeltaMese("Delta auto", m, "delta_auto"),
  ],
  [
    "Delta RE",
    (m) => euroSegno(m.delta_re.delta),
    (m) => spiegaDeltaMese("Delta RE", m, "delta_re"),
  ],
];

/** Two months side by side (proposed in the 18/11/2026 call): same figures, picked with two menus. */
export const ConfrontoMesi = ({
  mesi,
  primo,
  secondo,
  onPrimo,
  onSecondo,
}: {
  mesi: MeseRiepilogo[];
  primo: string;
  secondo: string;
  onPrimo: (mese: string) => void;
  onSecondo: (mese: string) => void;
}) => {
  const a = mesi.find((m) => m.mese === primo) ?? mesi[mesi.length - 1];
  const b = mesi.find((m) => m.mese === secondo) ?? mesi[0];
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        <ScegliMese mesi={mesi} scelto={a.mese} onScegli={onPrimo} />
        <ScegliMese mesi={mesi} scelto={b.mese} onScegli={onSecondo} />
      </div>
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-muted-foreground">
            <th />
            {[a, b].map((m, i) => (
              <th key={i} className="py-1 pl-2 text-right font-medium">
                {meseSolo(m.mese)} {m.mese.slice(0, 4)}
                {m.parziale ? ` (fino al ${giorno(m.fino_al)})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RIGHE_CONFRONTO.map(([nome, valore, spiega]) => (
            <tr key={nome} className="border-t">
              <td className="py-1.5 pr-2">{nome}</td>
              {[a, b].map((m, i) => (
                <td key={i} className="py-1.5 pl-2 text-right">
                  <Forse spiega={spiega?.(m)}>{valore(m)}</Forse>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground">
        Il mese in corso è fino a ieri. Delta = nuova produzione meno
        annullamenti.
      </p>
    </div>
  );
};
