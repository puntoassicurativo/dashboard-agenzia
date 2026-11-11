import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { CosaManca, PonteBanca, Spese222 } from "./ContoAgenzia";

// Invented data: real agency figures never go into the repository.
vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
    }),
  }),
}));
const ponte = {
  provvigioni: 1000,
  altre_entrate_257: 0,
  broker: 100,
  una_tantum_foglio: 0,
  uscite_257: 500,
  utile_agenzia: 400,
  rimasto_257: 250,
  tornato_conto_premi: 0,
  girato_desio: 100,
  rimasto_conto_premi: 50,
};

describe("ContoAgenzia", () => {
  it("shows both sides of the bank bridge with the same total", async () => {
    const screen = await render(<PonteBanca p={ponte} mese="marzo" />);
    await expect
      .element(screen.getByText("Dove sono finite le provvigioni di marzo"))
      .toBeVisible();
    await expect.element(screen.getByText("Utile dell'agenzia")).toBeVisible();
    await expect.element(screen.getByText(/400,00/)).toBeVisible();
    await expect
      .element(screen.getByText("girato al conto gestionale di Banco Desio"))
      .toBeVisible();
    // the returns row only appears when there is something
    expect(screen.container.textContent).not.toMatch(/tornato dal 257/);
  });

  it("lists premium-account expenses with the proposal preselected in each picker", async () => {
    const screen = await render(
      <QueryClientProvider client={new QueryClient()}>
        <Spese222
          voci={["Neutro (non è una spesa)", "Utenze e telefonia"]}
          applicate={[]}
          spese={[
            {
              chi: "Fornitore di prova",
              movimenti: [
                { data: "2030-01-15", importo: 500, chiave: "222|prova|1" },
              ],
              totale: 500,
              proposta: "Neutro (non è una spesa)",
              nota: "da guardare",
            },
          ]}
        />
      </QueryClientProvider>,
    );
    await screen.getByText(/Spese pagate dal conto premi 222/).click();
    await expect
      .element(
        screen.getByText(/entra nei conti solo quando qualcuno la sceglie/),
      )
      .toBeVisible();
    await expect
      .element(screen.getByLabelText("Voce"))
      .toHaveValue("Neutro (non è una spesa)");
    await expect
      .element(
        screen.getByText(/Proposta: Neutro \(non è una spesa\), da guardare/),
      )
      .toBeVisible();
  });

  it("lists what is still missing", async () => {
    const screen = await render(<CosaManca voci={["Carte di prova"]} />);
    await expect.element(screen.getByText("Carte di prova")).toBeVisible();
  });
});
