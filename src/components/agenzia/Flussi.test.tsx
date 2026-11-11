import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import {
  csvRiepilogo,
  type Riepilogo,
  RiepilogoBlocco,
} from "./Commercialista";
import { FlussiBlocco, perSankey, SankeyFlussi } from "./Flussi";
import { Telefono } from "./Telefono";

// Invented data: real agency figures never go into the repository.
vi.mock("../atomic-crm/providers/supabase/supabase", () => ({
  getSupabaseClient: () => ({}),
}));

const riepilogo: Riepilogo = {
  codici: [
    {
      codice: "PVA",
      descrizione: "PROVA A",
      tipo: "RICAVI",
      mese: 100,
      progressivo: 300,
    },
    {
      codice: "9001",
      descrizione: 'PROVA "B"',
      tipo: "ALTRI",
      mese: -5,
      progressivo: -15,
    },
  ],
  ricavi_mese: 100,
  ricavi_progressivo: 300,
  trattenute_mese: -5,
  trattenute_progressivo: -15,
  ritenuta_mese: null,
  ritenuta_fonte: "manca",
  ritenuta_progressivo: 20,
  manuali: [
    { voce: "Voce a mano", fino_a: "2030-01", importo: 7.5, fonte: "prova" },
  ],
  fonte: "fonte di prova",
  aggiornato: "2030-03-01T06:30",
};

describe("FlussiBlocco", () => {
  it("groups flows by origin and says what is left", async () => {
    const screen = await render(
      <FlussiBlocco
        titolo="A marzo"
        b={{
          flussi: [
            {
              da: "Provvigioni maturate",
              a: "Conto gestionale 257",
              importo: 800,
            },
            {
              da: "Provvigioni maturate",
              a: "Provvigioni ai broker",
              importo: 200,
            },
            { da: "Conto gestionale 257", a: "Altre spese", importo: 500 },
            { da: "Conto gestionale 257", a: "Resta sul 257", importo: 300 },
          ],
          controllo: { sinistra: 1000, resta: 300, chiude: true },
        }}
      />,
    );
    await expect.element(screen.getByText(/entrano 1\.000/)).toBeVisible();
    await expect.element(screen.getByText(/restano 300/)).toBeVisible();
    await expect.element(screen.getByText("va a Resta sul 257")).toBeVisible();
    await expect
      .element(screen.getByText("va a Provvigioni ai broker"))
      .toBeVisible();
  });
});

describe("perSankey", () => {
  // Invented month where giro transfers exceed commissions: the difference comes from the premium account balance.
  const flussi = [
    { da: "Provvigioni maturate", a: "Conto gestionale 257", importo: 1200 },
    { da: "Provvigioni maturate", a: "Conto premi", importo: -200 },
    { da: "Conto premi", a: "Resta sul conto premi", importo: -200 },
    { da: "Conto gestionale 257", a: "Altre spese", importo: 1300 },
    { da: "Conto gestionale 257", a: "Resta sul 257", importo: -100 },
  ];

  it("turns negative flows into flows taken from the account balance", () => {
    const d = perSankey(flussi);
    expect(d.links.every((l) => l.value > 0)).toBe(true);
    expect(d.links).toContainEqual({
      source: "Preso dal saldo del conto premi",
      target: "Conto premi",
      value: 200,
    });
    expect(d.links).toContainEqual({
      source: "Conto premi",
      target: "Provvigioni maturate",
      value: 200,
    });
    expect(d.links).toContainEqual({
      source: "Preso dal saldo del 257",
      target: "Conto gestionale 257",
      value: 100,
    });
  });

  it("keeps every middle node balanced and the commissions at their own amount", () => {
    const d = perSankey(flussi);
    const somma = (id: string, lato: "source" | "target") =>
      d.links.filter((l) => l[lato] === id).reduce((t, l) => t + l.value, 0);
    for (const id of ["Conto premi", "Conto gestionale 257"]) {
      expect(somma(id, "target")).toBe(somma(id, "source"));
    }
    const p = d.nodes.find((n) => n.id === "Provvigioni maturate");
    expect(p?.netto).toBe(1000);
    expect(p?.tipo).toBe("entrata");
  });

  it("draws the chart without errors", async () => {
    const screen = await render(
      <div style={{ width: 1000 }}>
        <SankeyFlussi
          b={{
            flussi,
            controllo: { sinistra: 1000, resta: -300, chiude: true },
          }}
        />
      </div>,
    );
    await expect
      .element(screen.getByText(/Preso dal saldo del 257/))
      .toBeInTheDocument();
  });
});

describe("Riepilogo per il commercialista", () => {
  it("builds an Excel-friendly CSV with decimal commas and escaped quotes", () => {
    const csv = csvRiepilogo("2030-03", riepilogo);
    expect(csv).toContain('"PVA";"PROVA A";"RICAVI";"100,00";"300,00"');
    expect(csv).toContain('"PROVA ""B"""');
    expect(csv).toContain('"non ancora"');
    expect(csv).toContain("marzo 2030");
  });

  it("shows the year-to-date totals and the download button", async () => {
    const screen = await render(
      <RiepilogoBlocco mese="2030-03" r={riepilogo} />,
    );
    await expect
      .element(screen.getByText("Totale competenze da gennaio"))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: /Scarica il riepilogo/ }))
      .toBeVisible();
  });
});

describe("Telefono", () => {
  it("explains how to install the dashboard on iPhone and Android", async () => {
    const screen = await render(<Telefono />);
    await screen.getByText("Metti la dashboard sul telefono").click();
    await expect
      .element(screen.getByText(/Aggiungi alla schermata Home/))
      .toBeVisible();
    await expect.element(screen.getByText(/Installa app/)).toBeVisible();
  });
});
