import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { type Anno, DaGennaio } from "./DaGennaio";

// Invented data: real agency figures never go into the repository.
const anno: Anno = {
  anno: "2030",
  mesi: ["2030-01", "2030-02", "2030-03"],
  dal: "2030-01",
  al: "2030-03",
  cassa_257: {
    entrate: 3000,
    uscite: 2400,
    utile: 600,
    prelievi_soci: 500,
    entrate_una_tantum: 300,
    su_100_uscite: 80,
  },
  voci: { entrate: {}, uscite: {}, sotto: {} },
  saldi: {
    provvigioni: 3300,
    girato: 2700,
    broker: 100,
    una_tantum: 0,
    avanzo: 500,
    altre_uscite: 0,
  },
  saldi_anno_prima: {
    provvigioni: 3000,
    girato: 2500,
    broker: 90,
    una_tantum: 0,
    avanzo: 410,
    altre_uscite: 200,
  },
  anno_prima: "2029",
  proiezione: {
    entrate: 10800,
    uscite: 9600,
    utile: 1200,
    provvigioni: 13200,
    girato: 10800,
    una_tantum_entrate: 300,
    una_tantum_uscite_saldi: 0,
    mesi_usati: 3,
  },
  in_corso: {
    mese: "2030-04",
    banca_al: "2030-04-09",
    saldi_al: "2030-04-09",
    entrate: 400,
    uscite: 350,
    provvigioni: 450,
    girato: 300,
  },
  confronto_uscite: "Le uscite dell'anno prima non si possono confrontare.",
};

vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () =>
            Promise.resolve({
              data: [
                {
                  mese: "2030",
                  valori: anno,
                  aggiornato_il: "2030-04-10T06:30:00Z",
                },
              ],
              error: null,
            }),
        }),
      }),
    }),
  }),
}));

describe("DaGennaio", () => {
  it("shows the year counter, the current month apart and the projection", async () => {
    const screen = await render(
      <QueryClientProvider client={new QueryClient()}>
        <DaGennaio />
      </QueryClientProvider>,
    );
    await expect
      .element(screen.getByRole("heading", { name: "Da gennaio a marzo 2030" }))
      .toBeVisible();
    await expect
      .element(screen.getByText(/Su 100 euro di entrate, 80 sono/))
      .toBeVisible();
    await expect
      .element(screen.getByText(/Aprile fino al giorno/))
      .toBeVisible();
    await expect.element(screen.getByText(/non sommato sopra/)).toBeVisible();
    await expect
      .element(screen.getByText("stima", { exact: true }))
      .toBeVisible();
    await expect.element(screen.getByText("+10%")).toBeVisible();
    await expect
      .element(screen.getByText(/uscite senza una descrizione chiara/))
      .toBeVisible();
    await expect
      .element(screen.getByText(/non sono uscite dell'agenzia/))
      .toBeVisible();
  });
});
