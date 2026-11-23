/**
 * Data and explanations of the "Utile e costi" page (simplification plan of 21/11/2026, P4): the profit in blocks written
 * by the agent (utile_blocchi.py, andamento_blocchi type "utile_blocchi"). Fabio 20/11/2026: in -> out split by item with
 * percentages -> profit -> where the profit went. Every node opens into its children down to the single payments
 * (23/11/2026); every number explains itself (Spiega.tsx).
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { dataIt, euro, nomeMese } from "./formato";
import type { Cella, Elenco, RigaCalcolo, Spiegazione } from "./Spiega";

export interface Pagamento {
  mese: string | null;
  data: string | null;
  chi: string;
  importo: number;
}

export interface Nodo {
  nome: string;
  importo: number;
  perc?: number | null;
  figli?: Nodo[];
  pagamenti?: Pagamento[];
  per_mese?: { mese: string; importo: number }[];
  movimenti?: { chi: string; importo: number }[];
  solo_dettaglio?: boolean;
  meta_comuni?: number;
  utile_fiscale?: number;
  /** How a leaf without payments is reached (written by the morning run, review R055). */
  passi?: { voce: string; importo?: number; valore?: number }[];
}

export interface InAttesa {
  chi: string;
  date: string[];
  nota: string | null;
  importo: number;
  proposta: string | null;
}

export interface AlberoUtile {
  entrato: Nodo;
  uscito: Nodo;
  utile: number;
  utile_modello: number;
  dove_finito: Nodo;
  al_fisco: Nodo;
  parziale: boolean;
  controllo: { chiude: boolean; errori: string[]; non_abbinato: number };
  mesi?: string[];
  in_attesa_222?: InAttesa[];
  /** First and last day covered by the bank statements in this row (a month can be incomplete, review R053). */
  dal?: string;
  al?: string;
}

export type Livello = "entrato" | "uscito" | "dove_finito";

const ANNO = /^\d{4}$/;

/** Periods with a profit tree: "da gennaio" rows (AAAA) first, then the months, newest first. */
export const usePeriodiUtile = () =>
  useQuery({
    queryKey: ["andamento", "utile_blocchi", "periodi"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("mese")
        .eq("tipo", "utile_blocchi");
      if (error) throw error;
      const mesi = ((data ?? []) as { mese: string }[]).map((r) => r.mese);
      return [
        ...mesi
          .filter((m) => ANNO.test(m))
          .sort()
          .reverse(),
        ...mesi
          .filter((m) => !ANNO.test(m))
          .sort()
          .reverse(),
      ];
    },
    staleTime: 5 * 60 * 1000,
  });

/** One tree only (the "da gennaio" row is about 110 KB with all the payments: never load every month at once). */
export const useAlberoUtile = (periodo: string | undefined) =>
  useQuery({
    queryKey: ["andamento", "utile_blocchi", periodo],
    enabled: !!periodo,
    queryFn: async (): Promise<AlberoUtile | null> => {
      const { data, error } = await getSupabaseClient()
        .from("andamento_blocchi")
        .select("valori")
        .eq("tipo", "utile_blocchi")
        .eq("mese", periodo as string)
        .limit(1);
      if (error) throw error;
      return (data?.[0]?.valori ?? null) as AlberoUtile | null;
    },
    // changing period keeps the page (and its period menu) on screen while the new tree loads (review R062)
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

export const nomePeriodo = (p: string, mesi?: string[]): string =>
  ANNO.test(p)
    ? mesi && mesi.length
      ? `da ${nomeMese(mesi[0])} a ${nomeMese(mesi[mesi.length - 1])}`
      : `da gennaio ${p}`
    : nomeMese(p);

const FONTI: Record<Livello, string> = {
  entrato:
    "foglio Saldi (provvigioni maturate), partite della compagnia dai report BO, estratti conto Asti 257 e Banco Desio",
  uscito:
    "estratti conto Asti 257 e Banco Desio, foglio Saldi (broker e conto premi), trattenute della compagnia dai report BO",
  dove_finito:
    "estratti conto Asti 257 e Banco Desio, conto premi del foglio Saldi",
};

const COSA: Record<Livello, string> = {
  entrato: "Soldi entrati all'agenzia nel periodo.",
  uscito:
    "Soldi usciti per far funzionare l'agenzia (costi, IVA compresa). La percentuale e' sul totale uscito.",
  dove_finito:
    "Dove e' andato l'utile: prelievi e spese personali dei soci, quota capitale dei mutui e quello che resta sui conti (negativo = preso dal saldo).",
};

export const perc = (v: number | null | undefined): string =>
  v == null
    ? "n.d."
    : `${v.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const tondo = (v: number): number => Math.round(v * 100) / 100;

const quando = (p: Pagamento): string =>
  p.data ? dataIt(p.data) : p.mese ? nomeMese(p.mese) : "";

/** Children that add up to the node (the "di cui" rows are detail only, outside the sum). */
export const figliSomma = (n: Nodo): Nodo[] =>
  (n.figli ?? []).filter((f) => !f.solo_dettaglio);

export const elencoNodo = (n: Nodo, periodo: string): Elenco | undefined => {
  if (n.pagamenti?.length)
    return {
      titolo: `${n.nome}: pagamenti, ${periodo}`,
      colonne: ["Data", "Chi", "Importo"],
      righe: n.pagamenti.map((p): Cella[] => [quando(p), p.chi, p.importo]),
      totale: ["Totale", null, n.importo],
      nota: n.pagamenti.some((p) => !p.data)
        ? "Senza giorno: righe del Banco Desio, del conto premi o del foglio Saldi (il mese e' quello del conto), oppure piu' pagamenti allo stesso nome nel mese."
        : undefined,
    };
  if (n.passi?.length)
    return {
      titolo: `${n.nome}: come si arriva al numero, ${periodo}`,
      colonne: ["Voce", "Importo"],
      righe: n.passi.map((p): Cella[] => [p.voce, p.importo ?? p.valore ?? 0]),
      totale: ["Totale", n.importo],
    };
  if (n.per_mese?.length)
    return {
      titolo: `${n.nome}: mese per mese`,
      colonne: ["Mese", "Importo"],
      righe: n.per_mese.map((x): Cella[] => [nomeMese(x.mese), x.importo]),
      totale: ["Totale", n.importo],
    };
  const figli = figliSomma(n);
  if (!figli.length) return undefined;
  const conQuota = figli.some((f) => f.perc != null);
  return {
    titolo: `${n.nome}: le voci, ${periodo}`,
    colonne: conQuota ? ["Voce", "Quota", "Importo"] : ["Voce", "Importo"],
    righe: figli.map((f): Cella[] =>
      conQuota ? [f.nome, perc(f.perc), f.importo] : [f.nome, f.importo],
    ),
    totale: conQuota ? ["Totale", null, n.importo] : ["Totale", n.importo],
  };
};

/** At most this many lines in the hover panel; a longer list is summed by month (the full list is one click away). */
const RIGHE_TENDINA = 8;

/** Biggest items first, the rest summed in one line: the panel stays on screen and still adds up (review R010). */
const accorcia = (
  righe: { voce: string; valore: number }[],
): { voce: string; valore: number }[] => {
  if (righe.length <= RIGHE_TENDINA - 1) return righe;
  const tenute = RIGHE_TENDINA - 2;
  const resto = righe.slice(tenute);
  return [
    ...righe.slice(0, tenute),
    {
      voce: `altre ${resto.length} voci`,
      valore: tondo(resto.reduce((t, r) => t + r.valore, 0)),
    },
  ];
};

const calcoloNodo = (n: Nodo): RigaCalcolo[] => {
  const figli = figliSomma(n);
  if (figli.length)
    return [
      ...accorcia(figli.map((f) => ({ voce: f.nome, valore: f.importo }))).map(
        (r, i): RigaCalcolo => ({ ...r, segno: i ? "+" : undefined }),
      ),
      { voce: n.nome, valore: n.importo, segno: "=" },
    ];
  const passi = (n.passi ?? []).map((p) => ({
    voce: p.voce,
    valore: p.importo ?? p.valore ?? 0,
  }));
  const righe: { voce: string; valore: number }[] = passi.length
    ? passi
    : n.pagamenti?.length
      ? n.pagamenti.length <= RIGHE_TENDINA
        ? n.pagamenti.map((p) => ({
            voce: `${quando(p)} ${p.chi}`.trim(),
            valore: p.importo,
          }))
        : Object.entries(
            n.pagamenti.reduce<Record<string, number>>((acc, p) => {
              const k = p.mese ?? "";
              acc[k] = tondo((acc[k] ?? 0) + p.importo);
              return acc;
            }, {}),
          ).map(([m, v]) => ({
            voce: m
              ? `${nomeMese(m)} (${n.pagamenti?.filter((p) => (p.mese ?? "") === m).length} pagamenti)`
              : "meta' dei bonifici comuni",
            valore: v,
          }))
      : (n.per_mese ?? []).map((x) => ({
          voce: nomeMese(x.mese),
          valore: x.importo,
        }));
  if (!righe.length) return [{ voce: n.nome, valore: n.importo, segno: "=" }];
  return [
    ...accorcia(righe).map(
      (r, i): RigaCalcolo => ({ ...r, segno: i ? "+" : undefined }),
    ),
    { voce: "Totale", valore: n.importo, segno: "=" },
  ];
};

export const spiegaNodo = (
  n: Nodo,
  livello: Livello,
  periodo: string,
): Spiegazione => ({
  titolo: `${n.nome}, ${periodo}`,
  cosa:
    n.nome === "Prelievi di Fabio" || n.nome === "Prelievi di Claudio"
      ? `Bonifici intestati al socio piu' la meta' dei bonifici intestati a tutti e due (${euro(n.meta_comuni ?? 0)}).`
      : n.pagamenti?.length
        ? `${n.pagamenti.length} ${n.pagamenti.length === 1 ? "pagamento" : "pagamenti"}. ${COSA[livello]}`
        : COSA[livello],
  calcolo: calcoloNodo(n),
  fonte: FONTI[livello],
  elenco: elencoNodo(n, periodo),
});

export const spiegaPerc = (n: Nodo, totale: number): Spiegazione => ({
  titolo: `${n.nome}: quota dell'uscito`,
  cosa: "Quanto pesa questa voce su tutto quello che e' uscito nel periodo.",
  calcolo: [
    { voce: n.nome, valore: n.importo },
    { voce: "diviso il totale uscito", valore: totale, segno: ":" },
    { voce: "per 100", valore: perc(n.perc), segno: "=" },
  ],
  fonte: FONTI.uscito,
});

export const spiegaUtile = (a: AlberoUtile, periodo: string): Spiegazione => ({
  titolo: `Utile, ${periodo}`,
  cosa: "Quello che resta all'agenzia: tutto l'entrato meno tutto l'uscito, IVA compresa. I prelievi dei soci non sono costi: stanno in 'dove e' finito'.",
  calcolo: [
    { voce: "Entrato", valore: a.entrato.importo },
    { voce: "Uscito", valore: a.uscito.importo, segno: "-" },
    { voce: "Utile", valore: a.utile, segno: "=" },
  ],
  fonte: `${FONTI.entrato}; ${FONTI.uscito}`,
  elenco: {
    titolo: `Dall'entrato all'utile, ${periodo}`,
    colonne: ["Voce", "Importo"],
    righe: [
      ...figliSomma(a.entrato).map((f): Cella[] => [f.nome, f.importo]),
      ["= Entrato", a.entrato.importo],
      ...figliSomma(a.uscito).map((f): Cella[] => [f.nome, -f.importo]),
      ["= Uscito", -a.uscito.importo],
    ],
    totale: ["Utile", a.utile],
  },
});

/** Utile -> utile fiscale. The ARAG commissions come once and belong to no month: only in the "da gennaio" line. */
export const spiegaVersoFisco = (
  a: AlberoUtile,
  periodo: string,
  arag: number,
): Spiegazione => {
  const nd = a.al_fisco;
  const fiscale = tondo((nd.utile_fiscale ?? a.utile + nd.importo) + arag);
  return {
    titolo: `Utile fiscale, ${periodo}`,
    cosa: "Per le tasse alcuni costi non contano (o contano solo in parte): si rimettono nell'utile.",
    calcolo: [
      { voce: "Utile", valore: a.utile },
      ...figliSomma(nd).map(
        (f): RigaCalcolo => ({
          voce: `${f.nome} (non deducibile)`,
          valore: f.importo,
          segno: "+",
        }),
      ),
      ...(arag
        ? [
            {
              voce: "Provvigioni ARAG (arrivano una volta, in nessun mese)",
              valore: arag,
              segno: "+" as const,
            },
          ]
        : []),
      { voce: "Utile fiscale", valore: fiscale, segno: "=" },
    ],
    fonte:
      "stesse quote di deducibilita' della pagina Tasse (regole in Per lo studio)",
  };
};

export const utileFiscale = (a: AlberoUtile, arag: number): number =>
  tondo((a.al_fisco.utile_fiscale ?? a.utile + a.al_fisco.importo) + arag);

/** Where a node opens the Fatture page already filtered (null = no invoices behind it, e.g. salaries). */
const LINK_FATTURE: [RegExp, string][] = [
  [/^subagenti$/i, "tipo=subagenti"],
  [/laigueglia/i, "tipo=subagenti&cerca=laigueglia"],
  [/camporosso/i, "tipo=subagenti&cerca=camporosso"],
  [/schiva/i, "tipo=subagenti&cerca=schiva"],
  [/^collaboratori$/i, "tipo=collaboratori"],
  [/cassella/i, "tipo=collaboratori&cerca=cassella"],
  [/musso/i, "tipo=collaboratori&cerca=musso"],
  [/^broker$/i, "tipo=broker"],
  [/utenze/i, "tipo=bollette"],
];

/** Invoices that come only from the tax drawer (cassetto fiscale): linked once at least one has arrived. */
const LINK_CASSETTO: [RegExp, string][] = [
  [/commercialista/i, "cerca=giribaldi"],
  [/^altre spese e fatture$/i, "tipo=fornitori"],
];

/** Name in the Saldi sheet -> name in the broker statements (AB Broker became PIB in September 2026); a broker not in
 * this table has no statement or invoice, so it gets no link (review R011). */
const BROKER_FATTURE: [RegExp, string][] = [
  [/ab broker|pib/i, "pib"],
  [/marradi/i, "marradi"],
  [/uiafin/i, "uiafin"],
  [/rmp/i, "rmp"],
];

export const linkFatture = (
  n: Nodo,
  padre?: Nodo,
  conCassetto = false,
): string | null => {
  const trovato = [...LINK_FATTURE, ...(conCassetto ? LINK_CASSETTO : [])].find(
    ([rx]) => rx.test(n.nome),
  );
  if (trovato) return `/fatture?${trovato[1]}`;
  if (padre && /^broker$/i.test(padre.nome)) {
    const b = BROKER_FATTURE.find(([rx]) => rx.test(n.nome));
    return b ? `/fatture?tipo=broker&cerca=${b[1]}` : null;
  }
  return null;
};

/** Text instead of an empty link while the tax drawer has not arrived yet. */
export const attesaCassetto = (n: Nodo, conCassetto: boolean): boolean =>
  !conCassetto && LINK_CASSETTO.some(([rx]) => rx.test(n.nome));

/** The non-deductible costs of the "towards the taxes" line: their own words, not the ones of "Uscito" (review R016f). */
export const spiegaNonDeducibili = (
  a: AlberoUtile,
  periodo: string,
): Spiegazione => ({
  ...spiegaNodo(a.al_fisco, "uscito", periodo),
  titolo: `Costi non deducibili, ${periodo}`,
  cosa: "Spese pagate che per le tasse non contano (prelievi in contanti, rate della tombale, rata BMW): si sommano all'utile per arrivare all'utile fiscale.",
  fonte:
    "stesse quote di deducibilità della pagina Tasse (regole in Per lo studio)",
});

/** Text under the period menu when the row does not cover the whole month (review R053). */
export const notaParziale = (
  periodo: string,
  a: Pick<AlberoUtile, "parziale" | "dal" | "al">,
  oggi: Date,
): string | null => {
  if (!a.parziale) return null;
  const meseOggi = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}`;
  const passato = !ANNO.test(periodo) && periodo < meseOggi;
  if (!passato)
    return "Mese non ancora finito: i numeri crescono fino all'ultimo estratto conto.";
  return a.dal && a.al
    ? `Mese incompleto: gli estratti conto coprono solo dal ${dataIt(a.dal)} al ${dataIt(a.al)}.`
    : "Mese incompleto: gli estratti conto non coprono tutto il mese.";
};
