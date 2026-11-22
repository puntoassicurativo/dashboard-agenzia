import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

import { type Spiegazione, Spiegato } from "./Spiega";

// Invented figures: real agency numbers never go into the repository.
const spiega: Spiegazione = {
  titolo: "Protezione di gennaio 2030",
  cosa: "Incassi delle polizze vita di protezione.",
  calcolo: [
    { voce: "Temporanee caso morte", valore: 300, segno: "+" },
    { voce: "Long Term Care", valore: 100, segno: "+" },
    { voce: "Protezione", valore: 400, segno: "=" },
  ],
  fonte: "report di prova",
  elenco: {
    titolo: "Protezione di gennaio, prodotto per prodotto",
    colonne: ["Prodotto", "2030"],
    righe: [
      ["TCM 107V", 300],
      ["LTC 112C", 100],
    ],
    totale: ["Totale", 400],
  },
};

const numero = () => (
  <p>
    Protezione: <Spiegato spiega={spiega}>400 euro</Spiegato>
  </p>
);

describe("Spiegato", () => {
  it("opens the calculation and the source when the mouse goes over the number", async () => {
    const screen = await render(numero());
    await userEvent.hover(
      screen.getByRole("button", { name: /come si calcola/ }),
    );
    await expect.element(screen.getByText("Long Term Care")).toBeVisible();
    await expect
      .element(screen.getByText("Fonte: report di prova"))
      .toBeVisible();
    await expect
      .element(screen.getByText("oppure clic sul numero"))
      .toBeVisible();
  });

  it("opens the full list with its total on a mouse click", async () => {
    const screen = await render(numero());
    await screen.getByRole("button", { name: /come si calcola/ }).click();
    await expect
      .element(
        screen.getByRole("heading", {
          name: "Protezione di gennaio, prodotto per prodotto",
        }),
      )
      .toBeVisible();
    await expect.element(screen.getByText("TCM 107V")).toBeVisible();
    await expect.element(screen.getByText("Totale")).toBeVisible();
  });

  it("on a tap opens the panel first and the list from its button", async () => {
    const screen = await render(numero());
    const bottone = screen
      .getByRole("button", { name: /come si calcola/ })
      .element() as HTMLButtonElement;
    // a tap (or the keyboard) is not a mouse click: the panel opens, not the list
    bottone.dispatchEvent(
      new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true }),
    );
    bottone.click();
    await expect
      .element(screen.getByText("Temporanee caso morte"))
      .toBeVisible();
    await screen
      .getByRole("button", { name: "Elenco completo (2 righe)" })
      .click();
    await expect.element(screen.getByText("LTC 112C")).toBeVisible();
  });

  it("without a list a click keeps the panel and offers no list button", async () => {
    const screen = await render(
      <Spiegato spiega={{ ...spiega, elenco: undefined }}>400 euro</Spiegato>,
    );
    await screen.getByRole("button", { name: /come si calcola/ }).click();
    await expect.element(screen.getByText("Long Term Care")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: /Elenco completo/ }))
      .not.toBeInTheDocument();
  });
});
