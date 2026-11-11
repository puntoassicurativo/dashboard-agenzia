import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { CosaManca, PonteBanca, Spese222 } from "./ContoAgenzia";

// Dati inventati: nel repository non vanno numeri veri dell'agenzia.
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
  it("il ponte mostra le due colonne con lo stesso totale", async () => {
    const screen = await render(<PonteBanca p={ponte} mese="marzo" />);
    await expect
      .element(screen.getByText("Dove sono finite le provvigioni di marzo"))
      .toBeVisible();
    await expect.element(screen.getByText("Utile dell'agenzia")).toBeVisible();
    await expect.element(screen.getByText(/400,00/)).toBeVisible();
    await expect
      .element(screen.getByText("girato al conto gestionale di Banco Desio"))
      .toBeVisible();
    // la riga dei ritorni compare solo se c'e' qualcosa
    expect(screen.container.textContent).not.toMatch(/tornato dal 257/);
  });

  it("le spese del conto premi hanno la proposta e non sono nei costi", async () => {
    const screen = await render(
      <Spese222
        spese={[
          {
            chi: "Fornitore di prova",
            movimenti: [{ data: "2030-01-15", importo: 500 }],
            totale: 500,
            proposta: "Neutro (non è una spesa)",
            nota: "da guardare",
          },
        ]}
      />,
    );
    await screen.getByText(/Spese pagate dal conto premi 222/).click();
    await expect
      .element(screen.getByText(/per ora nessuna è contata nei costi/))
      .toBeVisible();
    await expect
      .element(
        screen.getByText(/Proposta: Neutro \(non è una spesa\), da guardare/),
      )
      .toBeVisible();
  });

  it("elenca cosa manca", async () => {
    const screen = await render(<CosaManca voci={["Carte di prova"]} />);
    await expect.element(screen.getByText("Carte di prova")).toBeVisible();
  });
});
