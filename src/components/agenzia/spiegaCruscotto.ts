/**
 * Explanations of the main page numbers (Lorenzo 22/11/2026: every number says what it is, how it is calculated and
 * where it comes from, and opens the list of the rows behind it). Pure functions: the tests check that every list adds
 * up to the number on the page.
 */
import type { DeltaMese, LineaProvv, MeseRiepilogo } from "./MeseCruscotto";
import type { Cella, RigaCalcolo, Spiegazione } from "./Spiega";

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
export const nomeMese = (aaaaMm: string): string =>
  MESI[parseInt(aaaaMm.slice(5, 7), 10) - 1];

/** "dal 1 al 17 novembre 2025" for the running month, "novembre 2025" for a closed one. */
export const periodoAnnoPrima = (m: MeseRiepilogo): string => {
  const annoPrima = parseInt(m.mese.slice(0, 4), 10) - 1;
  return m.parziale
    ? `dal 1 al ${parseInt(m.fino_al.slice(8, 10), 10)} ${nomeMese(m.mese)} ${annoPrima}`
    : `${nomeMese(m.mese)} ${annoPrima}`;
};

const BO = "BusinessObjects di Vittoria";
const NOMI_LINEE: Record<string, string> = {
  auto: "Auto",
  re: "Rami elementari",
  tr: "Trasporti",
  sp: "Rami speciali",
  vita: "Vita",
  altro: "Altro",
};
const ORDINE_LINEE = ["auto", "re", "tr", "sp", "vita", "altro"];
/** Below this the list and the number are the same figure (cent roundings of month by month sums). */
const CENTESIMO = 0.05;

export const tondo = (v: number): number => Math.round(v * 100) / 100;
const somma = (v: number[]): number => tondo(v.reduce((a, b) => a + b, 0));
export const dataBreve = (iso: string | null | undefined): string =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "n.d.";
export const pct = (v: number | null): string =>
  v == null
    ? "n.d."
    : `${v >= 0 ? "+" : ""}${v.toLocaleString("it-IT", { maximumFractionDigits: 2 })}%`;
const pezzi = (n: number): string => n.toLocaleString("it-IT");
const giorno = (iso: string): number => parseInt(iso.slice(8, 10), 10);
const anno = (m: MeseRiepilogo): number => parseInt(m.mese.slice(0, 4), 10);

/** "dal 1 al 21 novembre 2026" for the running month, "novembre 2026" for a closed one. */
export const periodoMese = (m: MeseRiepilogo): string =>
  m.parziale
    ? `dal 1 al ${giorno(m.fino_al)} ${nomeMese(m.mese)} ${anno(m)}`
    : `${nomeMese(m.mese)} ${anno(m)}`;

const linee = (l: Record<string, LineaProvv> | undefined): string[] =>
  Object.keys(l ?? {}).sort(
    (a, b) => ORDINE_LINEE.indexOf(a) - ORDINE_LINEE.indexOf(b),
  );

const calcoloLinee = (
  l: Record<string, LineaProvv> | undefined,
  totale: number,
): RigaCalcolo[] => {
  if (!l || Object.keys(l).length === 0)
    return [{ voce: "Totale", valore: totale, segno: "=" }];
  return [
    ...linee(l).map(
      (k): RigaCalcolo => ({
        voce: `${NOMI_LINEE[k] ?? k} (${pezzi(l[k].titoli)} titoli)`,
        valore: l[k].provv,
        segno: "+",
      }),
    ),
    { voce: "Provvigioni", valore: totale, segno: "=" },
  ];
};

const elencoLinee = (m: MeseRiepilogo) => {
  const a = m.provv_linee ?? {};
  const b = m.provv_linee_ap ?? {};
  const chiavi = [...new Set([...linee(a), ...linee(b)])].sort(
    (x, y) => ORDINE_LINEE.indexOf(x) - ORDINE_LINEE.indexOf(y),
  );
  const righe: Cella[][] = chiavi.map((k) => [
    NOMI_LINEE[k] ?? k,
    pezzi(a[k]?.titoli ?? 0),
    a[k]?.provv ?? 0,
    b[k]?.provv ?? 0,
    tondo((a[k]?.provv ?? 0) - (b[k]?.provv ?? 0)),
  ]);
  return {
    titolo: `Provvigioni ${periodoMese(m)}, ramo per ramo, contro ${periodoAnnoPrima(m)}`,
    colonne: [
      "Ramo",
      "Titoli",
      String(anno(m)),
      String(anno(m) - 1),
      "Differenza",
    ],
    righe,
    totale: [
      "Totale",
      pezzi(chiavi.reduce((s, k) => s + (a[k]?.titoli ?? 0), 0)),
      m.provv,
      m.provv_ap,
      m.differenza,
    ],
    nota: "Il ramo e' quello del titolo: le provvigioni degli infortuni del conducente restano nell'auto.",
  };
};

const FONTE_PROVV = `${BO}, titoli incassati: report NA013 (danni) e NA016 (vita), per data del giornale di cassa`;
const COSA_PROVV =
  "Provvigioni di acquisto piu' provvigioni di incasso sui titoli incassati da tutta l'agenzia 346.";

export const spiegaProvv = (m: MeseRiepilogo): Spiegazione => ({
  titolo: `Provvigioni ${periodoMese(m)}`,
  cosa: COSA_PROVV,
  calcolo: calcoloLinee(m.provv_linee, m.provv),
  fonte: FONTE_PROVV,
  elenco: m.provv_linee ? elencoLinee(m) : undefined,
});

export const spiegaProvvAp = (m: MeseRiepilogo): Spiegazione => ({
  titolo: `Provvigioni ${periodoAnnoPrima(m)}`,
  cosa: `${COSA_PROVV} Stessi giorni dell'anno prima, per confrontare alla pari.`,
  calcolo: calcoloLinee(m.provv_linee_ap, m.provv_ap),
  fonte: FONTE_PROVV,
  elenco: m.provv_linee_ap ? elencoLinee(m) : undefined,
});

export const spiegaDifferenzaProvv = (m: MeseRiepilogo): Spiegazione => ({
  titolo: `Differenza sul ${anno(m) - 1}`,
  cosa: `Provvigioni ${periodoMese(m)} meno quelle ${periodoAnnoPrima(m)}.`,
  calcolo: [
    { voce: periodoMese(m), valore: m.provv },
    { voce: periodoAnnoPrima(m), valore: m.provv_ap, segno: "-" },
    { voce: "Differenza", valore: m.differenza, segno: "=" },
    {
      voce: "In percentuale (differenza diviso anno prima)",
      valore: pct(m.cresc),
    },
  ],
  fonte: FONTE_PROVV,
  elenco: m.provv_linee ? elencoLinee(m) : undefined,
});

export const spiegaMancano = (m: MeseRiepilogo): Spiegazione | undefined =>
  m.provv_ap_mese == null || m.mancano == null
    ? undefined
    : {
        titolo: `Quanto manca per fare come ${nomeMese(m.mese)} ${anno(m) - 1}`,
        cosa: `Provvigioni di tutto ${nomeMese(m.mese)} ${anno(m) - 1} meno quelle fatte finora: su quanto si puo' ancora contare se il mese finisce come l'anno scorso.`,
        calcolo: [
          {
            voce: `${nomeMese(m.mese)} ${anno(m) - 1} intero`,
            valore: m.provv_ap_mese,
          },
          { voce: periodoMese(m), valore: m.provv, segno: "-" },
          {
            voce: m.mancano >= 0 ? "Mancano" : "Superato di",
            valore: Math.abs(m.mancano),
            segno: "=",
          },
        ],
        fonte: FONTE_PROVV,
      };

// ------------------------------------------------------------------ incassi from January

interface Parte {
  dal: string;
  al: string;
  auto: number;
  re: number;
  ic: number;
  na302_auto?: number;
  na302_re?: number;
}
export interface Incassi {
  auto: number;
  re: number;
  totale: number;
  auto_ap: number;
  re_ap: number;
  totale_ap: number;
  cresc_auto: number | null;
  cresc_re: number | null;
  cresc_totale: number | null;
  fino_a_mese_chiuso?: string | null;
  /** 22/11/2026: the two parts of the figure (closed months from the company report, then the titles). */
  parti?: {
    chiusi: Parte | null;
    chiusi_ap: Parte | null;
    dopo: Parte | null;
    dopo_ap: Parte | null;
  };
}

const intervallo = (p: Parte): string =>
  `${dataBreve(p.dal)}-${dataBreve(p.al)}`;

const righeParti = (
  chiusi: Parte | null,
  dopo: Parte | null,
  etichetta: string,
  auto: number,
  re: number,
): Cella[][] => {
  const out: Cella[][] = [];
  if (chiusi) {
    out.push([
      `${etichetta}, ${intervallo(chiusi)}: report NA302 della compagnia (mesi chiusi)`,
      chiusi.na302_auto ?? chiusi.auto,
      chiusi.na302_re ?? chiusi.re,
      tondo(
        (chiusi.na302_auto ?? chiusi.auto) + (chiusi.na302_re ?? chiusi.re),
      ),
    ]);
    out.push([
      "infortuni del conducente: dall'auto al RE, come fa Vittoria",
      -chiusi.ic,
      chiusi.ic,
      0,
    ]);
  }
  if (dopo)
    out.push([
      `${etichetta}, ${intervallo(dopo)}: titoli incassati (NA013), infortuni del conducente gia' nel RE`,
      dopo.auto,
      dopo.re,
      tondo(dopo.auto + dopo.re),
    ]);
  out.push([`= ${etichetta}`, auto, re, tondo(auto + re)]);
  return out;
};

export const spiegaIncassi = (
  inc: Incassi,
  annoDati: number,
  datiAl: string,
): Spiegazione => {
  const p = inc.parti;
  const calcolo: RigaCalcolo[] = p
    ? [
        ...(p.chiusi
          ? [
              {
                voce: `Auto ${intervallo(p.chiusi)} (compagnia)`,
                valore: p.chiusi.auto,
                segno: "+" as const,
              },
            ]
          : []),
        ...(p.dopo
          ? [
              {
                voce: `Auto ${intervallo(p.dopo)} (titoli)`,
                valore: p.dopo.auto,
                segno: "+" as const,
              },
            ]
          : []),
        ...(p.chiusi
          ? [
              {
                voce: `RE ${intervallo(p.chiusi)} (compagnia)`,
                valore: p.chiusi.re,
                segno: "+" as const,
              },
            ]
          : []),
        ...(p.dopo
          ? [
              {
                voce: `RE ${intervallo(p.dopo)} (titoli)`,
                valore: p.dopo.re,
                segno: "+" as const,
              },
            ]
          : []),
        { voce: "Incassi da gennaio", valore: inc.totale, segno: "=" },
      ]
    : [
        { voce: "Auto", valore: inc.auto, segno: "+" },
        { voce: "Rami elementari", valore: inc.re, segno: "+" },
        { voce: "Incassi da gennaio", valore: inc.totale, segno: "=" },
      ];
  return {
    titolo: `Incassi da inizio ${annoDati}`,
    cosa: `Premi incassati da tutta l'agenzia 346 dal 1 gennaio al ${dataBreve(datiAl)}, auto e rami elementari, come li conta Vittoria (gli infortuni del conducente stanno nel RE, i Trasporti fuori). I mesi chiusi vengono dal report della compagnia, il mese in corso dai titoli incassati.`,
    calcolo,
    fonte: `${BO}: NA302 per i mesi chiusi, NA013 per il mese in corso`,
    elenco: p
      ? {
          titolo: `Incassi da gennaio ${annoDati} e ${annoDati - 1}`,
          colonne: ["Parte", "Auto", "RE", "Totale"],
          righe: [
            ...righeParti(p.chiusi, p.dopo, String(annoDati), inc.auto, inc.re),
            ...righeParti(
              p.chiusi_ap,
              p.dopo_ap,
              `${annoDati - 1}, stesso periodo`,
              inc.auto_ap,
              inc.re_ap,
            ),
          ],
          nota: "Le righe con = sono i totali del riquadro.",
        }
      : undefined,
  };
};

export const spiegaCrescita = (
  nome: string,
  ac: number,
  ap: number,
  cresc: number | null,
  annoDati: number,
): Spiegazione => ({
  titolo: `${nome}: crescita sul ${annoDati - 1}`,
  cosa: `Incassi ${nome.toLowerCase()} da gennaio contro lo stesso periodo dell'anno prima.`,
  calcolo: [
    { voce: `${nome} ${annoDati}`, valore: ac },
    { voce: `${nome} ${annoDati - 1}`, valore: ap, segno: "-" },
    { voce: "Differenza", valore: tondo(ac - ap), segno: "=" },
    {
      voce: `Diviso ${nome.toLowerCase()} ${annoDati - 1}`,
      valore: pct(cresc),
    },
  ],
  fonte: `${BO}: NA302 per i mesi chiusi, NA013 per il mese in corso`,
});

export const spiegaIncassiMese = (
  m: MeseRiepilogo,
  ramo: "auto" | "re",
): Spiegazione => {
  const ac = ramo === "auto" ? m.incassi_auto : m.incassi_re;
  const ap = ramo === "auto" ? m.incassi_auto_ap : m.incassi_re_ap;
  const nome = ramo === "auto" ? "Incassi auto" : "Incassi RE";
  return {
    titolo: `${nome} ${periodoMese(m)}`,
    cosa: `Premi dei titoli incassati nel mese da tutta l'agenzia 346, come li conta Vittoria: ${ramo === "auto" ? "senza gli infortuni del conducente, che vanno nel RE" : "con gli infortuni del conducente delle polizze auto"}.`,
    calcolo: [
      { voce: periodoMese(m), valore: ac },
      { voce: periodoAnnoPrima(m), valore: ap, segno: "-" },
      { voce: "Differenza", valore: tondo(ac - ap), segno: "=" },
    ],
    fonte: `${BO}, report NA013 (titoli incassati), per data del giornale di cassa`,
  };
};

// ------------------------------------------------------------------ delta auto and RE

export interface DeltaLinea {
  mese: DeltaMese;
  mese_ap: DeltaMese;
  ytd: DeltaMese;
  ytd_ap: DeltaMese;
}
type ChiaveDelta = "delta_auto" | "delta_re";

const FONTE_DELTA = `${BO}, report NA108 (movimentazione del portafoglio), premio imponibile`;
const cosaDelta = (auto: boolean): string =>
  `Nuova produzione (polizze nuove, sostituzioni, appendici tecniche) meno annullamenti, in premio imponibile.${
    auto
      ? " Senza gli infortuni del conducente, che Vittoria conta nel RE."
      : " Con gli infortuni del conducente delle polizze auto."
  }`;

const calcoloDelta = (d: DeltaMese): RigaCalcolo[] => [
  {
    voce: `Nuova produzione (${pezzi(d.np_pezzi)} polizze nuove)`,
    valore: d.np,
  },
  {
    voce: `Annullamenti (${pezzi(d.ann_pezzi)} polizze perse)`,
    valore: d.ann,
    segno: "+",
  },
  { voce: "Delta", valore: d.delta, segno: "=" },
];

const elencoDelta = (
  mesi: MeseRiepilogo[],
  chiave: ChiaveDelta,
  ytd: DeltaMese,
  nome: string,
) => {
  const righe: Cella[][] = mesi.map((m) => [
    `${nomeMese(m.mese)}${m.parziale ? ` (fino al ${giorno(m.fino_al)})` : ""}`,
    m[chiave].np,
    m[chiave].ann,
    m[chiave].delta,
    `${m[chiave].delta_pezzi >= 0 ? "+" : ""}${m[chiave].delta_pezzi}`,
  ]);
  const tot = somma(mesi.map((m) => m[chiave].delta));
  const scarto = tondo(tot - ytd.delta);
  return {
    titolo: `${nome} mese per mese`,
    colonne: ["Mese", "Nuova produzione", "Annullamenti", "Delta", "Polizze"],
    righe,
    totale: [
      "Da gennaio",
      somma(mesi.map((m) => m[chiave].np)),
      somma(mesi.map((m) => m[chiave].ann)),
      tot,
      `${ytd.delta_pezzi >= 0 ? "+" : ""}${ytd.delta_pezzi}`,
    ],
    nota:
      scarto !== 0 && Math.abs(scarto) <= CENTESIMO
        ? `La somma dei mesi differisce di ${Math.abs(scarto).toLocaleString("it-IT", { minimumFractionDigits: 2 })} euro dal riquadro (${ytd.delta.toLocaleString("it-IT", { minimumFractionDigits: 2 })}): arrotondamenti dei centesimi mese per mese.`
        : undefined,
  };
};

export const spiegaDeltaYtd = (
  nome: string,
  d: DeltaLinea,
  mesi: MeseRiepilogo[],
  chiave: ChiaveDelta,
  datiAl: string,
): Spiegazione => ({
  titolo: `${nome} da gennaio al ${dataBreve(datiAl)}`,
  cosa: cosaDelta(chiave === "delta_auto"),
  calcolo: calcoloDelta(d.ytd),
  fonte: FONTE_DELTA,
  elenco: elencoDelta(mesi, chiave, d.ytd, nome),
});

export const spiegaPolizze = (nome: string, d: DeltaMese): Spiegazione => ({
  titolo: `${nome}: polizze in piu' o in meno`,
  cosa: "Polizze nuove meno polizze annullate (le sostituzioni non cambiano il numero).",
  calcolo: [
    { voce: "Polizze nuove", valore: pezzi(d.np_pezzi) },
    { voce: "Polizze perse", valore: pezzi(d.ann_pezzi), segno: "-" },
    {
      voce: "Saldo",
      valore: `${d.delta_pezzi >= 0 ? "+" : ""}${pezzi(d.delta_pezzi)}`,
      segno: "=",
    },
  ],
  fonte: FONTE_DELTA,
});

export const spiegaDeltaAnnoPrima = (
  nome: string,
  d: DeltaLinea,
  annoDati: number,
): Spiegazione => ({
  titolo: `${nome} ${annoDati - 1}, stesso periodo`,
  cosa: cosaDelta(nome.toLowerCase().includes("auto")),
  calcolo: calcoloDelta(d.ytd_ap),
  fonte: FONTE_DELTA,
});

export const spiegaDeltaMese = (
  nome: string,
  m: MeseRiepilogo,
  chiave: ChiaveDelta,
): Spiegazione => ({
  titolo: `${nome} ${periodoMese(m)}`,
  cosa: cosaDelta(chiave === "delta_auto"),
  calcolo: calcoloDelta(m[chiave]),
  fonte: FONTE_DELTA,
});

// ------------------------------------------------------------------ surplus of the premium account

export const spiegaAvanzo = (
  av: {
    valore: number;
    data: string | null;
    prec_valore: number | null;
    prec_data: string | null;
  },
  saldiMese: [string, number][],
): Spiegazione => ({
  titolo: "Avanzo del conto premi",
  cosa: "Saldo del conto separato dei premi secondo il foglio Saldi, all'ultima riga con un movimento vero (sotto ci sono righe che ripetono il saldo). Negativo = il conto ha anticipato soldi.",
  calcolo: [
    { voce: `Saldo al ${dataBreve(av.data)}`, valore: av.valore, segno: "=" },
    ...(av.prec_valore != null
      ? [
          {
            voce: `Saldo al ${dataBreve(av.prec_data)}`,
            valore: av.prec_valore,
          },
          {
            voce: "Cambiato di",
            valore: tondo(av.valore - av.prec_valore),
          },
        ]
      : []),
  ],
  fonte: "foglio Saldi (Saldi.xlsx su Drive di fattureagenzia), colonna G",
  elenco:
    saldiMese.length > 0
      ? {
          titolo: "Saldo del conto premi a fine mese",
          colonne: ["Mese", "Saldo"],
          righe: saldiMese.map(([m, v]) => [
            `${nomeMese(m)} ${m.slice(0, 4)}`,
            v,
          ]),
          nota: "Un saldo non si somma: l'elenco mostra come e' cambiato mese per mese. Il mese in corso e' all'ultimo movimento.",
        }
      : undefined,
});

// ------------------------------------------------------------------ expected taxable profit

export interface FiscaleCruscotto {
  dal: string;
  al: string;
  mesi_usati: number;
  obiettivo?: number;
  soglia: number;
  obiettivo_da?: string;
  costi_mancanti?: number;
  utile_fiscale_con_previsti?: number;
  sopra_obiettivo?: number;
  costi_previsti?: {
    totale: number;
    voci: {
      voce: string;
      importo: number;
      pagato: number;
      resta: number;
      fonte: string;
    }[];
    nota?: string;
  };
  da_gennaio: { ricavi: number; deducibili: number; utile_fiscale: number };
  proiezione: { ricavi: number; deducibili: number; utile_fiscale: number };
  per_mese: Record<
    string,
    { utile: number; provvigioni: number; utile_fiscale: number }
  >;
}

const FONTE_FISCALE =
  "estratti conto Asti e Desio, foglio Saldi, partite della compagnia (BO), fatture; regole in Per lo studio";

export const spiegaUtileFiscale = (f: FiscaleCruscotto): Spiegazione => {
  const mesi = Object.keys(f.per_mese).sort();
  const tot = somma(mesi.map((m) => f.per_mese[m].utile_fiscale));
  const scarto = tondo(tot - f.da_gennaio.utile_fiscale);
  return {
    titolo: "Utile fiscale previsto a dicembre",
    cosa: `Proiezione dell'anno: media dei mesi completi (${nomeMese(f.dal)}-${nomeMese(f.al)}, ${f.mesi_usati} mesi) per 12, con le voci una tantum contate una volta sola. Da ${nomeMese(f.dal)} a ${nomeMese(f.al)}: ricavi ${f.da_gennaio.ricavi.toLocaleString("it-IT", { minimumFractionDigits: 2 })} meno costi deducibili ${f.da_gennaio.deducibili.toLocaleString("it-IT", { minimumFractionDigits: 2 })} = ${f.da_gennaio.utile_fiscale.toLocaleString("it-IT", { minimumFractionDigits: 2 })}.`,
    calcolo: [
      { voce: "Ricavi previsti", valore: f.proiezione.ricavi },
      {
        voce: "Costi deducibili previsti",
        valore: f.proiezione.deducibili,
        segno: "-",
      },
      {
        voce: "Utile fiscale previsto",
        valore: f.proiezione.utile_fiscale,
        segno: "=",
      },
    ],
    fonte: FONTE_FISCALE,
    elenco: {
      titolo: "Utile fiscale mese per mese",
      colonne: ["Mese", "Provvigioni", "Utile", "Utile fiscale"],
      righe: mesi.map((m) => [
        `${nomeMese(m)} ${m.slice(0, 4)}`,
        f.per_mese[m].provvigioni,
        f.per_mese[m].utile,
        f.per_mese[m].utile_fiscale,
      ]),
      totale: [
        "Da gennaio",
        somma(mesi.map((m) => f.per_mese[m].provvigioni)),
        somma(mesi.map((m) => f.per_mese[m].utile)),
        tot,
      ],
      nota:
        Math.abs(scarto) > 0.005
          ? `Il totale dei mesi differisce di ${scarto.toLocaleString("it-IT", { minimumFractionDigits: 2 })} euro dall'utile fiscale da gennaio (${f.da_gennaio.utile_fiscale.toLocaleString("it-IT", { minimumFractionDigits: 2 })}).`
          : `Totale dei mesi = utile fiscale da ${nomeMese(f.dal)} a ${nomeMese(f.al)}.`,
    },
  };
};

export const spiegaObiettivo = (f: FiscaleCruscotto): Spiegazione => {
  const obiettivo = f.obiettivo ?? f.soglia;
  const mancanti =
    f.costi_mancanti ?? tondo(f.proiezione.utile_fiscale - obiettivo);
  return {
    titolo: "Obiettivo di utile fiscale",
    cosa: `Obiettivo di utile fiscale di Fabio${f.obiettivo_da ? ` (dal ${f.obiettivo_da})` : ""}: oltre questa cifra conviene avere altri costi deducibili.`,
    calcolo: [
      { voce: "Utile fiscale previsto", valore: f.proiezione.utile_fiscale },
      { voce: "Obiettivo", valore: obiettivo, segno: "-" },
      {
        voce: mancanti > 0 ? "Costi che mancano" : "Sotto l'obiettivo di",
        valore: Math.abs(mancanti),
        segno: "=",
      },
    ],
    fonte: "obiettivo detto da Fabio; utile fiscale previsto come sopra",
  };
};

export const spiegaConPrevisti = (
  f: FiscaleCruscotto,
): Spiegazione | undefined => {
  const cp = f.costi_previsti;
  if (!cp || f.utile_fiscale_con_previsti == null) return undefined;
  return {
    titolo: "Utile fiscale coi costi previsti da Fabio",
    cosa: cp.nota ?? "Costi che Fabio prevede di pagare entro dicembre.",
    calcolo: [
      { voce: "Utile fiscale previsto", valore: f.proiezione.utile_fiscale },
      ...cp.voci.map(
        (v): RigaCalcolo => ({ voce: v.voce, valore: v.resta, segno: "-" }),
      ),
      {
        voce: "Coi costi previsti",
        valore: f.utile_fiscale_con_previsti,
        segno: "=",
      },
    ],
    fonte: cp.voci
      .map((v) => v.fonte)
      .filter((x, i, a) => a.indexOf(x) === i)
      .join(", "),
    elenco: {
      titolo: "Costi previsti da Fabio",
      colonne: ["Voce", "Importo", "Gia' pagato", "Resta"],
      righe: cp.voci.map((v) => [v.voce, v.importo, v.pagato, v.resta]),
      totale: [
        "Totale",
        somma(cp.voci.map((v) => v.importo)),
        somma(cp.voci.map((v) => v.pagato)),
        somma(cp.voci.map((v) => v.resta)),
      ],
      nota: "Il previsto scende quando il pagamento compare negli estratti conto.",
    },
  };
};
