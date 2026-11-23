/**
 * Explanations of the numbers in the partners' tabs Personale, Ritenute, Mutui and Estratti broker (review R013,
 * 23/11/2026: "every number is justified, on the spot"). Pure functions: the pages only lay the agent's figures out.
 */
import { dataIt, nomeMese, tondo } from "./formato";
import type { Cella, RigaCalcolo, Spiegazione } from "./Spiega";

/** Rows "+ a + b = total" from a list of items (first row without sign). */
export const somma = (
  voci: { voce: string; valore: number }[],
  totale: { voce: string; valore: number },
): RigaCalcolo[] => [
  ...voci.map((v, i): RigaCalcolo => ({ ...v, segno: i ? "+" : undefined })),
  { ...totale, segno: "=" },
];

const FONTE_CEDOLINI =
  "cedolini dello studio arrivati nella posta di fattureagenzia, bonifici dall'estratto conto";

export const spiegaTotalePersonale = (
  mese: string,
  voce: string,
  nome: string,
  dipendenti: Record<string, unknown>[],
  totale: number,
): Spiegazione => {
  const righe = dipendenti.map((d) => ({
    voce: String(d.nome),
    valore: Number(d[voce] ?? 0),
  }));
  return {
    titolo: `${nome}, ${nomeMese(mese)}`,
    cosa: "Somma dei cedolini del mese, dipendente per dipendente.",
    calcolo: somma(righe, { voce: "Totale", valore: totale }),
    fonte: FONTE_CEDOLINI,
    elenco: {
      titolo: `${nome}, ${nomeMese(mese)}: cedolino per cedolino`,
      colonne: ["Dipendente", "Importo"],
      righe: righe.map((r): Cella[] => [r.voce, r.valore]),
      totale: ["Totale", totale],
    },
  };
};

export const spiegaRitenutePosta = (
  mese: string,
  decadi: { decade: string; subagente: string; ritenuta: number }[],
  fatture: { data: string; da: string; ritenuta: number }[],
  totale: number,
): Spiegazione => {
  const righe = [
    ...decadi.map((d) => ({
      voce: `Decade del ${dataIt(d.decade)}, ${d.subagente}`,
      valore: d.ritenuta,
    })),
    ...fatture.map((f) => ({
      voce: `Fattura ${f.da} del ${dataIt(f.data)}`,
      valore: f.ritenuta,
    })),
  ];
  return {
    titolo: `Ritenute dalla posta, ${nomeMese(mese)}`,
    cosa: "Ritenute d'acconto delle fatture pagate nel mese, lette dalla posta (decadi dei subagenti e fatture dei collaboratori).",
    calcolo: somma(righe, { voce: "Dalla posta", valore: totale }),
    fonte: "posta di fattureagenzia (mail della decade e fatture)",
    elenco: {
      titolo: `Ritenute dalla posta, ${nomeMese(mese)}`,
      colonne: ["Riga", "Ritenuta"],
      righe: righe.map((r): Cella[] => [r.voce, r.valore]),
      totale: ["Totale", totale],
    },
  };
};

export const spiegaDifferenzaRitenute = (
  mese: string,
  studio: number,
  posta: number,
  differenza: number,
): Spiegazione => ({
  titolo: `Differenza con lo studio, ${nomeMese(mese)}`,
  cosa: "Quanto lo studio addebita meno quanto risulta dalle fatture della posta. Zero = tornano.",
  calcolo: [
    { voce: "Addebito dello studio", valore: studio },
    { voce: "Dalla posta", valore: posta, segno: "-" },
    { voce: "Differenza", valore: differenza, segno: "=" },
  ],
  fonte:
    'mail dello studio "Addebito ritenute d\'acconto" e posta di fattureagenzia',
});

/** A single figure read as it is (an instalment, a debit): its source and what it is. */
export const spiegaCifra = (
  titolo: string,
  valore: number,
  cosa: string,
  fonte: string,
): Spiegazione => ({
  titolo,
  cosa,
  calcolo: [{ voce: titolo, valore: tondo(valore), segno: "=" }],
  fonte,
});
