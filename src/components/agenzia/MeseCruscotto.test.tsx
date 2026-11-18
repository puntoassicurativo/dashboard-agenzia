import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import {
  type MeseRiepilogo,
  periodoAnnoPrima,
  RiquadroProvvigioniMese,
  ScegliMese,
} from "./MeseCruscotto";

// Invented data: real agency figures never go into the repository.
const delta = {
  np: 0,
  ann: 0,
  delta: 0,
  np_pezzi: 0,
  ann_pezzi: 0,
  delta_pezzi: 0,
};
const mese = (overrides: Partial<MeseRiepilogo> = {}): MeseRiepilogo => ({
  mese: "2030-11",
  fino_al: "2030-11-17",
  parziale: true,
  provv: 1000,
  provv_ap: 1200,
  differenza: -200,
  cresc: -16.67,
  incassi_auto: 0,
  incassi_re: 0,
  incassi_auto_ap: 0,
  incassi_re_ap: 0,
  delta_auto: delta,
  delta_auto_ap: delta,
  delta_re: delta,
  delta_re_ap: delta,
  ...overrides,
});

describe("MeseCruscotto", () => {
  it("compares the running month with the same days of last year", () => {
    expect(periodoAnnoPrima(mese())).toBe("dal 1 al 17 novembre 2029");
  });

  it("compares a closed month with the whole month of last year", () => {
    const m = mese({ mese: "2030-10", fino_al: "2030-10-31", parziale: false });
    expect(periodoAnnoPrima(m)).toBe("ottobre 2029");
  });

  it("shows the difference in euro against last year", async () => {
    const screen = await render(<RiquadroProvvigioniMese m={mese()} />);
    await expect
      .element(screen.getByText(/Provvigioni di novembre fino al 17/))
      .toBeVisible();
    // Intl puts a non-breaking space before the euro sign: \s matches it.
    await expect.element(screen.getByText(/▼ -200\s€ sul 2029/)).toBeVisible();
  });

  it("lists the months newest first in the picker", async () => {
    const mesi = [
      mese({ mese: "2030-10", fino_al: "2030-10-31", parziale: false }),
      mese(),
    ];
    const screen = await render(
      <ScegliMese mesi={mesi} scelto="2030-11" onScegli={() => {}} />,
    );
    const opzioni = screen.getByRole("option").elements();
    expect(opzioni.map((o) => o.textContent)).toEqual([
      "novembre 2030 (fino al 17)",
      "ottobre 2030",
    ]);
  });
});
