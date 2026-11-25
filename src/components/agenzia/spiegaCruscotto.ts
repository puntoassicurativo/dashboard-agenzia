/**
 * Explanations of the main page numbers (Lorenzo 22/11/2026: every number says what it is, how it is calculated and
 * where it comes from, and opens the list of the rows behind it). Pure functions: the tests check that every list adds
 * up to the number on the page.
 */
import type { DeltaMese, LineaProvv, MeseRiepilogo } from "./MeseCruscotto";
import { meseSolo, nomeMeseAnno, numero, tondo } from "./formato";
import type { Cella, Elenco, RigaCalcolo, Spiegazione } from "./Spiega";

/** "dal 1 al 17 novembre 2025" for the running month, "novembre 2025" for a closed one. */
export const periodoAnnoPrima = (m: MeseRiepilogo): string => {
  const annoPrima = parseInt(m.mese.slice(0, 4), 10) - 1;
  return m.parziale
    ? `dal 1 al ${parseInt(m.fino_al.slice(8, 10), 10)} ${meseSolo(m.mese)} ${annoPrima}`
    : `${meseSolo(m.mese)} ${annoPrima}`;
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

export { meseSolo, tondo };
const somma = (v: number[]): number => tondo(v.reduce((a, b) => a + b, 0));
export const dataBreve = (iso: string | null | undefined): string =>
  iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "n.d.";
export const pct = (v: number | null): string =>
  v == null
    ? "n.d."
    : `${v >= 0 ? "+" : ""}${v.toLocaleString("it-IT", { maximumFractionDigits: 2 })}%`;
const pezzi = (n: number): string => numero(n);
const giorno = (iso: string): number => parseInt(iso.slice(8, 10), 10);
const anno = (m: MeseRiepilogo): number => parseInt(m.mese.slice(0, 4), 10);

/** "dal 1 al 21 novembre 2026" for the running month, "novembre 2026" for a closed one. */
export const periodoMese = (m: MeseRiepilogo): string =>
  m.parziale
    ? `dal 1 al ${giorno(m.fino_al)} ${meseSolo(m.mese)} ${anno(m)}`
    : `${meseSolo(m.mese)} ${anno(m)}`;

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
    nota: "Il ramo è quello del titolo: le provvigioni degli infortuni del conducente restano nell'auto.",
  };
};

const FONTE_PROVV = `${BO}, titoli incassati: report NA013 (danni) e NA016 (vita), per data del giornale di cassa`;
const COSA_PROVV =
  "Provvigioni di acquisto più provvigioni di incasso sui titoli incassati da tutta l'agenzia 346.";

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
        titolo: `Quanto manca per fare come ${meseSolo(m.mese)} ${anno(m) - 1}`,
        cosa: `Provvigioni di tutto ${meseSolo(m.mese)} ${anno(m) - 1} meno quelle fatte finora: su quanto si può ancora contare se il mese finisce come l'anno scorso.`,
        calcolo: [
          {
            voce: `${meseSolo(m.mese)} ${anno(m) - 1} intero`,
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

export const spiegaQuota = (m: MeseRiepilogo): Spiegazione | undefined =>
  m.provv_ap_mese == null || m.provv_ap_mese <= 0
    ? undefined
    : {
        titolo: `Quanto è fatto di ${meseSolo(m.mese)} ${anno(m) - 1}`,
        cosa: `Provvigioni fatte finora diviso le provvigioni di tutto ${meseSolo(m.mese)} ${anno(m) - 1}. Accanto, il giorno del mese a cui arrivano i dati.`,
        calcolo: [
          { voce: periodoMese(m), valore: m.provv },
          {
            voce: `${meseSolo(m.mese)} ${anno(m) - 1} intero`,
            valore: m.provv_ap_mese,
            segno: ":",
          },
          {
            voce: "Fatto",
            valore: `${((m.provv / m.provv_ap_mese) * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`,
            segno: "=",
          },
        ],
        fonte: FONTE_PROVV,
      };

/**
 * Cruscotto in "Da gennaio" (proposal of 25/11/2026): the months of the year added up, each against the same period of
 * the year before (the running month up to yesterday in both years).
 */
export const spiegaProvvYtd = (mesi: MeseRiepilogo[]): Spiegazione => {
  const ultimo = mesi[mesi.length - 1];
  const a = anno(ultimo);
  const ac = somma(mesi.map((m) => m.provv));
  const ap = somma(mesi.map((m) => m.provv_ap));
  const diff = tondo(ac - ap);
  const fino = ultimo.parziale
    ? `al ${dataBreve(ultimo.fino_al)}`
    : `a fine ${meseSolo(ultimo.mese)}`;
  return {
    titolo: `Provvigioni da gennaio ${fino}`,
    cosa: `${COSA_PROVV} Somma dei mesi, ognuno contro lo stesso periodo del ${a - 1}: il mese in corso arriva a ieri anche nel ${a - 1}.`,
    calcolo: [
      { voce: `Da gennaio ${a}`, valore: ac },
      { voce: `Stesso periodo ${a - 1}`, valore: ap, segno: "-" },
      { voce: "Differenza", valore: diff, segno: "=" },
      {
        voce: "In percentuale (differenza diviso anno prima)",
        valore: pct(ap ? tondo((diff / ap) * 100) : null),
      },
    ],
    fonte: FONTE_PROVV,
    elenco: {
      titolo: `Provvigioni da gennaio, mese per mese, contro il ${a - 1}`,
      colonne: ["Mese", String(a), String(a - 1), "Differenza"],
      righe: mesi.map((m) => [
        `${meseSolo(m.mese)}${m.parziale ? ` (fino al ${giorno(m.fino_al)})` : ""}`,
        m.provv,
        m.provv_ap,
        tondo(m.provv - m.provv_ap),
      ]),
      totale: ["Da gennaio", ac, ap, diff],
    },
  };
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
      `${etichetta}, ${intervallo(dopo)}: titoli incassati (NA013), infortuni del conducente già nel RE`,
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

/** One line of the incassi (auto or RE): the closed months from the company plus the titles since, = the line (R016d). */
export const spiegaIncassiRamo = (
  inc: Incassi,
  ramo: "auto" | "re",
  annoDati: number,
  datiAl: string,
): Spiegazione => {
  const p = inc.parti;
  const nome = ramo === "auto" ? "Auto" : "Rami elementari";
  const calcolo: RigaCalcolo[] = [
    ...(p?.chiusi
      ? [
          {
            voce: `${intervallo(p.chiusi)} (compagnia)`,
            valore: p.chiusi[ramo],
          },
        ]
      : []),
    ...(p?.dopo
      ? [
          {
            voce: `${intervallo(p.dopo)} (titoli)`,
            valore: p.dopo[ramo],
            segno: p.chiusi ? ("+" as const) : undefined,
          },
        ]
      : []),
    { voce: `${nome} da gennaio`, valore: inc[ramo], segno: "=" },
  ];
  return {
    titolo: `${nome}: incassi da inizio ${annoDati}`,
    cosa: `Premi ${ramo === "auto" ? "auto" : "dei rami elementari"} incassati da tutta l'agenzia dal 1 gennaio al ${dataBreve(datiAl)}, come li conta Vittoria (${ramo === "auto" ? "senza gli infortuni del conducente, che vanno nel RE" : "con gli infortuni del conducente delle polizze auto"}).`,
    calcolo,
    fonte: `${BO}: NA302 per i mesi chiusi, NA013 per il mese in corso`,
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

/** Auto plus RE of one month, against the same period of the year before (Cruscotto in "Mese", 25/11/2026). */
export const spiegaIncassiMeseTot = (m: MeseRiepilogo): Spiegazione => {
  const ac = tondo(m.incassi_auto + m.incassi_re);
  const ap = tondo(m.incassi_auto_ap + m.incassi_re_ap);
  return {
    titolo: `Incassi ${periodoMese(m)}`,
    cosa: "Premi dei titoli incassati nel mese da tutta l'agenzia 346, auto più RE come li conta Vittoria: gli infortuni del conducente delle polizze auto stanno nel RE, i Trasporti sono fuori.",
    calcolo: [
      { voce: "Auto", valore: m.incassi_auto },
      { voce: "RE", valore: m.incassi_re, segno: "+" },
      { voce: periodoMese(m), valore: ac, segno: "=" },
      {
        voce: `${periodoAnnoPrima(m)} (auto ${numero(m.incassi_auto_ap, 2)} + RE ${numero(m.incassi_re_ap, 2)})`,
        valore: ap,
      },
      { voce: "Differenza", valore: tondo(ac - ap) },
    ],
    fonte: `${BO}, report NA013 (titoli incassati), per data del giornale di cassa`,
  };
};

/** Shares of the portfolio on the premiums collected: auto, RE, Vita with protection (25/11/2026). */
export interface PartiMix {
  auto: number;
  re: number;
  vita: number;
}
export const quota = (v: number, tot: number): number | null =>
  tot > 0 ? (v / tot) * 100 : null;
export const quotaTesto = (v: number | null): string =>
  v == null
    ? "n.d."
    : `${v.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export const spiegaMix = (
  periodo: string,
  a: PartiMix,
  b: PartiMix,
  annoDati: number,
  fonteRami: string,
): Spiegazione => {
  const ta = tondo(a.auto + a.re + a.vita);
  const tb = tondo(b.auto + b.re + b.vita);
  const q = (v: number, t: number) => quotaTesto(quota(v, t));
  return {
    titolo: `Mix del portafoglio ${periodo}`,
    cosa: "Quanto pesa ogni ramo sugli incassi: auto, RE e Vita con la protezione. L'obiettivo dell'agenzia è far scendere il peso dell'auto.",
    calcolo: [
      { voce: `Auto (${q(a.auto, ta)})`, valore: a.auto },
      { voce: `RE (${q(a.re, ta)})`, valore: a.re, segno: "+" },
      {
        voce: `Vita e protezione (${q(a.vita, ta)})`,
        valore: a.vita,
        segno: "+",
      },
      { voce: "Incassi", valore: ta, segno: "=" },
    ],
    fonte: `${BO}: auto e RE da ${fonteRami}, Vita e protezione da NA016`,
    elenco: {
      titolo: `Mix del portafoglio ${periodo}, ${annoDati} contro ${annoDati - 1}`,
      colonne: [
        "Ramo",
        String(annoDati),
        "Quota",
        String(annoDati - 1),
        "Quota",
      ],
      righe: [
        ["Auto", a.auto, q(a.auto, ta), b.auto, q(b.auto, tb)],
        ["RE", a.re, q(a.re, ta), b.re, q(b.re, tb)],
        ["Vita e protezione", a.vita, q(a.vita, ta), b.vita, q(b.vita, tb)],
      ],
      totale: [
        "Totale",
        ta,
        ta > 0 ? "100%" : "n.d.",
        tb,
        tb > 0 ? "100%" : "n.d.",
      ],
    },
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
    `${meseSolo(m.mese)}${m.parziale ? ` (fino al ${giorno(m.fino_al)})` : ""}`,
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
        ? `La somma dei mesi differisce di ${numero(Math.abs(scarto), 2)} euro dal riquadro (${numero(ytd.delta, 2)}): arrotondamenti dei centesimi mese per mese.`
        : undefined,
  };
};

export const spiegaDeltaYtd = (
  nome: string,
  d: DeltaLinea,
  mesi: MeseRiepilogo[],
  chiave: ChiaveDelta,
  datiAl: string,
  letto: string | null = null,
): Spiegazione => ({
  titolo: `${nome} da gennaio al ${dataBreve(datiAl)}`,
  cosa: `${cosaDelta(chiave === "delta_auto")} La compagnia aggiunge movimenti durante il giorno: il report si rilegge alle 12.`,
  calcolo: calcoloDelta(d.ytd),
  fonte: `${FONTE_DELTA}${letto ? `, letto il ${letto}` : ""}`,
  elenco: elencoDelta(mesi, chiave, d.ytd, nome),
});

export const spiegaNuovePerse = (
  nome: string,
  d: DeltaMese,
  quali: "nuove" | "perse",
): Spiegazione => ({
  titolo: `${nome}: polizze ${quali} da gennaio`,
  cosa:
    quali === "nuove"
      ? "Polizze nuove entrate in portafoglio (le sostituzioni e le appendici non contano come polizze nuove)."
      : "Polizze annullate: disdette, vendite del veicolo, sostituzioni a un'altra compagnia e simili.",
  calcolo: [
    {
      voce: quali === "nuove" ? "Polizze nuove" : "Polizze perse",
      valore: pezzi(quali === "nuove" ? d.np_pezzi : d.ann_pezzi),
    },
    {
      voce:
        quali === "nuove"
          ? "Premio della nuova produzione"
          : "Premio degli annullamenti",
      valore: quali === "nuove" ? d.np : d.ann,
    },
  ],
  fonte: FONTE_DELTA,
});

export const spiegaPolizze = (nome: string, d: DeltaMese): Spiegazione => ({
  titolo: `${nome}: polizze in più o in meno`,
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

/** The same month of the year before, with the difference (Cruscotto in "Mese", 25/11/2026). */
export const spiegaDeltaMeseAnnoPrima = (
  nome: string,
  m: MeseRiepilogo,
  chiave: ChiaveDelta,
): Spiegazione => {
  const ap = chiave === "delta_auto" ? m.delta_auto_ap : m.delta_re_ap;
  return {
    titolo: `${nome} ${periodoAnnoPrima(m)}`,
    cosa: cosaDelta(chiave === "delta_auto"),
    calcolo: [
      ...calcoloDelta(ap),
      {
        voce: `Differenza: ${periodoMese(m)} (${numero(m[chiave].delta, 2)}) meno questo`,
        valore: tondo(m[chiave].delta - ap.delta),
      },
    ],
    fonte: FONTE_DELTA,
  };
};

// ------------------------------------------------------------------ surplus of the premium account

/** One half of a Saldi row: from 24/11/2026 the entry (C, D) and the exit (E, F) of a row are two rows. */
export interface MovimentoConto {
  data: string | null;
  /** missing on the rows written before 24/11/2026, when a row held both halves */
  tipo?: "entrata" | "uscita";
  descrizione: string;
  entrata: number;
  uscita: number;
  saldo: number;
}

/** Movements of the Saldi sheet from the balance at the end of the year before to today's (backend
 * saldi.finestra_avanzo; until 23/11/2026 the last 30 days). */
export interface MovimentiAvanzo {
  dal_saldo: number | null;
  dal: string | null;
  al: string | null;
  entrate: number;
  uscite: number;
  al_saldo: number;
  differenza: number | null;
  quadra: boolean;
  movimenti: MovimentoConto[];
}

export type TipoMovimento = "tutti" | "entrata" | "uscita";

export interface FiltroMovimenti {
  /** "AAAA-MM" or "" for every month */
  mese: string;
  tipo: TipoMovimento;
  testo: string;
}

export const NESSUN_FILTRO: FiltroMovimenti = {
  mese: "",
  tipo: "tutti",
  testo: "",
};

const tipoDi = (x: MovimentoConto): "entrata" | "uscita" =>
  x.tipo ?? (x.uscita && !x.entrata ? "uscita" : "entrata");

/** Months with at least one movement, oldest first ("AAAA-MM"). */
export const mesiMovimenti = (mv: MovimentiAvanzo): string[] =>
  [
    ...new Set(
      mv.movimenti.map((x) => x.data?.slice(0, 7) ?? "").filter(Boolean),
    ),
  ].sort();

export const filtraMovimenti = (
  mv: MovimentiAvanzo,
  f: FiltroMovimenti,
): MovimentoConto[] => {
  const testo = f.testo.trim().toLowerCase();
  return mv.movimenti.filter(
    (x) =>
      (!f.mese || x.data?.startsWith(f.mese)) &&
      (f.tipo === "tutti" || tipoDi(x) === f.tipo) &&
      (!testo || x.descrizione.toLowerCase().includes(testo)),
  );
};

const filtrato = (f: FiltroMovimenti): boolean =>
  f.mese !== "" || f.tipo !== "tutti" || f.testo.trim() !== "";

const FONTE_SALDI =
  "foglio Saldi (Saldi.xlsx su Drive di fattureagenzia), colonna G";

export const elencoSaldiMese = (saldiMese: [string, number][]) => ({
  titolo: "Saldo del conto premi a fine mese",
  colonne: ["Mese", "Saldo"],
  righe: saldiMese.map(([m, v]): Cella[] => [
    `${meseSolo(m)} ${m.slice(0, 4)}`,
    v,
  ]),
  nota: "Un saldo non si somma: l'elenco mostra come è cambiato mese per mese. Il mese in corso è all'ultimo movimento.",
});

/** The movements behind the balance. Without a filter the list starts from the balance at the end of the year before
 * and the total is today's balance; with a filter the total is the sum of the rows shown (the balance column stays
 * the sheet's, row by row). */
export const elencoMovimentiAvanzo = (
  mv: MovimentiAvanzo,
  f: FiltroMovimenti = NESSUN_FILTRO,
): Elenco => {
  const righe = filtraMovimenti(mv, f);
  const riga = (x: MovimentoConto): Cella[] => [
    `${dataBreve(x.data)} ${tipoDi(x) === "uscita" ? "uscita" : "entrata"}: ${x.descrizione || "(senza descrizione)"}`,
    x.entrata || null,
    x.uscita || null,
    x.saldo,
  ];
  const periodo = `dal ${dataBreve(mv.dal)} al ${dataBreve(mv.al)}`;
  if (filtrato(f))
    return {
      titolo: `Movimenti del conto premi ${periodo}, filtrati`,
      colonne: ["Data e descrizione", "Entrata", "Uscita", "Saldo"],
      righe: righe.map(riga),
      totale: [
        `Totale delle ${righe.length} righe mostrate`,
        tondo(righe.reduce((t, x) => t + x.entrata, 0)),
        tondo(righe.reduce((t, x) => t + x.uscita, 0)),
        null,
      ],
      nota: "Filtro acceso: il totale somma solo le righe mostrate, il saldo di ogni riga resta quello del foglio.",
    };
  return {
    titolo: `Movimenti del conto premi ${periodo}`,
    colonne: ["Data e descrizione", "Entrata", "Uscita", "Saldo"],
    righe: [
      [`Saldo al ${dataBreve(mv.dal)}`, null, null, mv.dal_saldo],
      ...righe.map(riga),
    ],
    totale: ["Totale del periodo", mv.entrate, mv.uscite, mv.al_saldo],
    nota: mv.quadra
      ? "Saldo di partenza + entrate - uscite = saldo di oggi."
      : `Attenzione: saldo di partenza + entrate - uscite non da' il saldo del foglio (differenza ${numero(mv.differenza ?? 0, 2)}): nel foglio Saldi c'è un refuso da guardare.`,
  };
};

export const spiegaAvanzo = (
  av: {
    valore: number;
    data: string | null;
    prec_valore: number | null;
    prec_data: string | null;
  },
  saldiMese: [string, number][],
  mv: MovimentiAvanzo | null = null,
): Spiegazione => ({
  titolo: "Saldo del conto premi",
  cosa: "Saldo del conto separato dei premi secondo il foglio Saldi, all'ultima riga con un movimento vero (sotto ci sono righe che ripetono il saldo). Negativo = il conto ha anticipato soldi.",
  calcolo:
    mv && mv.dal_saldo != null
      ? [
          { voce: `Saldo al ${dataBreve(mv.dal)}`, valore: mv.dal_saldo },
          {
            voce: `Entrate (${mv.movimenti.filter((x) => x.entrata).length} righe)`,
            valore: mv.entrate,
            segno: "+",
          },
          {
            voce: `Uscite (${mv.movimenti.filter((x) => x.uscita).length} righe)`,
            valore: mv.uscite,
            segno: "-",
          },
          {
            voce: `Saldo al ${dataBreve(mv.al)}`,
            valore: mv.al_saldo,
            segno: "=",
          },
        ]
      : [
          {
            voce: `Saldo al ${dataBreve(av.data)}`,
            valore: av.valore,
            segno: "=",
          },
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
  fonte: FONTE_SALDI,
  elenco: mv
    ? elencoMovimentiAvanzo(mv)
    : saldiMese.length > 0
      ? elencoSaldiMese(saldiMese)
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
  /** 22/11/2026: the steps of the projection (fiscale.passi_proiezione); older rows do not have them. */
  proiezione_passi?: PassiProiezione | null;
}
export interface PassiProiezione {
  mesi: number;
  ricavi: {
    da_gennaio: number;
    arag: number;
    una_tantum: number;
    di_cui_incentivi_marzo: number;
    ricorrenti: number;
    al_mese: number;
    per_12: number;
    arag_anno: number;
    totale: number;
  };
  deducibili: {
    da_gennaio: number;
    mutui_pagati: number;
    una_tantum: number;
    ricorrenti: number;
    al_mese: number;
    per_12: number;
    mutui_resto_anno: number;
    totale: number;
  };
}

/** The steps from January-to-date to December, as a list (shown in the detail page and behind the number). */
export const elencoPassi = (p: PassiProiezione, dal: string, al: string) => {
  const r = p.ricavi;
  const d = p.deducibili;
  const periodo = `${meseSolo(dal)}-${meseSolo(al)}`;
  return {
    titolo: "Come si arriva alla proiezione di dicembre",
    colonne: ["Passaggio", "Ricavi", "Costi deducibili"],
    righe: [
      [`Da ${periodo} (${p.mesi} mesi)`, r.da_gennaio, d.da_gennaio],
      ["meno ARAG (si conta a parte)", -r.arag, null],
      [
        `meno voci una tantum${r.di_cui_incentivi_marzo ? ` (con incentivi annuali di marzo ${numero(r.di_cui_incentivi_marzo, 2)})` : ""}`,
        -r.una_tantum,
        -d.una_tantum,
      ],
      ["meno interessi e oneri dei mutui già pagati", null, -d.mutui_pagati],
      ["= parte che si ripete ogni mese", r.ricorrenti, d.ricorrenti],
      [`al mese (diviso ${p.mesi})`, r.al_mese, d.al_mese],
      ["per 12 mesi", r.per_12, d.per_12],
      ["più voci una tantum, una volta sola", r.una_tantum, d.una_tantum],
      ["più ARAG su 12 mesi", r.arag_anno, null],
      [
        "più mutui: già pagati e rate fino a dicembre",
        null,
        tondo(d.mutui_pagati + d.mutui_resto_anno),
      ],
      ["= previsto a dicembre", r.totale, d.totale],
    ] as Cella[][],
    nota: "Ricavi previsti meno costi deducibili previsti = utile fiscale previsto. Le righe con = sono i risultati.",
  };
};

const FONTE_FISCALE =
  "estratti conto Asti e Desio, foglio Saldi, partite della compagnia (BO), fatture; regole in Per lo studio";

export const spiegaUtileFiscale = (f: FiscaleCruscotto): Spiegazione => {
  return {
    titolo: "Utile fiscale previsto a dicembre",
    cosa: `Proiezione dell'anno: media dei mesi completi (${meseSolo(f.dal)}-${meseSolo(f.al)}, ${f.mesi_usati} mesi) per 12, con le voci una tantum contate una volta sola. Da ${meseSolo(f.dal)} a ${meseSolo(f.al)}: ricavi ${numero(f.da_gennaio.ricavi, 2)} meno costi deducibili ${numero(f.da_gennaio.deducibili, 2)} = ${numero(f.da_gennaio.utile_fiscale, 2)}.`,
    calcolo: [
      ...(f.proiezione_passi
        ? [
            {
              voce: `Ricavi che si ripetono: ${numero(f.proiezione_passi.ricavi.al_mese, 2)} al mese per 12`,
              valore: f.proiezione_passi.ricavi.per_12,
            },
            {
              voce: "più ricavi una tantum e ARAG",
              valore: tondo(
                f.proiezione_passi.ricavi.una_tantum +
                  f.proiezione_passi.ricavi.arag_anno,
              ),
              segno: "+" as const,
            },
          ]
        : []),
      { voce: "Ricavi previsti", valore: f.proiezione.ricavi, segno: "=" },
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
    // the list behind the projected number ends on the projected number (review R016c); the months are in
    // elencoMesiFiscale, shown in the detail page
    elenco: f.proiezione_passi
      ? elencoPassiUtile(f.proiezione_passi, f)
      : elencoMesiFiscale(f),
  };
};

/** The projection steps with a third column that closes on the projected taxable profit. */
const elencoPassiUtile = (p: PassiProiezione, f: FiscaleCruscotto): Elenco => {
  const e = elencoPassi(p, f.dal, f.al);
  return {
    titolo: "Come si arriva all'utile fiscale previsto",
    colonne: [...e.colonne, "Utile fiscale"],
    righe: e.righe.map((r): Cella[] => [...r, null]),
    totale: [
      "Utile fiscale previsto",
      p.ricavi.totale,
      p.deducibili.totale,
      f.proiezione.utile_fiscale,
    ],
    nota: e.nota,
  };
};

/** Month by month from January: the "Utile" column is the same profit as Utile e costi (no ARAG), ARAG goes only in the
 * taxable profit column (review R051). */
export const elencoMesiFiscale = (f: FiscaleCruscotto): Elenco => {
  const mesi = Object.keys(f.per_mese).sort();
  const arag = f.proiezione_passi?.ricavi.arag ?? 0;
  const tot = somma([...mesi.map((m) => f.per_mese[m].utile_fiscale), arag]);
  const scarto = tondo(tot - f.da_gennaio.utile_fiscale);
  return {
    titolo: "Utile fiscale mese per mese",
    colonne: ["Mese", "Provvigioni", "Utile", "Utile fiscale"],
    righe: [
      ...mesi.map((m): Cella[] => [
        nomeMeseAnno(m),
        f.per_mese[m].provvigioni,
        f.per_mese[m].utile,
        f.per_mese[m].utile_fiscale,
      ]),
      ...(arag
        ? [
            [
              "Provvigioni ARAG (arrivano una volta, in nessun mese)",
              null,
              null,
              arag,
            ] as Cella[],
          ]
        : []),
    ],
    totale: [
      "Da gennaio",
      somma(mesi.map((m) => f.per_mese[m].provvigioni)),
      somma(mesi.map((m) => f.per_mese[m].utile)),
      tot,
    ],
    nota:
      Math.abs(scarto) > 0.005
        ? `Il totale dei mesi differisce di ${numero(scarto, 2)} euro dall'utile fiscale da gennaio (${numero(f.da_gennaio.utile_fiscale, 2)}).`
        : `Totale dei mesi = utile fiscale da ${meseSolo(f.dal)} a ${meseSolo(f.al)}. ARAG è solo nell'utile fiscale: l'utile è lo stesso della pagina Utile e costi.`,
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
      {
        voce: `Rispetto all'obiettivo di ${f.obiettivo ?? numero(f.soglia)}`,
        valore: tondo(f.utile_fiscale_con_previsti - (f.obiettivo ?? f.soglia)),
      },
    ],
    fonte: cp.voci
      .map((v) => v.fonte)
      .filter((x, i, a) => a.indexOf(x) === i)
      .join(", "),
    elenco: {
      titolo: "Costi previsti da Fabio",
      colonne: ["Voce", "Importo", "Già pagato", "Resta"],
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
