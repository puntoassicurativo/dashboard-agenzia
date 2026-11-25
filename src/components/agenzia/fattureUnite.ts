/**
 * One list of every invoice the dashboard knows (plan of 21/11/2026, P4: Fatture is the first entry of the partners'
 * menu and replaces Tutte le fatture, Fatture e pagamenti and Fatture subagenti). Pure functions, so the tests check the
 * merge, the months and that every month total is the sum of its rows. Every amount carries its explanation.
 *
 * 24/11/2026 (Fabio): the tax drawer is the ONLY source of the rows (fattureCassetto.ts). The mail of the sub-agents,
 * the broker statements and the AGN bills only say whether a drawer invoice is paid (backend fatture_pagamenti.py:
 * `stato`, `pagato_con`, `nel_cassetto`). What those sources expect and the drawer does not have yet goes to "In
 * arrivo", apart. Fixed rows without an invoice (the Sanremo rent) and the statements of the brokers that never send an
 * electronic invoice (`senza_fattura`) stay in the list, said as such.
 */
import { daCassetto, daFissa } from "./fattureCassetto";
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
    /** "cassetto xml" / "cassetto elenco" when the mail did not have it (23/11/2026) */
    metodo?: string;
  } | null;
  bonifico: { data: string; importo: number; conto?: string } | null;
  bonifico_diverso: { data: string; importo: number; conto?: string } | null;
  differenze?: Record<string, number> | null;
  /** 24/11/2026: its invoice is in the tax drawer, the row of the drawer is the one shown */
  nel_cassetto?: boolean;
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
  nel_cassetto?: boolean;
  /** the broker never sends an electronic invoice (only its statement): the row stays in the list */
  senza_fattura?: boolean;
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
  netto?: number | null;
  scadenza?: string | null;
  iban?: string | null;
  /** payment method of the XML: MP05 bank transfer, MP08 card, MP09/MP19/MP20 direct debit */
  modalita?: string | null;
  esito?: string;
  pagamento?: {
    conto?: string;
    /** "AAAA-MM" when paid from the Saldi sheet */
    data: string;
    importo?: number;
    differenza?: number;
    descrizione?: string;
  } | null;
  /** 24/11/2026, written by the backend: final status and how it was paid */
  stato?: "pagata" | "da pagare" | "da verificare" | "importo diverso";
  pagato_con?: "bonifico" | "addebito" | "carta" | "saldi" | null;
  /** where the net amount comes from when the drawer has only the CSV row */
  netto_da?: string;
  carta?: boolean;
  fonte?: { tipo: string };
  /** 23/11/2026: "xml" = full invoice, "elenco" = row of the CSV list (no withholding, no net amount) */
  dettaglio?: "xml" | "elenco";
  categoria?: "subagente" | "collaboratore" | "broker" | "fornitore";
  /** until 23/11/2026 the row was hidden when another source listed it; ignored from 24/11/2026 */
  anche_in?: string;
  netto_da_bonifico?: boolean;
}
export interface Bolletta {
  data: string;
  fornitore: string;
  importo: number | null;
  pagata_il: string | null;
  stato: string;
  nel_cassetto?: boolean;
}
/** A monthly payment without an invoice (24/11/2026: the Sanremo rent, standing transfer of 688 euro). */
export interface FatturaFissa {
  mese: string;
  data: string;
  fornitore: string;
  dettaglio: string;
  importo: number;
  stato: "pagata" | "da verificare";
  pagamento: { conto: string; data: string; importo: number } | null;
}

export type Tipo =
  | "subagenti"
  | "collaboratori"
  | "broker"
  | "fornitori"
  | "bollette";
export type Stato =
  | "pagata"
  | "da pagare"
  | "importo diverso"
  | "da arrivare"
  | "da verificare";

export const TIPI: Record<Tipo, string> = {
  subagenti: "Subagenti",
  collaboratori: "Collaboratori",
  broker: "Broker",
  fornitori: "Fornitori",
  bollette: "Bollette",
};
/** the types of the filter: from 24/11/2026 the AGN bills are drawer invoices of a supplier */
export const TIPI_FILTRO: Tipo[] = [
  "fornitori",
  "subagenti",
  "collaboratori",
  "broker",
];
/** the statuses of the list; "da arrivare" is only in the "In arrivo" box */
export const STATI: Stato[] = [
  "pagata",
  "da pagare",
  "da verificare",
  "importo diverso",
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
  if (f && f.netto == null && f.imponibile != null) {
    // 23/11/2026: arrived (e.g. only in the tax drawer's CSV list) but the withholding and net amount are unknown
    const dataFattura = f.data ?? fineMese(competenza);
    return {
      chiave,
      data: dataFattura,
      mese: dataFattura.slice(0, 7),
      tipo,
      fornitore: nome(chi),
      dettaglio: `provvigioni di ${nomeMese(competenza)}${f.numero ? `, n. ${f.numero}` : ""}, importi da controllare`,
      importo: f.imponibile,
      ritenuta: null,
      stato: "da verificare",
      pagata: "da verificare",
      spiega: {
        titolo: `${nome(chi)}, fattura di ${nomeMese(competenza)}`,
        cosa: `${cosa} La fattura è arrivata ma ritenuta e netto non si leggono: il pagamento si controlla quando c'è l'XML (download massivo del cassetto) o il PDF.`,
        calcolo: [
          { voce: "Imponibile della fattura", valore: f.imponibile },
          ...decadi,
        ],
        fonte: `${f.metodo === "cassetto elenco" ? "elenco delle fatture del cassetto fiscale" : POSTA}; decadi dai report BO`,
        elenco: elencoDecadi,
      },
    };
  }
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
      fonte: `${f.metodo?.startsWith("cassetto") ? (f.metodo === "cassetto elenco" ? "elenco delle fatture del cassetto fiscale (non arrivata alla posta): ritenuta e netto si leggono solo dall'XML" : "XML del cassetto fiscale (non arrivata alla posta)") : POSTA}; bonifico dagli estratti conto; decadi dai report BO`,
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
    dettaglio: `${r.tipo === "fattura" ? "fattura" : "estratto conto"} di ${nomeMese(r.mese)}${r.senza_fattura ? ", senza fattura nel cassetto" : ""}`,
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
      cosa: `Provvigioni che spettano al broker sui suoi titoli del mese. Gli si paga il netto dal conto premi; l'uscita si legge nel foglio Saldi del mese dopo.${r.senza_fattura ? " Questo broker manda solo l'estratto conto, mai una fattura elettronica: nel cassetto fiscale non c'è e la riga resta con l'estratto." : " La fattura nel cassetto fiscale non c'è ancora."}`,
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
  fisse?: FatturaFissa[];
}

export interface FattureDivise {
  /** the drawer's invoices, the fixed rows and the brokers without electronic invoice: the list */
  elenco: Fattura[];
  /** expected from the decades, the mail or the statements, not yet in the drawer */
  inArrivo: Fattura[];
}

const recenti = (a: Fattura, b: Fattura): number =>
  b.data.localeCompare(a.data) || a.fornitore.localeCompare(b.fornitore);

/** Every invoice, newest first, split into the list (tax drawer) and "In arrivo". */
export const unisciFatture = (f: Fonti): FattureDivise => {
  const broker = Object.values(f.broker).flatMap((m) =>
    (m.righe ?? []).filter((r) => !r.nel_cassetto),
  );
  const elenco: Fattura[] = [
    ...Object.values(f.cassetto).flatMap((m) =>
      (m.fatture ?? []).map((x, i) => daCassetto(x, i)),
    ),
    ...(f.fisse ?? []).map(daFissa),
    ...broker.filter((r) => r.senza_fattura).map(daBroker),
  ];
  const inArrivo: Fattura[] = [
    ...Object.entries(f.sub)
      .filter(([, v]) => !v.nel_cassetto)
      .map(([k, v]) => daSub(k, v))
      .filter((x): x is Fattura => x != null),
    ...broker.filter((r) => !r.senza_fattura).map(daBroker),
    ...f.bollette.filter((b) => !b.nel_cassetto).map(daBolletta),
  ];
  return { elenco: elenco.sort(recenti), inArrivo: inArrivo.sort(recenti) };
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
        cosa: "Somma dei totali delle fatture del cassetto fiscale con data in questo mese, più le spese fisse senza fattura (affitto di Sanremo) e le provvigioni dei broker che mandano solo l'estratto conto. Le fatture in arrivo non contano.",
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

export interface FiltroFatture {
  tipo: Tipo | "tutte";
  stato: Stato | "tutti";
  /** "AAAA-MM" or "" */
  mese?: string;
  /** part of the supplier's name or of the detail */
  cerca?: string;
}

export const filtra = (righe: Fattura[], f: FiltroFatture): Fattura[] => {
  const testo = normale((f.cerca ?? "").trim());
  return righe.filter(
    (r) =>
      (f.tipo === "tutte" || r.tipo === f.tipo) &&
      (f.stato === "tutti" || r.stato === f.stato) &&
      (!f.mese || r.mese === f.mese) &&
      (!testo || normale(`${r.fornitore} ${r.dettaglio}`).includes(testo)),
  );
};

/** Suppliers of the list, once each, alphabetical (the choices of the supplier filter). */
export const fornitori = (righe: Fattura[]): string[] =>
  [...new Set(righe.map((r) => r.fornitore))].sort((a, b) =>
    a.localeCompare(b, "it"),
  );

const COSA_STATO: Record<Stato, string> = {
  pagata:
    "Fatture col pagamento trovato: bonifico o addebito negli estratti conto, addebito della carta Nexi del mese dopo, uscita del foglio Saldi per i broker.",
  "da pagare":
    "Fatture da pagare con un bonifico (netto noto) di cui negli estratti conto non c'è ancora l'uscita.",
  "importo diverso":
    "Fatture col pagamento trovato ma per un importo diverso dal netto: da guardare.",
  "da verificare":
    "Fatture di cui il pagamento non si trova: senza netto (solo l'elenco del cassetto), carta con l'addebito non ancora nell'estratto, o un'uscita con un'altra descrizione.",
  "da arrivare": "Fatture attese che il cassetto fiscale non ha ancora.",
};

/** 24/11/2026: how many invoices per status and for how much, each count with its list. */
export const spiegaStato = (righe: Fattura[], stato: Stato): Spiegazione => {
  const del = righe.filter((r) => r.stato === stato);
  const totale = tondo(del.reduce((s, r) => s + (r.importo ?? 0), 0));
  return {
    titolo: `Fatture: ${stato}`,
    cosa: COSA_STATO[stato],
    calcolo: [{ voce: `${del.length} fatture`, valore: totale, segno: "=" }],
    fonte: "cassetto fiscale; estratti conto e foglio Saldi",
    elenco: {
      titolo: `Fatture: ${stato}`,
      colonne: ["Fattura", "Importo"],
      righe: del.map((r) => [
        `${dataIt(r.data)} ${r.fornitore}, ${r.dettaglio}`,
        r.importo,
      ]),
      totale: ["Totale", totale],
    },
  };
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
