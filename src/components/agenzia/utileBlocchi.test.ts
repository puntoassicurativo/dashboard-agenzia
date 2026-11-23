import { describe, expect, it } from "vitest";

import {
  type AlberoUtile,
  elencoNodo,
  linkFatture,
  type Nodo,
  notaParziale,
  spiegaNonDeducibili,
  spiegaNodo,
  spiegaVersoFisco,
  utileFiscale,
} from "./utileBlocchi";

const laigueglia: Nodo = {
  nome: "Laigueglia (GE.MA sas)",
  importo: 120,
  perc: 34.3,
  pagamenti: [
    { mese: "2030-01", data: "2030-01-09", chi: "Ge.Ma Sas", importo: 60 },
    { mese: "2030-02", data: null, chi: "Gema Sas", importo: 60 },
  ],
};
const subagenti: Nodo = {
  nome: "Subagenti",
  importo: 200,
  perc: 57.1,
  figli: [
    laigueglia,
    { nome: "Camporosso (Teresa Martucci)", importo: 80, perc: 22.9 },
  ],
};

const albero = (): AlberoUtile => ({
  entrato: { nome: "Entrato", importo: 500, figli: [] },
  uscito: { nome: "Uscito", importo: 350, figli: [subagenti] },
  utile: 150,
  utile_modello: 150,
  dove_finito: { nome: "Dove e' finito l'utile", importo: 150 },
  al_fisco: {
    nome: "Costi non deducibili",
    importo: 15,
    utile_fiscale: 165,
    figli: [{ nome: "Auto (rata BMW Bank)", importo: 15 }],
  },
  parziale: false,
  controllo: { chiude: true, errori: [], non_abbinato: 0 },
});

describe("utile a blocchi", () => {
  it("lists the single payments of a leaf with the day, or the month when the day is missing", () => {
    const e = elencoNodo(laigueglia, "da gennaio 2030");
    expect(e?.righe).toEqual([
      ["09/01/2030", "Ge.Ma Sas", 60],
      ["febbraio 2030", "Gema Sas", 60],
    ]);
    expect(e?.totale).toEqual(["Totale", null, 120]);
  });

  it("explains a block as the sum of its children", () => {
    const s = spiegaNodo(subagenti, "uscito", "da gennaio 2030");
    expect(s.calcolo?.map((r) => [r.voce, r.valore, r.segno])).toEqual([
      ["Laigueglia (GE.MA sas)", 120, undefined],
      ["Camporosso (Teresa Martucci)", 80, "+"],
      ["Subagenti", 200, "="],
    ]);
    expect(s.elenco?.colonne).toEqual(["Voce", "Quota", "Importo"]);
  });

  it("opens the Fatture page filtered on the sub-agent and on a broker by name", () => {
    expect(linkFatture(laigueglia)).toBe(
      "/fatture?tipo=subagenti&cerca=laigueglia",
    );
    expect(
      linkFatture(
        { nome: "Marradi", importo: 1 },
        { nome: "Broker", importo: 1 },
      ),
    ).toBe("/fatture?tipo=broker&cerca=marradi");
    expect(
      linkFatture({ nome: "Personale dipendente", importo: 1 }),
    ).toBeNull();
  });

  it("links AB broker to the PIB rows and gives no link where no invoice exists (review R011)", () => {
    const broker: Nodo = { nome: "Broker", importo: 1 };
    expect(linkFatture({ nome: "AB broker", importo: 1 }, broker)).toBe(
      "/fatture?tipo=broker&cerca=pib",
    );
    expect(linkFatture({ nome: "ABI", importo: 1 }, broker)).toBeNull();
    expect(
      linkFatture({ nome: "Assicura Point", importo: 1 }, broker),
    ).toBeNull();
    expect(linkFatture({ nome: "Commercialista", importo: 1 })).toBeNull();
    expect(
      linkFatture({ nome: "Altre spese e fatture", importo: 1 }),
    ).toBeNull();
    expect(
      linkFatture({ nome: "Commercialista", importo: 1 }, undefined, true),
    ).toBe("/fatture?cerca=giribaldi");
  });

  it("keeps a long hover calculation short and still adding up (review R010)", () => {
    const figli: Nodo[] = Array.from({ length: 17 }, (_, i) => ({
      nome: `Voce ${i + 1}`,
      importo: 17 - i,
    }));
    const n: Nodo = { nome: "Altre spese", importo: 153, figli };
    const righe = spiegaNodo(n, "uscito", "da gennaio 2030").calcolo ?? [];
    expect(righe.length).toBeLessThanOrEqual(8);
    const somma = righe
      .filter((r) => r.segno !== "=")
      .reduce((t, r) => t + Number(r.valore), 0);
    expect(somma).toBe(153);
    expect(righe.at(-1)).toEqual({
      voce: "Altre spese",
      valore: 153,
      segno: "=",
    });
    expect(righe.at(-2)?.voce).toBe("altre 11 voci");
  });

  it("says a past month is incomplete, not still running (review R053)", () => {
    const oggi = new Date(2030, 10, 23);
    expect(notaParziale("2030-11", { parziale: true }, oggi)).toContain(
      "non ancora finito",
    );
    const vecchio = notaParziale(
      "2029-11",
      { parziale: true, dal: "2029-11-10", al: "2029-11-28" },
      oggi,
    );
    expect(vecchio).toBe(
      "Mese incompleto: gli estratti conto coprono solo dal 10/11/2029 al 28/11/2029.",
    );
    expect(notaParziale("2029-11", { parziale: false }, oggi)).toBeNull();
  });

  it("explains a leaf without payments with the steps written by the run (review R055)", () => {
    const n: Nodo = {
      nome: "Provvigioni maturate (foglio Saldi)",
      importo: 150,
      passi: [
        { voce: "righe del foglio Saldi", importo: 140 },
        { voce: "correzione con BO", importo: 10 },
      ],
    };
    const s = spiegaNodo(n, "entrato", "ottobre 2030");
    expect(s.calcolo?.map((r) => r.valore)).toEqual([140, 10, 150]);
    expect(elencoNodo(n, "ottobre 2030")?.totale).toEqual(["Totale", 150]);
  });

  it("explains the non-deductible costs with their own words (review R016f)", () => {
    const s = spiegaNonDeducibili(albero(), "da gennaio 2030");
    expect(String(s.cosa)).toContain("per le tasse non contano");
    expect(s.titolo).toContain("Costi non deducibili");
  });

  it("adds the non-deductible costs and ARAG to reach the taxable profit", () => {
    const a = albero();
    expect(utileFiscale(a, 10)).toBe(175);
    const s = spiegaVersoFisco(a, "da gennaio 2030", 10);
    expect(s.calcolo?.at(-1)).toEqual({
      voce: "Utile fiscale",
      valore: 175,
      segno: "=",
    });
  });
});
