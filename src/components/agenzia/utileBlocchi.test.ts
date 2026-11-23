import { describe, expect, it } from "vitest";

import {
  type AlberoUtile,
  elencoNodo,
  linkFatture,
  type Nodo,
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
