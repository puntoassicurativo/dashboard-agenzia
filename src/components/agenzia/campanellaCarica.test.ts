import { describe, expect, it } from "vitest";

import {
  type Notifica,
  notificheValide,
  perChiNonESocio,
  tutteLeNotifiche,
} from "./Campanella";
import { daScadenza } from "./CaricaFile";
import { leggiNome, nomeOggetto, nomePulito } from "./caricamentiDati";
import { mesiInLettere } from "./formato";
import { DA_AMMINISTRAZIONE, DA_CONTABILITA } from "./Indirizzi";

const decade: Notifica = {
  livello: "attenzione",
  chiave: "decade|2030-11-20",
  titolo: "Manca la decade del 20/11",
  testo: "",
  link: "/carica-file?tipo=decade&data=2030-11-20",
};

describe("campanella", () => {
  it("says the morning run is missing after 8 when the run's notifications are from yesterday", () => {
    const n = tutteLeNotifiche(
      "2030-11-22T10:01:00+01:00",
      [],
      [],
      [],
      new Date(2030, 10, 23, 9, 0),
    );
    expect(n.map((x) => x.chiave)).toEqual(["giro|oggi"]);
  });

  it("stays quiet before 8 and when today's run is there", () => {
    expect(
      tutteLeNotifiche(
        "2030-11-22T10:00:00+01:00",
        [],
        [],
        [],
        new Date(2030, 10, 23, 7, 0),
      ),
    ).toEqual([]);
    expect(
      tutteLeNotifiche(
        "2030-11-23T06:40:00+01:00",
        [],
        [],
        [],
        new Date(2030, 10, 23, 9, 0),
      ),
    ).toEqual([]);
  });

  it("hides a missing decade whose files are already uploaded and keeps the decade before the rest", () => {
    const soci: Notifica = {
      ...decade,
      chiave: "saldi|quadra",
      titolo: "Saldi",
    };
    const ora = new Date(2030, 10, 23, 9, 0);
    const oggi = "2030-11-23T06:40:00+01:00";
    expect(
      tutteLeNotifiche(oggi, [decade], [soci], ["2030-11-20"], ora),
    ).toEqual([soci]);
    expect(tutteLeNotifiche(oggi, [decade], [soci], [], ora)).toEqual([
      decade,
      soci,
    ]);
  });
});

describe("carica file", () => {
  it("builds the object name the morning run accepts, and reads it back", () => {
    const nome = nomeOggetto(
      "decade",
      "2030-11-20",
      "Riepilogo décade!.pdf",
      new Date(2030, 10, 23, 10, 5, 7),
    );
    expect(nome).toBe(
      "decade__2030-11-20__20301123100507__Riepilogo decade_.pdf",
    );
    expect(leggiNome(nome, false)).toMatchObject({
      tipo: "decade",
      sotto: "2030-11-20",
      file: "Riepilogo decade_.pdf",
      scaricato: false,
    });
  });

  it("never lets a file name carry a path or a double underscore", () => {
    expect(nomePulito("..\\..\\a__b.pdf")).toBe("a_b.pdf");
    expect(() =>
      nomeOggetto("banca", "unicredit", "a.csv", new Date()),
    ).toThrow();
  });

  it("turns the deadlines that need a file into upload rows", () => {
    expect(
      daScadenza(
        {
          cosa: "File della decade del 30/09 da Newage",
          scadenza: "2030-10-03",
          stato: "in ritardo",
          dettaglio: "",
        },
        "k",
      ),
    ).toMatchObject({ tipo: "decade", sotto: "2030-09-30" });
    expect(
      daScadenza(
        {
          cosa: "Fatture di 2030-10 dal cassetto fiscale (XML)",
          scadenza: "2030-11-05",
          stato: "in ritardo",
          dettaglio: "",
        },
        "k",
      ),
    ).toMatchObject({ tipo: "fatture", sotto: "2030-10" });
    expect(
      daScadenza(
        {
          cosa: "F24 del 16",
          scadenza: "2030-11-16",
          stato: "in ritardo",
          dettaglio: "",
        },
        "k",
      ),
    ).toBeNull();
  });
});

describe("mesi in lettere", () => {
  it("writes the month in words but leaves folder paths and full dates alone", () => {
    expect(
      mesiInLettere(
        "Fatture di 2030-09, in input\\fatture\\2030-09, scadenza 2030-10-05",
      ),
    ).toBe(
      "Fatture di settembre 2030, in input\\fatture\\2030-09, scadenza 2030-10-05",
    );
  });
});

describe("mesi in lettere su Safari vecchi", () => {
  it("does not use a lookbehind, which throws SyntaxError on iOS before 16.4 (review R015)", () => {
    expect(mesiInLettere.toString()).not.toContain("(?<");
    expect(mesiInLettere("2030-09 e (2030-10)")).toBe(
      "settembre 2030 e (ottobre 2030)",
    );
  });
});

describe("notifiche lette dal database", () => {
  it("drops a notification without key or title instead of breaking the header (review R015)", () => {
    const lette = notificheValide([
      { titolo: "senza chiave", testo: "" },
      decade,
      null,
      { chiave: "x", titolo: 3, testo: "" },
    ]);
    expect(lette).toEqual([decade]);
    expect(notificheValide("non una lista")).toEqual([]);
  });

  it("gives a colleague no link to the partners' upload page (review R065)", () => {
    const n = perChiNonESocio(decade);
    expect(n.link).toBeNull();
    expect(n.testo).toContain("La carica un socio");
  });
});

describe("vecchi indirizzi", () => {
  it("send the old Contabilita' and Amministrazione tabs to the new pages", () => {
    expect(DA_CONTABILITA.andamento).toBe("/utile-costi");
    expect(DA_CONTABILITA["simula-tasse"]).toBe("/tasse/simula-tasse");
    expect(DA_AMMINISTRAZIONE["fatture-subagenti"]).toEqual({
      soci: "/fatture?tipo=subagenti",
      tutti: "/da-fare?lista=decadi",
    });
  });
});
