import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import {
  ATTESA_MASSIMA_MS,
  type Domanda,
  SchedaDomanda,
  statoDomanda,
} from "./ChiediCondizioni";
import { ElencoFatture, unisci } from "./TutteLeFatture";

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

describe("TutteLeFatture", () => {
  const righe = unisci(
    {
      "2030-02|PAESE": {
        fattura: {
          chi: "PAESE",
          numero: "4",
          data: "2030-03-05",
          periodo: "2030-02",
          imponibile: 1000,
          ritenuta: 115,
          netto: 887,
        },
        bonifico: { data: "2030-03-10", importo: 887 },
        bonifico_diverso: null,
      },
      "2030-03|PROVA": {
        fattura: {
          chi: "PROVA",
          numero: "9",
          data: "2030-04-02",
          periodo: "2030-03",
          imponibile: 500,
          ritenuta: 57.5,
          netto: 442.5,
        },
        bonifico: null,
        bonifico_diverso: null,
      },
    },
    {
      "2030-02": {
        righe: [
          {
            broker: "Broker di prova",
            mese: "2030-02",
            provvigioni: 200,
            ritenuta: 9.2,
            netto: 190.8,
            tipo: "estratto",
            arrivato: "2030-03-03",
            mese_saldi: "2030-03",
            uscita_saldi: 190.8,
          },
        ],
      },
    },
    {},
    [
      {
        data: "2030-04-07",
        fornitore: "Luce di prova",
        importo: 90,
        pagata_il: null,
        stato: "da pagare",
      },
    ],
  );

  it("puts every invoice in one list, newest first", () => {
    expect(righe.map((r) => r.data)).toEqual([
      "2030-04-07",
      "2030-04-02",
      "2030-03-05",
      "2030-03-03",
    ]);
  });

  it("shows paid and unpaid invoices", async () => {
    const screen = await render(<ElencoFatture righe={righe} />);
    await expect.element(screen.getByText(/^Paese/)).toBeVisible();
    await expect.element(screen.getByText(/^Prova/)).toBeVisible();
    await expect.element(screen.getByText("da pagare")).toBeVisible();
  });
});
