import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { SimulaTasse } from "./SimulaTasse";
import { flatRateTaxes, parseAmount, simulate, splitTaxes } from "./tasse";

// Reference values computed with the agent's own formula (fiscale.py `tasse`) on an invented profit.
describe("splitTaxes", () => {
  it("matches the agent formula on a 50/50 split", () => {
    const s = splitTaxes(170000, 50, 0);
    expect(s.irap).toBe(6630);
    expect(s.partners[0]).toEqual({
      share: 85000,
      inps: 20808,
      irpef: 19802.56,
      surtax: 1604.8,
      total: 42215.36,
    });
    expect(s.total).toBe(91060.72);
  });

  it("taxes the two partners separately on an uneven split", () => {
    const s = splitTaxes(170000, 49, 0);
    expect(s.partners[0].irpef).toBe(19250.51);
    expect(s.partners[1].irpef).toBe(20354.61);
  });

  it("subtracts the withholdings and spreads the rest over twelve months", () => {
    const s = splitTaxes(170000, 50, 12000);
    expect(s.stillToPay).toBe(79060.72);
    expect(s.perMonth).toBe(6588.39);
  });
});

describe("parseAmount", () => {
  it("reads amounts typed the Italian way and rejects text", () => {
    expect(parseAmount("170.000")).toBe(170000);
    expect(parseAmount("€ 1.234,56")).toBe(1234.56);
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
  });
});

describe("flatRateTaxes", () => {
  it("applies Fabio's rule: 5% tax and 25% INPS on 78% of the invoice", () => {
    expect(flatRateTaxes(10000)).toEqual({
      base: 7800,
      tax: 390,
      inps: 1950,
      total: 2340,
    });
  });
});

describe("simulate", () => {
  const flat = { coefficient: 78, tax: 5, inps: 25 };

  it("lowers the profit by the pieces and adds the flat-rate person's taxes", () => {
    const s = simulate(
      170000,
      [
        { label: "Fattura di prova", amount: 10000, flatRate: true },
        { label: "Costo di prova", amount: 5000, flatRate: false },
      ],
      50,
      0,
      flat,
    );
    expect(s.profit).toBe(155000);
    expect(s.recipientsTotal).toBe(2340);
    expect(s.grandTotal).toBe(
      Math.round((splitTaxes(155000, 50, 0).total + 2340) * 100) / 100,
    );
    expect(s.saving).toBe(
      Math.round((splitTaxes(170000, 50, 0).total - s.grandTotal) * 100) / 100,
    );
  });
});

describe("SimulaTasse", () => {
  const props = {
    finoAOggi: "Fino a oggi",
    daGennaio: { utile: 100000, ritenute: 0 },
    proiezione: { utile: 170000, ritenute: 0 },
    previsti: [{ voce: "Fattura di Silvia di prova", resta: 10000 }],
  };

  it("shows the three simulations side by side", async () => {
    const screen = await render(<SimulaTasse {...props} />);
    await expect
      .element(screen.getByText("Fine anno, se si continua così"))
      .toBeVisible();
    await expect
      .element(screen.getByText("I tuoi numeri", { exact: true }).first())
      .toBeVisible();
    // projection column: 91.061 of taxes on 170.000, as the agent formula
    await expect.element(screen.getByText(/91\.061/).first()).toBeVisible();
    // the expected invoice starts as a flat-rate piece: its taxes are in the table
    await expect.element(screen.getByText(/2\.340/).first()).toBeVisible();
  });

  it("recomputes when a piece is added", async () => {
    const screen = await render(<SimulaTasse {...props} previsti={[]} />);
    await screen.getByRole("button", { name: "Aggiungi una voce" }).click();
    await screen.getByLabelText("Importo (euro)").fill("20.000");
    await expect
      .element(screen.getByText(/le imposte di tutti insieme scendono di/))
      .toBeVisible();
  });

  it("shows a message instead of the free column when the profit is not a number", async () => {
    const screen = await render(<SimulaTasse {...props} />);
    await screen
      .getByLabelText("Utile fiscale di partenza (euro)")
      .fill("tanto");
    await expect
      .element(screen.getByText(/Scrivi l'utile di partenza in euro/))
      .toBeVisible();
  });
});
