import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { type MutuiInfo, MutuiBlocco } from "./Mutui";

// Invented data: real agency figures never go into the repository.
vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({}),
}));

const info = (overrides: Partial<MutuiInfo> = {}): MutuiInfo => ({
  estratto_al: "2030-03-10",
  anno: 2030,
  mutui: [
    {
      numero: "111111",
      nome: "Mutuo di prova",
      tasso: 2.5,
      taeg: null,
      stipula: "2020-01-15",
      importo_stipulato: 1000,
      debito_residuo: 420,
      ultima_rata: { rata: 2, data: "2030-03-10", importo: 105 },
      prossima: { rata: 3, scadenza: "2030-04-10", importo: 425 },
      rate_mancanti: 1,
      fine: "2030-04-10",
      interessi_anno: 13,
      oneri_anno: 22,
      capitale_anno: 580,
    },
  ],
  totale_debito: 420,
  rata_mese: 425,
  anni: [
    {
      anno: 2030,
      interessi: 16,
      oneri: 24,
      capitale: 1000,
      dall_estratto: 3,
      dal_piano: 1,
    },
  ],
  controllo: [
    {
      mutuo: "111111",
      rata: 2,
      tipo: "rata",
      data: "2030-03-10",
      importo: 104.76,
      interessi: 4.76,
      capitale: 90,
      oneri: 10,
      piano: true,
      piano_importo: 105,
      diff_importo: -0.24,
      diff_interessi: -0.24,
      da_guardare: false,
      motivo: "",
    },
  ],
  da_guardare: 0,
  non_pagate: [],
  soglia: 1,
  nota: "Nota di prova.",
  ...overrides,
});

describe("MutuiBlocco", () => {
  it("shows total debt, the next instalment and the yearly cost", async () => {
    const screen = await render(<MutuiBlocco m={info()} />);
    await expect.element(screen.getByText("Debito totale")).toBeVisible();
    await expect
      .element(screen.getByText(/Prossime rate il 10\/0?4\/2030/))
      .toBeVisible();
    await expect.element(screen.getByText("Mutuo di prova")).toBeVisible();
    await expect.element(screen.getByText("Anno per anno")).toBeVisible();
    await expect
      .element(screen.getByText("3 rate dall'estratto, 1 dal piano"))
      .toBeVisible();
    await expect.element(screen.getByText("40,00 €")).toBeVisible();
  });

  it("says nothing to check when differences stay under the threshold", async () => {
    const screen = await render(<MutuiBlocco m={info()} />);
    await expect.element(screen.getByText(/nessuna da guardare/)).toBeVisible();
  });

  it("counts instalments to check and lists unpaid ones", async () => {
    const screen = await render(
      <MutuiBlocco
        m={info({
          da_guardare: 1,
          non_pagate: [{ mutuo: "111111", rata: 3, scadenza: "2030-04-10" }],
        })}
      />,
    );
    await expect.element(screen.getByText("1 da guardare")).toBeVisible();
    await screen.getByText("Rate pagate contro il piano").click();
    await expect
      .element(screen.getByText(/non si vede nell'estratto/))
      .toBeVisible();
  });
});
