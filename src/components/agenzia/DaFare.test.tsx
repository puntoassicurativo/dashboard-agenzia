import { describe, expect, it } from "vitest";

import { cosaDaFare } from "./DaFare";

// Invented data: real agency figures never go into the repository.
const oggi = new Date("2030-04-16T12:00:00");

describe("cosaDaFare", () => {
  it("lists missing transfers, missing or unpaid invoices and the week's deadlines, without amounts", () => {
    const voci = cosaDaFare(
      oggi,
      [
        {
          decade: "2030-03-31",
          subagente: "Alfa",
          stato: "x",
          versamento: "non_arrivato",
        },
        {
          decade: "2030-04-10",
          subagente: "Beta",
          stato: "x",
          versamento: "diverso",
        },
        {
          decade: "2030-04-10",
          subagente: "Gamma",
          stato: "x",
          versamento: "versato",
        },
      ],
      [
        {
          mese: "2030-03",
          subagente: "Alfa",
          arrivata: false,
          pagata: false,
          con_decadi: true,
        },
        {
          mese: "2030-03",
          subagente: "Beta",
          arrivata: true,
          pagata: false,
          con_decadi: true,
        },
        {
          mese: "2030-03",
          subagente: "Gamma",
          arrivata: true,
          pagata: true,
          con_decadi: true,
        },
      ],
      [
        { scadenza: "2030-04-16", cosa: "F24 del 16", stato: "da fare" },
        { scadenza: "2030-02-01", cosa: "Vecchia", stato: "in ritardo" },
      ],
    );
    expect(voci).toEqual([
      "Alfa, decade del 31/3/2030: versamento non arrivato".replace(
        "31/3/2030",
        new Date("2030-03-31T12:00:00").toLocaleDateString("it-IT"),
      ),
      "Beta, decade del 10/4/2030: versamento diverso dalla mail".replace(
        "10/4/2030",
        new Date("2030-04-10T12:00:00").toLocaleDateString("it-IT"),
      ),
      "Alfa: fattura di marzo 2030 non ancora arrivata",
      "Beta: fattura di marzo 2030 non ancora pagata",
      `${new Date("2030-04-16T12:00:00").toLocaleDateString("it-IT")} F24 del 16 (da fare)`,
    ]);
    expect(voci.join(" ")).not.toMatch(/\d+,\d{2}/);
  });
});
