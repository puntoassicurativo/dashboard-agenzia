import { describe, expect, it } from "vitest";

import { vociDaDecidere } from "./DaDecidere";

// Invented data: real agency figures never go into the repository.
const attesa = (importo: number) => ({
  chi: "Fornitore di prova",
  date: ["2030-02-03"],
  nota: null,
  importo,
  proposta: null,
});

describe("Da decidere", () => {
  it("nothing waiting: no lines, the band stays hidden", () => {
    expect(
      vociDaDecidere(
        "2030-02-10",
        [{ scadenza: "2030-02-20", cosa: "F24 futuro", stato: "da fare" }],
        [{ stato: "pagata", importo: 100 }],
        [{ mese: "2030-02", righe: [] }],
      ),
    ).toEqual([]);
  });

  it("one late deadline is shown by name", () => {
    const voci = vociDaDecidere(
      "2030-02-10",
      [{ scadenza: "2030-02-01", cosa: "Rata vecchia", stato: "da fare" }],
      [],
      [],
    );
    expect(voci).toEqual([
      {
        testo: "Rata vecchia",
        dove: "/da-fare?lista=scadenze",
        ritardo: "scadenza 01/02/2030",
      },
    ]);
  });

  it("late deadlines first (one line with the count), then invoices to pay, payments to confirm, invoices to check", () => {
    const voci = vociDaDecidere(
      "2030-02-10",
      [
        { scadenza: "2030-02-16", cosa: "F24 del 16", stato: "in ritardo" },
        { scadenza: "2030-02-01", cosa: "Rata vecchia", stato: "da fare" },
        { scadenza: "2030-02-05", cosa: "Già pagata", stato: "fatto" },
        // older than a month: only in Da fare
        { scadenza: "2029-12-01", cosa: "Antica", stato: "in ritardo" },
      ],
      [
        { stato: "da pagare", importo: 100.5 },
        { stato: "da pagare", importo: 20 },
        { stato: "da verificare", importo: 7 },
        { stato: "pagata", importo: 999 },
      ],
      [
        { mese: "2030-01", righe: [attesa(10)] },
        { mese: "2030-02", righe: [attesa(5), attesa(2.25)] },
      ],
    );
    expect(voci.map((v) => v.testo)).toEqual([
      "2 scadenze in ritardo nell'ultimo mese",
      "2 fatture da pagare, 121 €",
      "3 pagamenti del conto premi da confermare, 17 €",
      "1 fattura da verificare, 7 €",
    ]);
    expect(voci[0].ritardo).toBe("la più vecchia del 01/02/2030");
    expect(voci[0].dove).toBe("/da-fare?lista=scadenze");
    expect(voci[1].ritardo).toBeUndefined();
    expect(voci[1].dove).toBe("/fatture?stato=da%20pagare");
    // payments in two months: Utile e costi on its default period
    expect(voci[2].dove).toBe("/utile-costi");
    expect(
      vociDaDecidere(
        "2030-02-10",
        [],
        [],
        [{ mese: "2030-02", righe: [attesa(5)] }],
      )[0].dove,
    ).toBe("/utile-costi?periodo=2030-02");
    expect(voci[3].dove).toBe("/fatture?stato=da%20verificare");
  });
});
