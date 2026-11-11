import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { DecadeH, type RiepilogoH } from "./DecadeH";

// Invented data: real agency figures never go into the repository.
const r: RiepilogoH = {
  ultimo_giorno_bo: "2030-01-09",
  soglia: { euro: 1, percento: 2 },
  nota: "nota di prova",
  decadi: [
    {
      data: "2030-01-10",
      valuta_bonifico: "2030-01-17",
      quadra: false,
      quadratura: {
        premi: { riepilogo: 100, calcolato: 100, ok: true },
        provvigioni: { riepilogo: 20, calcolato: 19, ok: false },
        direzione: {
          riepilogo: -3,
          calcolato: -3,
          ok: true,
          solo_riscontro: true,
        },
      },
      conteggi: {
        titoli: 10,
        uguali_bo: 8,
        non_ancora_in_bo: 2,
        controllati: 7,
        fuori_aliquota: 1,
        scarto_fuori_aliquota: -4.5,
      },
      provvigioni_senza_titolo: { "16IA PROVA": 1.5 },
      totale_senza_titolo: 1.5,
      direzione: [
        { voce: "7501 STORNO", righe: 1, importo: 2 },
        { voce: "8001 CONTRIBUTO", righe: 3, importo: -5 },
      ],
      note: ["nota della decade"],
    },
  ],
};

describe("DecadeH", () => {
  it("says when a decade does not match its summary and which figure is off", async () => {
    const screen = await render(<DecadeH r={r} />);
    await expect
      .element(screen.getByText("Non torna col riepilogo"))
      .toBeVisible();
    await expect
      .element(screen.getByText("Decade del 10/01/2030"))
      .toBeVisible();
    await expect.element(screen.getByText(/19,00/)).toBeVisible();
  });

  it("shows titles still waiting for BO, out-of-rate titles and head-office debits", async () => {
    const screen = await render(<DecadeH r={r} />);
    await expect
      .element(screen.getByText(/Non ancora in BO \(dati BO al 09\/01\/2030\)/))
      .toBeVisible();
    await expect.element(screen.getByText(/-4,50/)).toBeVisible();
    await expect.element(screen.getByText(/addebito 2,00/)).toBeVisible();
    await expect.element(screen.getByText(/a favore 5,00/)).toBeVisible();
  });

  it("explains where to put the files when no decade has been read", async () => {
    const screen = await render(<DecadeH r={{}} />);
    await expect
      .element(screen.getByText(/Nessuna decade letta/))
      .toBeVisible();
  });
});
