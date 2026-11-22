/**
 * One list of every invoice the dashboard knows (plan of 21/11/2026, P4: Fatture is the first entry of the partners'
 * menu and replaces Tutte le fatture, Fatture e pagamenti and Fatture subagenti). Pure functions, so the tests check the
 * merge, the months and that every month total is the sum of its rows. Every amount carries its explanation.
 */
import { dataIt, euro, nomeMese } from "./formato";
import type { Cella, RigaCalcolo, Spiegazione } from "./Spiega";

export interface FatturaSub {
  atteso: {
    imponibile: number;
    completo: boolean;
    decadi: { decade: string; totale: number }[];
  } | null;
  fattura: {
    chi?: string;
    numero: string | null;
    data: string | null;
    periodo?: string | null;
    imponibile: number | null;
    bollo?: number | null;
    ritenuta: number | null;
    netto: number | null;
  } | null;
  bonifico: { data: string; importo: number; conto?: string } | null;
  bonifico_diverso: { data: string; importo: number; conto?: string } | null;
  differenze?: Record<string, number> | null;
}
export interface BrokerRiga {
  broker: string;
  mese: string;
  provvigioni: number;
  ritenuta: number;
  netto: number;
  tipo: string;
  arrivato: string;
  mese_saldi: string;
  uscita_saldi: number | null;
}
export interface FatturaCassetto {
  fornitore: string;
  numero: string;
  data: string;
  tipo_testo?: string;
  imponibile?: number;
  iva?: number;
  ritenuta: number | null;
  totale: number;
  netto?: number;
  scadenza?: string | null;
  esito?: string;
  pagamento?: { conto?: string; data: string } | null;
}
export interface Bolletta {
  data: string;
  fornitore: string;
  importo: number | null;
  pagata_il: string | null;
  stato: string;
}

export type Tipo =
  | "subagenti"
  | "collaboratori"
  | "broker"
  | "fornitori"
  | "bollette";
export type Stato = "pagata" | "da pagare" | "importo diverso" | "da arrivare";

export const TIPI: Record<Tipo, string> = {
  subagenti: "Subagenti",
  collaboratori: "Collaboratori",
  broker: "Broker",
  fornitori: "Fornitori (cassetto fiscale)",
  bollette: "Bollette",
};
export const STATI: Stato[] = [
  "pagata",
  "da pagare",
  "importo diverso",
  "da arrivare",
];

export interface Fattura {
  chiave: string;
  data: string;
  mese: string;
  tipo: Tipo;
  fornitore: string;
  dettaglio: string;
  importo: number | null;
  ritenuta: number | null;
  stato: Stato;
  pagata: string;
  spiega: Spiegazione;
}

/** Sub-agents are paid 80% of their commissions; everyone else in sub_fatture is a collaborator. */
const SUBAGENTI = new Set(["LAIGUEGLIA", "CAMPOROSSO", "SCHIVA"]);
const POSTA = "fattura arrivata alla posta di fattureagenzia";
const tondo = (v: number): number => Math.round(v * 100) / 100;
const nome = (codice: string): string =>
  codice.charAt(0) + codice.slice(1).toLowerCase();
const fineMese = (aaaaMm: string): string => {
  const [a, m] = aaaaMm.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};

const daSub = (chiave: string, v: FatturaSub): Fattura | null => {
  const [competenza, chi] = chiave.split("|");
  if (!chi) return null;
  const f = v.fattura;
  const tipo: Tipo = SUBAGENTI.has(chi) ? "subagenti" : "collaboratori";
  const decadi: RigaCalcolo[] = v.atteso
    ? [
        {
          voce: `Dalle decadi${v.atteso.completo ? "" : " (manca almeno una decade)"}`,
          valore: v.atteso.imponibile,
        },
      ]
    : [];
  const elencoDecadi = v.atteso
    ? {
        titolo: `${nome(chi)}, decadi di ${nomeMese(competenza)}`,
        colonne: ["Decade", "Provvigioni"],
        righe: v.atteso.decadi.map((d): Cella[] => [
          dataIt(d.decade),
          d.totale,
        ]),
        totale: ["Totale delle decadi", v.atteso.imponibile] as Cella[],
        nota: v.atteso.completo
          ? undefined
          : "Manca almeno una decade: il controllo della fattura si fa quando arriva.",
      }
    : undefined;
  const cosa =
    tipo === "subagenti"
      ? "Fattura delle provvigioni del mese del subagente (80% delle provvigioni dei suoi titoli). Si paga il netto, col bonifico."
      : "Fattura del collaboratore per le provvigioni del mese. Si paga il netto, col bonifico.";
  if (!f || f.netto == null) {
    if (!v.atteso) return null;
    return {
      chiave,
      data: fineMese(competenza),
      mese: competenza,
      tipo,
      fornitore: nome(chi),
      dettaglio: `provvigioni di ${nomeMese(competenza)}, fattura non ancora arrivata`,
      importo: v.atteso.imponibile,
      ritenuta: null,
      stato: "da arrivare",
      pagata: "fattura da arrivare",
      spiega: {
        titolo: `${nome(chi)}, provvigioni di ${nomeMese(competenza)}`,
        cosa: `${cosa} La fattura non e' ancora arrivata: l'importo e' quello che risulta dalle decadi.`,
        calcolo: decadi,
        fonte: "decadi del subagente calcolate dai report BO (NA013 e NA016)",
        elenco: elencoDecadi,
      },
    };
  }
  const diversa = !v.bonifico && v.bonifico_diverso;
  const stato: Stato = v.bonifico
    ? "pagata"
    : diversa
      ? "importo diverso"
      : "da pagare";
  const b = v.bonifico ?? v.bonifico_diverso;
  const diff = v.differenze?.imponibile;
  const calcolo: RigaCalcolo[] = [
    { voce: "Imponibile", valore: f.imponibile ?? 0 },
    ...(f.bollo
      ? [{ voce: "Bollo", valore: f.bollo, segno: "+" as const }]
      : []),
    { voce: "Ritenuta d'acconto", valore: f.ritenuta ?? 0, segno: "-" },
    { voce: "Netto da pagare", valore: f.netto, segno: "=" },
    ...decadi,
    ...(diff != null && Math.abs(diff) >= 0.01
      ? [{ voce: "Differenza fattura meno decadi", valore: diff }]
      : []),
    ...(b
      ? [
          {
            voce: `Bonifico del ${dataIt(b.data)}${b.conto ? ` dal conto ${b.conto}` : ""}`,
            valore: b.importo,
          },
        ]
      : []),
  ];
  return {
    chiave,
    data: f.data ?? fineMese(competenza),
    mese: (f.data ?? fineMese(competenza)).slice(0, 7),
    tipo,
    fornitore: nome(chi),
    dettaglio: `provvigioni di ${nomeMese(competenza)}${f.numero ? `, n. ${f.numero}` : ""}`,
    importo: f.imponibile,
    ritenuta: f.ritenuta,
    stato,
    pagata: v.bonifico
      ? dataIt(v.bonifico.data)
      : diversa && v.bonifico_diverso
        ? `${dataIt(v.bonifico_diverso.data)} (importo diverso)`
        : "non ancora",
    spiega: {
      titolo: `${nome(chi)}, fattura di ${nomeMese(competenza)}`,
      cosa,
      calcolo,
      fonte: `${POSTA}; bonifico dagli estratti conto; decadi dai report BO`,
      elenco: elencoDecadi,
    },
  };
};

const daBroker = (r: BrokerRiga, i: number): Fattura => {
  const diff = r.uscita_saldi != null ? tondo(r.uscita_saldi - r.netto) : null;
  const stato: Stato =
    r.uscita_saldi == null
      ? "da pagare"
      : diff != null && Math.abs(diff) >= 1
        ? "importo diverso"
        : "pagata";
  return {
    chiave: `broker|${r.broker}|${r.mese}|${i}`,
    data: r.arrivato,
    mese: r.arrivato.slice(0, 7),
    tipo: "broker",
    fornitore: r.broker,
    dettaglio: `${r.tipo === "fattura" ? "fattura" : "estratto conto"} di ${nomeMese(r.mese)}`,
    importo: r.provvigioni,
    ritenuta: r.ritenuta,
    stato,
    pagata:
      // short, so it fits the phone column; the explanation says "foglio Saldi" in full
      r.uscita_saldi != null
        ? `Saldi ${nomeMese(r.mese_saldi).slice(0, 3)} ${r.mese_saldi.slice(0, 4)}`
        : "non ancora",
    spiega: {
      titolo: `${r.broker}, ${nomeMese(r.mese)}`,
      cosa: "Provvigioni che spettano al broker sui suoi titoli del mese. Gli si paga il netto dal conto premi; l'uscita si legge nel foglio Saldi del mese dopo.",
      calcolo: [
        { voce: "Provvigioni del broker", valore: r.provvigioni },
        { voce: "Ritenuta", valore: r.ritenuta, segno: "-" },
        { voce: "Netto", valore: r.netto, segno: "=" },
        ...(r.uscita_saldi != null
          ? [
              {
                voce: `Uscita nel foglio Saldi di ${nomeMese(r.mese_saldi)}`,
                valore: r.uscita_saldi,
              },
              { voce: "Differenza uscita meno netto", valore: diff ?? 0 },
            ]
          : []),
      ],
      fonte: `${r.tipo === "fattura" ? "fattura" : "estratto conto"} del broker arrivato il ${dataIt(r.arrivato)}; foglio Saldi`,
    },
  };
};

const daCassetto = (f: FatturaCassetto, i: number): Fattura => {
  const pagata = f.esito ? f.esito.startsWith("pagata") : !!f.pagamento;
  const credito = f.esito === "nota di credito";
  return {
    chiave: `cassetto|${f.fornitore}|${f.numero}|${i}`,
    data: f.data,
    mese: f.data.slice(0, 7),
    tipo: "fornitori",
    fornitore: f.fornitore,
    dettaglio: `${f.tipo_testo ?? "fattura"} n. ${f.numero} (cassetto fiscale)`,
    importo: f.totale,
    ritenuta: f.ritenuta,
    stato: pagata || credito ? "pagata" : "da pagare",
    pagata: f.pagamento?.data
      ? dataIt(f.pagamento.data)
      : credito
        ? "nota di credito"
        : "non ancora",
    spiega: {
      titolo: `${f.fornitore}, n. ${f.numero}`,
      cosa: "Fattura ricevuta dal cassetto fiscale, abbinata all'uscita in banca con lo stesso netto e il nome del fornitore.",
      calcolo: [
        ...(f.imponibile != null
          ? [{ voce: "Imponibile", valore: f.imponibile }]
          : []),
        ...(f.iva != null
          ? [{ voce: "IVA", valore: f.iva, segno: "+" as const }]
          : []),
        { voce: "Totale fattura", valore: f.totale, segno: "=" },
        ...(f.ritenuta
          ? [{ voce: "Ritenuta", valore: f.ritenuta, segno: "-" as const }]
          : []),
        ...(f.netto != null
          ? [{ voce: "Netto da pagare", valore: f.netto }]
          : []),
        ...(f.pagamento
          ? [
              {
                voce: `Pagata il ${dataIt(f.pagamento.data)}${f.pagamento.conto ? ` dal conto ${f.pagamento.conto}` : ""}`,
                valore: f.netto ?? f.totale,
              },
            ]
          : []),
      ],
      fonte:
        "cassetto fiscale (XML della fattura); estratti conto per il pagamento",
    },
  };
};

const daBolletta = (b: Bolletta, i: number): Fattura => ({
  chiave: `bolletta|${b.data}|${i}`,
  data: b.data,
  mese: b.data.slice(0, 7),
  tipo: "bollette",
  fornitore: b.fornitore,
  dettaglio: "bolletta della luce",
  importo: b.importo,
  ritenuta: null,
  // 22/11/2026: a bill whose direct debit is not in the bank statement yet is not unpaid: grey, not red
  stato: b.pagata_il ? "pagata" : "da arrivare",
  pagata: b.pagata_il ? dataIt(b.pagata_il) : "addebito non ancora arrivato",
  spiega: {
    titolo: `${b.fornitore}, bolletta del ${dataIt(b.data)}`,
    cosa: `La mail della bolletta non ha l'importo: importo e data vengono dall'addebito sul conto gestionale. Il costo e' gia' nell'utile (Utenze e telefonia).${b.pagata_il ? "" : " L'addebito non e' ancora nell'estratto conto: compare quando arriva l'estratto nuovo."}`,
    calcolo: [
      {
        voce: b.pagata_il
          ? `Addebito del ${dataIt(b.pagata_il)}`
          : "Addebito non ancora trovato",
        valore: b.importo ?? "n.d.",
        segno: "=",
      },
    ],
    fonte:
      "mail di AGN Energia a fattureagenzia; estratto conto del conto gestionale",
  },
});

export interface Fonti {
  sub: Record<string, FatturaSub>;
  broker: Record<string, { righe?: BrokerRiga[] }>;
  cassetto: Record<string, { fatture?: FatturaCassetto[] }>;
  bollette: Bolletta[];
}

/** Every invoice, newest first. */
export const unisciFatture = (f: Fonti): Fattura[] => {
  const out: Fattura[] = [
    ...Object.entries(f.sub)
      .map(([k, v]) => daSub(k, v))
      .filter((x): x is Fattura => x != null),
    ...Object.values(f.broker).flatMap((m) => (m.righe ?? []).map(daBroker)),
    ...Object.values(f.cassetto).flatMap((m) =>
      (m.fatture ?? []).map(daCassetto),
    ),
    ...f.bollette.map(daBolletta),
  ];
  return out.sort(
    (a, b) =>
      b.data.localeCompare(a.data) || a.fornitore.localeCompare(b.fornitore),
  );
};

export interface MeseFatture {
  mese: string;
  righe: Fattura[];
  totale: number;
  spiega: Spiegazione;
}

/** The list split by month of the invoice date, newest month first; each month total explains itself. */
export const perMese = (righe: Fattura[]): MeseFatture[] => {
  const mesi = [...new Set(righe.map((r) => r.mese))].sort().reverse();
  return mesi.map((mese) => {
    const del = righe.filter((r) => r.mese === mese);
    const totale = tondo(del.reduce((s, r) => s + (r.importo ?? 0), 0));
    const tipi = (Object.keys(TIPI) as Tipo[]).filter((t) =>
      del.some((r) => r.tipo === t),
    );
    return {
      mese,
      righe: del,
      totale,
      spiega: {
        titolo: `Fatture di ${nomeMese(mese)}`,
        cosa: "Somma degli importi delle fatture con data in questo mese (per subagenti e collaboratori l'imponibile, per i broker le provvigioni, per il cassetto il totale). Le fatture ancora da arrivare contano con l'importo delle decadi.",
        calcolo: [
          ...tipi.map(
            (t): RigaCalcolo => ({
              voce: `${TIPI[t]} (${del.filter((r) => r.tipo === t).length})`,
              valore: tondo(
                del
                  .filter((r) => r.tipo === t)
                  .reduce((s, r) => s + (r.importo ?? 0), 0),
              ),
              segno: "+",
            }),
          ),
          { voce: "Totale del mese", valore: totale, segno: "=" },
        ],
        fonte:
          "posta di fattureagenzia, foglio Saldi, cassetto fiscale, estratti conto",
        elenco: {
          titolo: `Fatture di ${nomeMese(mese)}`,
          colonne: ["Fornitore", "Importo", "Stato"],
          righe: del.map((r) => [
            `${r.fornitore}, ${r.dettaglio}`,
            r.importo,
            r.stato,
          ]),
          totale: ["Totale", totale, ""],
        },
      },
    };
  });
};

const normale = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const filtra = (
  righe: Fattura[],
  tipo: Tipo | "tutte",
  stato: Stato | "tutti",
  cerca = "",
): Fattura[] => {
  const testo = normale(cerca.trim());
  return righe.filter(
    (r) =>
      (tipo === "tutte" || r.tipo === tipo) &&
      (stato === "tutti" || r.stato === stato) &&
      (!testo || normale(`${r.fornitore} ${r.dettaglio}`).includes(testo)),
  );
};

/** 22/11/2026: searching a supplier, its invoices of every month with the total (e.g. "Marradi"). */
export const spiegaRicerca = (righe: Fattura[], cerca: string): Spiegazione => {
  const totale = tondo(righe.reduce((s, r) => s + (r.importo ?? 0), 0));
  const ritenute = tondo(righe.reduce((s, r) => s + (r.ritenuta ?? 0), 0));
  const mesi = [...new Set(righe.map((r) => r.mese))].sort().reverse();
  return {
    titolo: `Fatture con "${cerca.trim()}"`,
    cosa: "Somma degli importi delle fatture trovate, di tutti i mesi che la dashboard conosce.",
    calcolo: [
      ...mesi.map(
        (m): RigaCalcolo => ({
          voce: nomeMese(m),
          valore: tondo(
            righe
              .filter((r) => r.mese === m)
              .reduce((s, r) => s + (r.importo ?? 0), 0),
          ),
          segno: "+",
        }),
      ),
      { voce: "Totale", valore: totale, segno: "=" },
      { voce: "di cui ritenute", valore: ritenute },
    ],
    fonte:
      "posta di fattureagenzia, foglio Saldi, cassetto fiscale, estratti conto",
    elenco: {
      titolo: `Fatture con "${cerca.trim()}"`,
      colonne: ["Fattura", "Importo", "Ritenuta", "Stato"],
      righe: righe.map((r) => [
        `${dataIt(r.data)} ${r.fornitore}, ${r.dettaglio}`,
        r.importo,
        r.ritenuta,
        r.stato,
      ]),
      totale: ["Totale", totale, ritenute, ""],
    },
  };
};

export const testoImporto = (r: Fattura): string =>
  r.importo != null ? euro(r.importo) : "n.d.";
