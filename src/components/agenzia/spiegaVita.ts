/**
 * Explanations of Vita and Protezione on the main page (backend vita.py, plan of 21/11/2026, P2a). Fabio 20/11/2026: the
 * two macro areas the company asks for. Lorenzo 22/11/2026: "Protezione a gennaio" must say what it is and which numbers
 * it comes from, and open the products behind it.
 */
import type { Cella, RigaCalcolo, Spiegazione } from "./Spiega";
import { numero } from "./formato";
import { dataBreve, meseSolo, pct, tondo } from "./spiegaCruscotto";

export interface TotaliVita {
  annui: number;
  unici: number;
  pens: number;
  prot: number;
  vita: number;
  aggiuntivi: number;
  totale: number;
}
export interface Prodotto {
  blocco: "prot" | "annui" | "unici" | "agg" | "pens" | string;
  codice: string;
  sottogruppo: string;
  premio: number;
}
interface NuovaProduzione {
  annui: number;
  unici: number;
  aggiuntivi: number;
  totale: number;
  /** 24/11/2026: products in area Protezione inside the new production (missing on older caches) */
  prot?: number;
  prot_pezzi?: number;
}
export interface ProdottoNp {
  codice: string;
  descrizione: string;
  tipo: string;
  premio: number;
  pezzi: number;
}
export interface VitaMese {
  fino_al: string;
  parziale: boolean;
  ac: TotaliVita;
  ap: TotaliVita;
  diff: { vita: number; prot: number };
  np: { ac: NuovaProduzione; ap: NuovaProduzione; dal: string | null } | null;
  prodotti?: { ac: Prodotto[]; ap: Prodotto[] };
}
export interface VitaInfo {
  dati_al: string;
  dati_al_ap: string;
  ytd: TotaliVita;
  ytd_ap: TotaliVita;
  diff: { vita: number; prot: number };
  cresc: { vita: number | null; prot: number | null };
  np_fino_a: string | null;
  np_ytd: { ac: NuovaProduzione; ap: NuovaProduzione } | null;
  np_prot_prodotti?: { ac: ProdottoNp[]; ap: ProdottoNp[] } | null;
  prodotti?: { ac: Prodotto[]; ap: Prodotto[] };
}

export type Area = "vita" | "prot";

const FONTE =
  "BusinessObjects di Vittoria, report NA016 (incassi vita), tutta l'agenzia 346, per data del giornale di cassa";
const NOMI_BLOCCHI: Record<string, string> = {
  prot: "Protezione",
  annui: "Premi annui",
  unici: "Premi unici",
  agg: "Versamenti aggiuntivi",
  pens: "Pensionistiche (PIP)",
};
const BLOCCHI_AREA: Record<Area, string[]> = {
  vita: ["annui", "unici", "agg", "pens"],
  prot: ["prot"],
};
const COSA: Record<Area, string> = {
  vita: "Incassi vita (polizze di risparmio e previdenza) divisi come li divide la compagnia: premi annui, premi unici (con i versamenti aggiuntivi) e pensionistiche (PIP).",
  prot: "Incassi delle polizze vita di protezione, cioè quelle che l'area di BO chiama Protezione: temporanee caso morte, Long Term Care e la 422T a termine fisso.",
};

const somma = (v: number[]): number => tondo(v.reduce((a, b) => a + b, 0));

const calcoloVita = (t: TotaliVita): RigaCalcolo[] => [
  { voce: "Premi annui", valore: t.annui, segno: "+" },
  {
    voce: `Premi unici (di cui versamenti aggiuntivi su polizze non di investimento ${numero(t.aggiuntivi, 2)})`,
    valore: t.unici,
    segno: "+",
  },
  { voce: "Pensionistiche (PIP)", valore: t.pens, segno: "+" },
  { voce: "Vita", valore: t.vita, segno: "=" },
];

/** Protection by BO sub-group (term life, LTC, ...), from the products; just the total for rows without products. */
const calcoloProt = (t: TotaliVita, prodotti?: Prodotto[]): RigaCalcolo[] => {
  const gruppi = new Map<string, number>();
  for (const p of prodotti ?? [])
    if (p.blocco === "prot")
      gruppi.set(p.sottogruppo, (gruppi.get(p.sottogruppo) ?? 0) + p.premio);
  return [
    ...[...gruppi.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(
        ([g, v]): RigaCalcolo => ({ voce: g, valore: tondo(v), segno: "+" }),
      ),
    { voce: "Protezione", valore: t.prot, segno: "=" },
  ];
};

const calcolo = (area: Area, t: TotaliVita, prodotti?: Prodotto[]) =>
  area === "vita" ? calcoloVita(t) : calcoloProt(t, prodotti);

/** Products of the area, this year next to last year (same period), biggest first inside each block. */
const elencoProdotti = (
  area: Area,
  titolo: string,
  ac: Prodotto[],
  ap: Prodotto[],
  totAc: number,
  totAp: number,
  colonne: [string, string],
) => {
  const blocchi = BLOCCHI_AREA[area];
  const chiave = (p: Prodotto) => `${p.blocco}|${p.codice}|${p.sottogruppo}`;
  const voci = new Map<string, { p: Prodotto; ac: number; ap: number }>();
  for (const [lista, lato] of [
    [ac, "ac"],
    [ap, "ap"],
  ] as const)
    for (const p of lista.filter((x) => blocchi.includes(x.blocco))) {
      const v = voci.get(chiave(p)) ?? { p, ac: 0, ap: 0 };
      voci.set(chiave(p), { ...v, [lato]: v[lato] + p.premio });
    }
  const righe: Cella[][] = [...voci.values()]
    .sort(
      (a, b) =>
        blocchi.indexOf(a.p.blocco) - blocchi.indexOf(b.p.blocco) ||
        b.ac - a.ac ||
        b.ap - a.ap,
    )
    .map((v) => [
      `${NOMI_BLOCCHI[v.p.blocco] ?? v.p.blocco}: ${v.p.sottogruppo} ${v.p.codice}`,
      tondo(v.ac),
      tondo(v.ap),
    ]);
  const sAc = somma([...voci.values()].map((v) => v.ac));
  const sAp = somma([...voci.values()].map((v) => v.ap));
  const ok = Math.abs(sAc - totAc) < 0.005 && Math.abs(sAp - totAp) < 0.005;
  return {
    titolo,
    colonne: ["Prodotto", ...colonne],
    righe,
    totale: ["Totale", sAc, sAp],
    nota: ok
      ? "Totale dei prodotti = numero del riquadro."
      : `Attenzione: il totale dei prodotti (${numero(sAc, 2)}) non è uguale al numero del riquadro (${numero(totAc, 2)}).`,
  };
};

const nome = (area: Area) => (area === "vita" ? "Vita" : "Protezione");

export const spiegaVitaYtd = (info: VitaInfo, area: Area): Spiegazione => {
  const a = info.dati_al.slice(0, 4);
  const ap = info.dati_al_ap.slice(0, 4);
  return {
    titolo: `${nome(area)} da gennaio al ${dataBreve(info.dati_al)}`,
    cosa: COSA[area],
    calcolo: calcolo(area, info.ytd, info.prodotti?.ac),
    fonte: FONTE,
    elenco: info.prodotti
      ? elencoProdotti(
          area,
          `${nome(area)} da gennaio, prodotto per prodotto`,
          info.prodotti.ac,
          info.prodotti.ap,
          info.ytd[area],
          info.ytd_ap[area],
          [a, `${ap} stesso periodo`],
        )
      : undefined,
  };
};

export const spiegaVitaAnnoPrima = (
  info: VitaInfo,
  area: Area,
): Spiegazione => ({
  titolo: `${nome(area)} dal 1 gennaio al ${dataBreve(info.dati_al_ap)}`,
  cosa: `${COSA[area]} Stessi giorni dell'anno prima.`,
  calcolo: [
    ...calcolo(area, info.ytd_ap, info.prodotti?.ap),
    {
      voce: `Differenza: ${numero(info.ytd[area], 2)} meno questo`,
      valore: info.diff[area],
    },
    { voce: "In percentuale", valore: pct(info.cresc[area]) },
  ],
  fonte: FONTE,
});

/** The same month of the year before, with its own products (review R016e). */
export const spiegaVitaMeseAnnoPrima = (
  mese: string,
  v: VitaMese,
  area: Area,
): Spiegazione => {
  const a = parseInt(mese.slice(0, 4), 10) - 1;
  const periodo = v.parziale
    ? `dal 1 al ${parseInt(v.fino_al.slice(8, 10), 10)} ${meseSolo(mese)}`
    : meseSolo(mese);
  return {
    titolo: `${nome(area)} ${periodo} ${a}`,
    cosa: COSA[area],
    calcolo: calcolo(area, v.ap, v.prodotti?.ap),
    fonte: FONTE,
    elenco: v.prodotti
      ? elencoProdotti(
          area,
          `${nome(area)} ${periodo} ${a}, prodotto per prodotto`,
          v.prodotti.ap,
          v.prodotti.ac,
          v.ap[area],
          v.ac[area],
          [String(a), String(a + 1)],
        )
      : undefined,
  };
};

export const spiegaVitaMese = (
  mese: string,
  v: VitaMese,
  area: Area,
): Spiegazione => {
  const a = parseInt(mese.slice(0, 4), 10);
  const periodo = v.parziale
    ? `dal 1 al ${parseInt(v.fino_al.slice(8, 10), 10)} ${meseSolo(mese)}`
    : meseSolo(mese);
  return {
    titolo: `${nome(area)} ${periodo} ${a}`,
    cosa: COSA[area],
    calcolo: [
      ...calcolo(area, v.ac, v.prodotti?.ac),
      { voce: `${periodo} ${a - 1}`, valore: v.ap[area] },
      { voce: "Differenza", valore: v.diff[area] },
    ],
    fonte: FONTE,
    elenco: v.prodotti
      ? elencoProdotti(
          area,
          `${nome(area)} ${periodo} ${a}, prodotto per prodotto`,
          v.prodotti.ac,
          v.prodotti.ap,
          v.ac[area],
          v.ap[area],
          [String(a), String(a - 1)],
        )
      : undefined,
  };
};

export const spiegaNuovaProduzione = (
  info: VitaInfo,
): Spiegazione | undefined => {
  const np = info.np_ytd;
  if (!np || !info.np_fino_a) return undefined;
  const fino = meseSolo(info.np_fino_a);
  return {
    titolo: `Nuova produzione vita gennaio-${fino}`,
    cosa: "Quello che misura la compagnia per la vita: premi delle polizze nuove (annui), premi unici e versamenti aggiuntivi, solo per i mesi chiusi. Non sono incassi.",
    calcolo: [
      { voce: "Annui", valore: np.ac.annui, segno: "+" },
      { voce: "Unici", valore: np.ac.unici, segno: "+" },
      { voce: "Aggiuntivi", valore: np.ac.aggiuntivi, segno: "+" },
      { voce: "Nuova produzione", valore: np.ac.totale, segno: "=" },
      ...(np.ac.prot != null
        ? [
            {
              voce: `di cui protezione (${np.ac.prot_pezzi ?? 0} polizze)`,
              valore: np.ac.prot,
            },
          ]
        : []),
      { voce: "Stesso periodo anno prima", valore: np.ap.totale },
    ],
    fonte:
      "BusinessObjects di Vittoria, report NA302 (cruscotto della compagnia), mesi chiusi",
  };
};

const FONTE_NP =
  "BusinessObjects di Vittoria, report NA302 (cruscotto della compagnia), mesi chiusi";

/** 24/11/2026 (Fabio): the protection inside the new production, as in the monthly mail of the company. */
export const spiegaProtezioneNp = (info: VitaInfo): Spiegazione | undefined => {
  const np = info.np_ytd;
  if (!np || !info.np_fino_a || np.ac.prot == null) return undefined;
  const fino = meseSolo(info.np_fino_a);
  const prodotti = info.np_prot_prodotti?.ac ?? [];
  return {
    titolo: `Protezione nella nuova produzione vita, gennaio-${fino}`,
    cosa: "Parte della nuova produzione vita fatta da polizze di protezione (temporanee caso morte e simili): i prodotti che BO mette nell'area Protezione. È la cifra della mail mensile della compagnia (raccolta e pezzi della protezione).",
    calcolo: [
      ...prodotti.map(
        (p): RigaCalcolo => ({
          voce: `${p.codice} ${p.descrizione} (${p.pezzi} ${p.pezzi === 1 ? "polizza" : "polizze"})`,
          valore: p.premio,
          segno: "+",
        }),
      ),
      { voce: "Protezione", valore: np.ac.prot, segno: "=" },
      {
        voce: "Polizze",
        valore: `${np.ac.prot_pezzi ?? 0}`,
      },
      ...(np.ap.prot != null
        ? [
            {
              voce: `Stesso periodo anno prima (${np.ap.prot_pezzi ?? 0} polizze)`,
              valore: np.ap.prot,
            },
          ]
        : []),
    ],
    fonte: `${FONTE_NP}; area Protezione dei prodotti come in NA016`,
    elenco:
      prodotti.length > 0
        ? {
            titolo: `Protezione nella nuova produzione, gennaio-${fino}`,
            colonne: ["Prodotto", "Polizze", "Premio"],
            righe: prodotti.map((p): Cella[] => [
              `${p.codice} ${p.descrizione}`,
              String(p.pezzi),
              p.premio,
            ]),
            totale: [
              "Totale",
              String(np.ac.prot_pezzi ?? 0),
              np.ac.prot,
            ] as Cella[],
          }
        : undefined,
  };
};
