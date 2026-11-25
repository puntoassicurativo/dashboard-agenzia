/**
 * The rows of the Fatture list from the tax drawer (24/11/2026: the drawer is the only source of the rows) and the fixed
 * monthly rows without an invoice. The backend (fatture_pagamenti.py) writes the status and how each invoice was paid:
 * bank transfer or direct debit in the statements, the Nexi card debit of the month after, the Saldi outflow for the
 * brokers. Here only the words and the calculation of the explanation.
 */
import type {
  Fattura,
  FatturaCassetto,
  FatturaFissa,
  Stato,
  Tipo,
} from "./fattureUnite";
import { dataIt, euro, nomeMese } from "./formato";
import type { RigaCalcolo } from "./Spiega";

const TIPO_CASSETTO: Record<NonNullable<FatturaCassetto["categoria"]>, Tipo> = {
  subagente: "subagenti",
  collaboratore: "collaboratori",
  broker: "broker",
  fornitore: "fornitori",
};

/**
 * From 24/11/2026 the backend writes the status (`stato`). Older rows: red "da pagare" only for an invoice from the XML
 * that asks for a bank transfer (MP05) and has no matching outflow; otherwise "da verificare" (23/11/2026).
 */
export const statoCassetto = (f: FatturaCassetto): Stato => {
  if (f.esito === "nota di credito" || f.esito === "niente da pagare")
    return "pagata";
  if (f.stato) return f.stato;
  if (f.esito ? f.esito.startsWith("pagata") : !!f.pagamento) return "pagata";
  return f.dettaglio !== "elenco" &&
    f.modalita === "MP05" &&
    f.categoria !== "broker"
    ? "da pagare"
    : "da verificare";
};

const meseBreve = (aaaaMm: string): string =>
  `${nomeMese(aaaaMm).slice(0, 3)} ${aaaaMm.slice(0, 4)}`;

const NETTO_DA: Record<string, string> = {
  mail: "dalla fattura arrivata alla mail",
  "estratto del broker": "dall'estratto del broker",
  "ritenuta usuale del 4,6%": "con la ritenuta usuale dei broker (4,6%)",
};

const comePagata = (f: FatturaCassetto): string => {
  const p = f.pagamento;
  if (f.pagato_con === "carta")
    return `Pagata con la carta Nexi: le spese con la carta non si vedono una per una in banca, si pagano tutte insieme con l'addebito Nexi del 15 del mese dopo sul conto gestionale. L'importo dell'addebito (${euro(p?.importo)}) è il totale della carta, non questa fattura.`;
  if (f.pagato_con === "saldi")
    return f.stato === "importo diverso"
      ? `Il broker si paga dal conto premi: l'uscita del foglio Saldi di ${nomeMese(p?.data ?? "")} è ${euro(p?.importo)} e non torna col netto della fattura (differenza ${euro(p?.differenza)}). Da guardare nel foglio Saldi.`
      : `Il broker si paga dal conto premi: l'uscita col netto è nel foglio Saldi di ${nomeMese(p?.data ?? "")}.`;
  if (f.pagato_con === "addebito")
    return "Pagata con l'addebito diretto in banca, stesso importo.";
  if (f.fonte?.tipo === "sub_fatture")
    return f.stato === "importo diverso"
      ? "Il bonifico trovato non ha l'importo del netto: da guardare."
      : "Pagata col bonifico del netto, trovato negli estratti conto.";
  return "Abbinata all'uscita in banca con lo stesso netto e il nome del fornitore.";
};

const cosaCassetto = (f: FatturaCassetto, stato: Stato): string => {
  const base =
    f.dettaglio === "elenco"
      ? "Fattura ricevuta, dall'elenco del cassetto fiscale (senza l'XML)."
      : "Fattura ricevuta dal cassetto fiscale (XML).";
  const netto =
    f.netto_da && NETTO_DA[f.netto_da]
      ? ` Netto e ritenuta ${NETTO_DA[f.netto_da]}.`
      : "";
  if (f.esito === "nota di credito")
    return `${base} Nota di credito: non si paga.`;
  if (f.esito === "niente da pagare")
    return `${base} Totale a zero (arrotondamento): non c'è niente da pagare.`;
  if (stato === "pagata" && f.netto_da_bonifico)
    return `${base} Pagata: in banca c'è l'uscita col nome del fornitore e un importo che torna col totale meno una ritenuta usuale; netto e ritenuta vengono dal bonifico.`;
  if (stato === "pagata" || stato === "importo diverso")
    return `${base}${netto} ${comePagata(f)}`;
  if (f.carta)
    return `${base} Si paga con la carta Nexi: l'addebito del mese dopo non è ancora nell'estratto conto. Diventa pagata quando arriva l'estratto.`;
  if (f.categoria === "broker")
    return `${base}${netto} Il broker si paga dal conto premi, ma nel foglio Saldi l'uscita non c'è ancora.`;
  if (stato === "da verificare")
    return `${base}${netto} Pagamento non trovato negli estratti conto: può essere un addebito, una carta o un bonifico con un'altra descrizione.${f.dettaglio === "elenco" && !f.netto_da ? " Con l'XML del mese il controllo è esatto." : ""}`;
  return `${base}${netto} Si paga con un bonifico e negli estratti conto non c'è ancora l'uscita col netto da pagare.`;
};

const testoPagata = (f: FatturaCassetto, stato: Stato): string => {
  const p = f.pagamento;
  const diverso = stato === "importo diverso" ? " (importo diverso)" : "";
  if (f.esito === "nota di credito") return "nota di credito";
  if (f.esito === "niente da pagare") return "niente da pagare";
  if (p?.data && f.pagato_con === "saldi")
    return `Saldi ${meseBreve(p.data)}${diverso}`;
  if (p?.data && f.pagato_con === "carta") return `carta ${dataIt(p.data)}`;
  if (p?.data) return `${dataIt(p.data)}${diverso}`;
  return stato === "da verificare" ? "da verificare" : "non ancora";
};

const righePagamento = (f: FatturaCassetto): RigaCalcolo[] => {
  const p = f.pagamento;
  if (!p) return [];
  if (f.pagato_con === "carta")
    return [
      {
        voce: `Addebito delle carte Nexi del ${dataIt(p.data)} (totale della carta)`,
        valore: p.importo ?? "n.d.",
      },
    ];
  if (f.pagato_con === "saldi")
    return [
      {
        voce: `Uscita del foglio Saldi di ${nomeMese(p.data)}`,
        valore: p.importo ?? "n.d.",
      },
      ...(p.differenza != null && Math.abs(p.differenza) >= 0.01
        ? [{ voce: "Differenza uscita meno netto", valore: p.differenza }]
        : []),
    ];
  return [
    {
      voce: `Pagata il ${dataIt(p.data)}${p.conto ? ` dal conto ${p.conto}` : ""}`,
      valore: p.importo ?? f.netto ?? f.totale,
    },
  ];
};

const FONTE_PAGAMENTO: Record<string, string> = {
  carta: "estratti conto (addebito delle carte Nexi)",
  saldi: "foglio Saldi",
  addebito: "estratti conto",
  bonifico: "estratti conto",
};

const FONTE_NETTO: Record<string, string> = {
  mail: "; fattura arrivata alla mail di fattureagenzia (netto e ritenuta)",
  "estratto del broker": "; estratto del broker (netto e ritenuta)",
};

export const daCassetto = (f: FatturaCassetto, i: number): Fattura => {
  const stato = statoCassetto(f);
  return {
    chiave: `cassetto|${f.fornitore}|${f.numero}|${i}`,
    data: f.data,
    mese: f.data.slice(0, 7),
    tipo: TIPO_CASSETTO[f.categoria ?? "fornitore"],
    fornitore: f.fornitore,
    dettaglio: `${f.tipo_testo ?? "fattura"} n. ${f.numero}`,
    importo: f.totale,
    ritenuta: f.ritenuta,
    stato,
    pagata: testoPagata(f, stato),
    spiega: {
      titolo: `${f.fornitore}, n. ${f.numero}`,
      cosa: cosaCassetto(f, stato),
      calcolo: [
        ...(f.imponibile != null
          ? [{ voce: "Imponibile", valore: f.imponibile }]
          : []),
        ...(f.iva != null
          ? [{ voce: "IVA", valore: f.iva, segno: "+" as const }]
          : []),
        { voce: "Totale fattura", valore: f.totale, segno: "=" },
        ...(f.ritenuta
          ? [
              {
                voce: f.netto_da_bonifico
                  ? "Ritenuta (ricavata dal bonifico)"
                  : "Ritenuta",
                valore: f.ritenuta,
                segno: "-" as const,
              },
            ]
          : []),
        ...(f.netto != null
          ? [
              {
                voce: f.netto_da_bonifico ? "Netto pagato" : "Netto da pagare",
                valore: f.netto,
              },
            ]
          : []),
        ...righePagamento(f),
      ],
      fonte: `cassetto fiscale (${f.dettaglio === "elenco" ? "elenco CSV delle fatture ricevute" : "XML della fattura"})${FONTE_NETTO[f.netto_da ?? ""] ?? ""}; ${FONTE_PAGAMENTO[f.pagato_con ?? "bonifico"]} per il pagamento`,
    },
  };
};

export const daFissa = (x: FatturaFissa): Fattura => ({
  chiave: `fissa|${x.fornitore}|${x.mese}`,
  data: x.data,
  mese: x.mese,
  tipo: "fornitori",
  fornitore: x.fornitore,
  dettaglio: `${x.dettaglio} di ${nomeMese(x.mese)}, senza fattura (bonifico ripetitivo)`,
  importo: x.importo,
  ritenuta: null,
  stato: x.stato,
  pagata: x.pagamento ? dataIt(x.pagamento.data) : "da verificare",
  spiega: {
    titolo: `${x.fornitore}, ${nomeMese(x.mese)}`,
    cosa: `Spesa fissa del mese senza fattura nel cassetto fiscale: bonifico ripetitivo di ${euro(x.importo)} dal conto gestionale. Un bonifico dal 25 in poi vale per il mese dopo.${x.pagamento ? "" : " Il bonifico del mese non è nell'estratto conto: da guardare."}`,
    calcolo: [
      { voce: "Importo fisso del mese", valore: x.importo },
      ...(x.pagamento
        ? [
            {
              voce: `Bonifico del ${dataIt(x.pagamento.data)} dal conto ${x.pagamento.conto}`,
              valore: x.pagamento.importo,
            },
          ]
        : []),
    ],
    fonte: "estratti conto (bonifico ripetitivo)",
  },
});
