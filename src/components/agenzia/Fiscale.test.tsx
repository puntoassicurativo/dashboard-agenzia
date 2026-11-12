import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { AvvisoUtile, type Fiscale, FiscaleBlocco } from "./Fiscale";

// Invented data: real agency figures never go into the repository.
vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({}),
}));

const col = (utileFiscale: number) => ({
  provvigioni: 1000,
  pna: 100,
  altre: 0,
  ricavi: 1100,
  costi: 600,
  utile: 500,
  deducibili: 550,
  non_deducibili: { "Voce di prova": 50 },
  utile_fiscale: utileFiscale,
  irap: 21,
  quota_socio: 275,
  inps_socio: 67,
  irpef_socio: 48,
  addizionali_socio: 5,
  tasse_socio: 120,
  tasse_due_soci: 240,
  ritenute: 30,
  resta_da_versare: 231,
  prelievi_soci: 400,
});
const fiscale = (proiettato: number, avviso: boolean): Fiscale => ({
  anno: "2030",
  dal: "2030-01",
  al: "2030-02",
  mesi_usati: 2,
  da_gennaio: col(550),
  proiezione: col(proiettato),
  per_mese: { "2030-02": { provvigioni: 500, utile: 250, utile_fiscale: 275 } },
  avviso,
  soglia: 3000,
  da_confermare: ["Voce da confermare"],
  ipotesi: ["Ipotesi di prova."],
});

describe("FiscaleBlocco", () => {
  it("shows both columns, the month box and the non-deductible costs", async () => {
    const screen = await render(
      <FiscaleBlocco f={fiscale(3300, false)} mese="2030-02" />,
    );
    await expect
      .element(screen.getByText("Da gennaio a febbraio 2030"))
      .toBeVisible();
    await expect
      .element(screen.getByText("Proiezione a dicembre (stima)"))
      .toBeVisible();
    await expect
      .element(screen.getByText("Utile fiscale stimato"))
      .toBeVisible();
    await expect
      .element(screen.getByText(/di provvigioni di febbraio/))
      .toBeVisible();
    await expect
      .element(screen.getByText(/Costi che non si deducono: Voce di prova/))
      .toBeVisible();
    await expect
      .element(screen.getByText(/la dà Mauro con la dichiarazione/))
      .toBeVisible();
    await expect
      .element(screen.getByText("Simula le tasse con il tuo utile"))
      .toBeVisible();
  });

  it("warns only when the projected taxable profit is above the threshold", async () => {
    const sopra = await render(<AvvisoUtile f={fiscale(3300, true)} />);
    await expect.element(sopra.getByText(/sopra la soglia di/)).toBeVisible();
    const sotto = await render(<AvvisoUtile f={fiscale(1000, false)} />);
    expect(sotto.container.textContent).toBe("");
  });
});
