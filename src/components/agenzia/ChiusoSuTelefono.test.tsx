import { afterEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { ChiusoSuTelefono } from "./ChiusoSuTelefono";
import { ErroreCaricamento } from "./ErroreCaricamento";

afterEach(async () => {
  await page.viewport(1366, 900);
});

describe("ChiusoSuTelefono", () => {
  it("shows the block open on desktop, with no title bar", async () => {
    await page.viewport(1366, 900);
    const screen = await render(
      <ChiusoSuTelefono titolo="Dove vanno i soldi">
        <p>contenuto del blocco</p>
      </ChiusoSuTelefono>,
    );
    await expect
      .element(screen.getByText("contenuto del blocco"))
      .toBeVisible();
    expect(screen.container.querySelector("details")).toBeNull();
  });

  it("starts closed on a phone and opens on tap", async () => {
    await page.viewport(390, 800);
    const screen = await render(
      <ChiusoSuTelefono titolo="Dove vanno i soldi">
        <p>contenuto del blocco</p>
      </ChiusoSuTelefono>,
    );
    await expect
      .element(screen.getByText("contenuto del blocco"))
      .not.toBeVisible();
    await screen.getByText("Dove vanno i soldi").click();
    await expect
      .element(screen.getByText("contenuto del blocco"))
      .toBeVisible();
  });
});

describe("ErroreCaricamento", () => {
  it("shows the technical message and a reload button", async () => {
    const screen = await render(
      <ErroreCaricamento
        cosa="il foglio Saldi"
        errore={new Error("JWT expired")}
      />,
    );
    await expect
      .element(
        screen.getByText("Errore nel caricare il foglio Saldi: JWT expired"),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Ricarica la dashboard" }))
      .toBeVisible();
  });
});
