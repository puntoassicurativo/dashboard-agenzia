import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { Sezione } from "./Sezione";

beforeEach(() => {
  window.localStorage.clear();
});

describe("Sezione", () => {
  it("starts closed at desktop width, with the summary on the title line", async () => {
    await page.viewport(1366, 900);
    const screen = await render(
      <Sezione id="prova" titolo="Dove vanno i soldi" riassunto="girato 100">
        <p>contenuto del blocco</p>
      </Sezione>,
    );
    await expect.element(screen.getByText("girato 100")).toBeVisible();
    expect(screen.container.textContent).not.toMatch(/contenuto del blocco/);
  });

  it("opens on click and remembers it for the next visit", async () => {
    const screen = await render(
      <Sezione id="ricorda" titolo="Dove vanno i soldi">
        <p>contenuto del blocco</p>
      </Sezione>,
    );
    await screen.getByText("Dove vanno i soldi").click();
    await expect
      .element(screen.getByText("contenuto del blocco"))
      .toBeVisible();
    const again = await render(
      <Sezione id="ricorda" titolo="Seconda volta">
        <p>aperto da solo</p>
      </Sezione>,
    );
    await expect.element(again.getByText("aperto da solo")).toBeVisible();
  });

  it("still works when the browser storage throws", async () => {
    const spia = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    try {
      const screen = await render(
        <Sezione id="bloccato" titolo="Senza memoria">
          <p>si apre lo stesso</p>
        </Sezione>,
      );
      await screen.getByText("Senza memoria").click();
      await expect.element(screen.getByText("si apre lo stesso")).toBeVisible();
    } finally {
      spia.mockRestore();
    }
  });
});
