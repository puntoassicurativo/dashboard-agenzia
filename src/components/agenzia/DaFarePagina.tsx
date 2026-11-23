/**
 * "Da fare" (everyone, simplification plan of 21/11/2026, P4, 23/11/2026), in place of Amministrazione and of the lists A-L:
 * one page with what needs doing now, the deadlines, the lists in use (each with its name), the state of the sub-agents'
 * decades WITHOUT amounts and Chiedi alle condizioni. The lists never used (ex clients, suspended cars, deductibles,
 * renewals with proposals, decade check, claims ratio) stay behind "Altre liste", not deleted. Fatto and nota as before.
 * No partners' figures here: colleagues use this page.
 */
import type { ReactNode } from "react";
import { useSearchParams } from "react-router";

import { DecadiSubagenti, Scadenze } from "./AmministrazionePagine";
import { ChiediCondizioni } from "./ChiediCondizioni";
import { DaFare } from "./DaFare";
import { useRighe } from "./datiLati";
import { Pagina } from "./Lato";
import { Sezione } from "./Sezione";
import { SEZIONI, SezionePage, useInfo } from "./Sezioni";

/** Lists used in the last two weeks (A, G) and the new ones still on trial (I, L): register P3.1. */
export const LISTE_IN_USO = ["A", "G", "I", "L"];
/** Never used: behind "Altre liste" (Lorenzo 22/11/2026: "va benissimo"). */
export const ALTRE_LISTE = ["B", "C", "D", "E", "H", "F"];

interface DatiScadenza {
  scadenza: string;
  cosa: string;
  stato: string;
}

const Blocco = ({
  id,
  titolo,
  riassunto,
  apri,
  children,
}: {
  id: string;
  titolo: string;
  riassunto?: string;
  apri: boolean;
  children: ReactNode;
}) => (
  <Sezione
    id={`da-fare.${id}`}
    titolo={titolo}
    riassunto={riassunto}
    apri={apri}
  >
    {children}
  </Sezione>
);

export const DaFarePagina = () => {
  const [parametri] = useSearchParams();
  const lista = (parametri.get("lista") ?? "").toUpperCase();
  const sca = useRighe<DatiScadenza>("SCA");
  const info = useInfo();
  const scadenze = (sca.data?.righe ?? [])
    .filter((r) => !r.fatto)
    .map((r) => r.dati);
  const aperte = scadenze.filter((s) => !/fatto/.test(s.stato)).length;
  const riassunto = (k: string): string | undefined => {
    const tot = info.data?.[k]?.riepilogo?.totale;
    return k === "F" || tot == null ? undefined : `${tot} righe`;
  };
  const altraAperta = ALTRE_LISTE.includes(lista);
  return (
    <Pagina
      titolo="Da fare"
      sotto="Le cose da fare in agenzia. Ogni riga ha Fatto e la nota, salvati per tutti."
    >
      {sca.data && <DaFare scadenze={scadenze} />}
      <Blocco
        id="scadenze"
        titolo="Scadenze"
        riassunto={sca.data ? `${aperte} aperte` : undefined}
        apri={lista === "SCADENZE"}
      >
        <Scadenze dentro />
      </Blocco>
      {LISTE_IN_USO.map((k) => (
        <Blocco
          key={k}
          id={`lista-${k}`}
          titolo={SEZIONI[k].titolo}
          riassunto={riassunto(k)}
          apri={lista === k}
        >
          <SezionePage sezione={k} dentro />
        </Blocco>
      ))}
      <Blocco
        id="decadi"
        titolo="Decadi dei subagenti"
        riassunto="stato di mail, versamento e fattura"
        apri={lista === "DECADI"}
      >
        <DecadiSubagenti dentro senzaCifre />
      </Blocco>
      <Blocco
        id="condizioni"
        titolo="Chiedi alle condizioni"
        riassunto="garanzie, franchigie e scoperti delle polizze Vittoria"
        apri={lista === "CONDIZIONI"}
      >
        <ChiediCondizioni dentro />
      </Blocco>
      <details
        open={altraAperta || undefined}
        className="rounded-lg border bg-card/60 px-3 py-2"
      >
        <summary className="cursor-pointer select-none py-1 font-semibold">
          Altre liste ({ALTRE_LISTE.length})
        </summary>
        <p className="mb-2 text-sm text-muted-foreground">
          Liste che si aggiornano da sole ma non sono state usate: restano qui,
          pronte se servono.
        </p>
        <div className="flex flex-col gap-3">
          {ALTRE_LISTE.map((k) => (
            <Blocco
              key={k}
              id={`lista-${k}`}
              titolo={SEZIONI[k].titolo}
              riassunto={riassunto(k)}
              apri={lista === k}
            >
              <SezionePage sezione={k} dentro />
            </Blocco>
          ))}
        </div>
      </details>
    </Pagina>
  );
};

export default DaFarePagina;
