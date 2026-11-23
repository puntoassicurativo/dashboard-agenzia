import { describe, expect, it } from "vitest";

import {
  spiegaDifferenzaRitenute,
  spiegaRitenutePosta,
  spiegaTotalePersonale,
} from "./spiegaSchede";

// Invented figures: real agency numbers never go into the repository.
describe("explanations of the partners' tabs (review R013)", () => {
  it("a payroll total adds up its payslips and its list totals the number", () => {
    const s = spiegaTotalePersonale(
      "2030-02",
      "netto",
      "Netti pagati",
      [
        { nome: "Dipendente A", netto: 1000 },
        { nome: "Dipendente B", netto: 800.5 },
      ],
      1800.5,
    );
    expect(s.calcolo?.at(-1)).toEqual({
      voce: "Totale",
      valore: 1800.5,
      segno: "=",
    });
    expect(s.elenco?.totale).toEqual(["Totale", 1800.5]);
  });

  it("the withholdings from the mailbox add up decades and invoices", () => {
    const s = spiegaRitenutePosta(
      "2030-02",
      [{ decade: "2030-02-10", subagente: "Subagente A", ritenuta: 10 }],
      [{ data: "2030-02-15", da: "Collaboratore B", ritenuta: 5 }],
      15,
    );
    const r = s.calcolo ?? [];
    expect(r.map((x) => x.valore)).toEqual([10, 5, 15]);
    expect(r.at(-1)?.segno).toBe("=");
  });

  it("the difference with the studio is studio minus mailbox", () => {
    const s = spiegaDifferenzaRitenute("2030-02", 20, 15, 5);
    expect(s.calcolo?.at(-1)?.valore).toBe(5);
  });
});
