import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import {
  ATTESA_MASSIMA_MS,
  type Domanda,
  SchedaDomanda,
  statoDomanda,
} from "./ChiediCondizioni";

// Invented data: real agency figures never go into the repository.
vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({}),
}));

const domanda = (overrides: Partial<Domanda> = {}): Domanda => ({
  id: 1,
  domanda: "Franchigia di prova?",
  stato: "risposta",
  risposta: "Risposta di prova (documento di prova, pag. 1).",
  creata_il: "2030-01-10T10:00:00Z",
  risposta_il: "2030-01-10T10:00:30Z",
  ...overrides,
});

describe("ChiediCondizioni", () => {
  it("shows the answer with the fixed warning under it", async () => {
    const screen = await render(
      <SchedaDomanda
        d={domanda()}
        adesso={Date.parse("2030-01-10T10:01:00Z")}
      />,
    );
    await expect.element(screen.getByText(/Risposta di prova/)).toBeVisible();
    await expect
      .element(screen.getByText(/controlla documento e pagina citati/))
      .toBeVisible();
  });

  it("says it is thinking while the question waits", () => {
    const d = domanda({ stato: "in_corso", risposta: null });
    expect(statoDomanda(d, Date.parse("2030-01-10T10:00:10Z"))).toBe(
      "Ci sto pensando...",
    );
  });

  it("warns that the PC seems off after two minutes still new", () => {
    const d = domanda({ stato: "nuova", risposta: null });
    const dopo = Date.parse(d.creata_il) + ATTESA_MASSIMA_MS + 1000;
    expect(statoDomanda(d, dopo)).toMatch(/sembra spento/);
  });
});
