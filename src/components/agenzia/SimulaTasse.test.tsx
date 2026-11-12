import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { SimulaTasse } from "./SimulaTasse";
import { parseAmount, splitTaxes } from "./tasse";

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

describe("SimulaTasse", () => {
  it("starts from the projection and recomputes when the profit changes", async () => {
    const screen = await render(
      <SimulaTasse defaultProfit={100000} defaultWithheld={0} />,
    );
    await expect
      .element(screen.getByText("Resta da versare", { exact: true }))
      .toBeVisible();
    await screen
      .getByLabelText("Utile fiscale dell'anno (euro)")
      .fill("170.000");
    await expect.element(screen.getByText(/91\.061/).first()).toBeVisible();
  });

  it("shows a message instead of the table when the profit is not a number", async () => {
    const screen = await render(<SimulaTasse defaultProfit={100000} />);
    await screen.getByLabelText("Utile fiscale dell'anno (euro)").fill("tanto");
    await expect
      .element(screen.getByText(/Scrivi l'utile in euro/))
      .toBeVisible();
    expect(screen.container.textContent).not.toContain("Resta da versare");
  });
});
