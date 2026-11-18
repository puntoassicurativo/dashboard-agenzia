import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import {
  type DomandaStudio,
  ElencoDomande,
  testoDaCopiare,
} from "./DomandeStudio";

// Invented data: real agency figures never go into the repository.
vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({}),
}));

const domanda = (overrides: Partial<DomandaStudio> = {}): DomandaStudio => ({
  id: "prova",
  tema: "Costi",
  domanda: "Domanda di prova?",
  pagina: "Pagina di prova",
  dal: "2030-01-10",
  stato: "aperta",
  ...overrides,
});

describe("DomandeStudio", () => {
  const domande = [
    domanda(),
    domanda({ id: "b", domanda: "Seconda domanda?", stato: "chiesta" }),
    domanda({
      id: "c",
      domanda: "Domanda chiusa?",
      stato: "risposta",
      risposta: "Risposta di prova.",
      risposta_il: "2030-01-20",
    }),
  ];

  it("copies only the questions still to answer, numbered on their own line", () => {
    expect(testoDaCopiare(domande).split("\n").slice(1)).toEqual([
      "1) Domanda di prova?",
      "2) Seconda domanda?",
    ]);
  });

  it("keeps answered questions in the list with their answer", async () => {
    const screen = await render(<ElencoDomande domande={domande} />);
    await expect
      .element(screen.getByText(/Risposta del 20\/01\/2030/))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("button", { name: "Copia le 2 domande da fare" }),
      )
      .toBeVisible();
  });
});
