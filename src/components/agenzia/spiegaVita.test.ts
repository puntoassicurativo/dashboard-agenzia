import { describe, expect, it } from "vitest";

import {
  spiegaNuovaProduzione,
  spiegaProtezioneNp,
  type VitaInfo,
} from "./spiegaVita";

// Invented figures.
const totali = {
  annui: 0,
  unici: 0,
  pens: 0,
  prot: 0,
  vita: 0,
  aggiuntivi: 0,
  totale: 0,
};
const info = (prot?: number): VitaInfo => ({
  dati_al: "2030-11-24",
  dati_al_ap: "2029-11-24",
  ytd: totali,
  ytd_ap: totali,
  diff: { vita: 0, prot: 0 },
  cresc: { vita: null, prot: null },
  np_fino_a: "2030-10",
  np_ytd: {
    ac: {
      annui: 400,
      unici: 100,
      aggiuntivi: 50,
      totale: 550,
      ...(prot != null ? { prot, prot_pezzi: 5 } : {}),
    },
    ap: {
      annui: 0,
      unici: 0,
      aggiuntivi: 0,
      totale: 0,
      prot: 90,
      prot_pezzi: 2,
    },
  },
  np_prot_prodotti: {
    ac: [
      {
        codice: "107Z",
        descrizione: "Temporanea",
        tipo: "annui",
        premio: 250.5,
        pezzi: 4,
      },
      {
        codice: "112T",
        descrizione: "Protezione",
        tipo: "annui",
        premio: 49.5,
        pezzi: 1,
      },
    ],
    ap: [],
  },
});

describe("protection inside the new life production", () => {
  it("the products add up to the protection figure and the pieces are said", () => {
    const s = spiegaProtezioneNp(info(300));
    const calcolo = s?.calcolo ?? [];
    const somma = calcolo
      .filter((r) => r.segno === "+")
      .reduce((t, r) => t + (r.valore as number), 0);
    expect(somma).toBe(300);
    expect(calcolo.find((r) => r.segno === "=")?.valore).toBe(300);
    expect(calcolo).toContainEqual({ voce: "Polizze", valore: "5" });
    expect(s?.elenco?.totale).toEqual(["Totale", "5", 300]);
  });

  it("the new production says 'di cui protezione'", () => {
    expect(spiegaNuovaProduzione(info(300))?.calcolo).toContainEqual({
      voce: "di cui protezione (5 polizze)",
      valore: 300,
    });
  });

  it("an older cache without protection shows nothing new", () => {
    expect(spiegaProtezioneNp(info())).toBeUndefined();
  });
});
