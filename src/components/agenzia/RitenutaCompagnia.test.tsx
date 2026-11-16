import { describe, expect, it } from "vitest";

import { type ControlloRitenuta, frase } from "./RitenutaCompagnia";

// Invented data: real agency figures never go into the repository.
const base: ControlloRitenuta = {
  base: 1000,
  attesa: 46,
  perc: 4.6,
  trattenuta: 45,
  decadi: ["2030-04-30"],
  differenza: -1,
  base_vittoria: 978.26,
  diff_base: -21.74,
  stima_vittoria: 45,
};

describe("frase", () => {
  it("compares the withheld amount with 4.6% of commissions and PNA", () => {
    expect(frase(base)).toMatch(
      /^Ritenuta trattenuta 45,00\s€ \(decade del 30\/04\/2030\), 4,6% di provvigioni e PNA del mese prima 46,00\s€, differenza -1,00\s€\. Base di Vittoria diversa di -21,74\s€\.$/,
    );
  });

  it("omits the Vittoria base when it matches within one euro", () => {
    expect(frase({ ...base, diff_base: 0.5 })).not.toMatch(/Base di Vittoria/);
  });

  it("says when the decade file of the following month is not available", () => {
    expect(
      frase({ ...base, trattenuta: null, differenza: null, decadi: [] }),
    ).toMatch(
      /^File della decade del mese dopo non disponibile\. 4,6% di provvigioni e PNA 46,00\s€, stima sulla base di Vittoria 45,00\s€\.$/,
    );
  });
});
