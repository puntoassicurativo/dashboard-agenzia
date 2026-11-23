/**
 * "Da fare" (everyone, simplification plan of 21/11/2026, P4, 23/11/2026), in place of Amministrazione and of the lists A-L:
 * one page with what needs doing now, the deadlines, the lists in use (each with its name), the state of the sub-agents'
 * decades WITHOUT amounts and Chiedi alle condizioni. The lists never used (ex clients, suspended cars, deductibles,
 * renewals with proposals, decade check, claims ratio) stay behind "Altre liste", not deleted. Fatto and nota as before.
 * No partners' figures here: colleagues use this page. Review of 23/11/2026: the lists with the agency's own figures
 * (F claims ratio, H decade check) are for partners only, also in the database (R001); a ?lista= link scrolls to its
 * block (R043); each list says how many rows are still to do (R093).
 */
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { useSearchParams } from "react-router";

import { getSupabaseClient } from "../atomic-crm/providers/supabase/supabase";
import { useAccessoUtile } from "./accesso";
import { ErroreCaricamento } from "./ErroreCaricamento";

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
/** Lists with the agency's own figures: partners only (RLS in 20261123180000_sezioni_riservate_soci.sql). */
export const LISTE_SOCI = ["F", "H"];

/** The other lists a user sees: a colleague (or a user not yet known) does not get the partners' lists. */
export const altreListe = (socio: boolean): string[] =>
  socio ? ALTRE_LISTE : ALTRE_LISTE.filter((k) => !LISTE_SOCI.includes(k));

/** Active rows not yet marked Fatto, per list (a count only, nothing downloaded). */
const useDaFare = (liste: string[]) =>
  useQuery({
    queryKey: ["sezione_righe", "da_fare", liste.join(",")],
    queryFn: async () => {
      const sb = getSupabaseClient();
      const conti = await Promise.all(
        liste.map(async (k) => {
          const { count, error } = await sb
            .from("sezione_righe")
            .select("chiave", { count: "exact", head: true })
            .eq("sezione", k)
            .eq("attiva", true)
            .eq("fatto", false);
          if (error) throw error;
          return [k, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(conti) as Record<string, number>;
    },
    staleTime: 60 * 1000,
  });

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
  <div id={`blocco-${id}`} className="scroll-mt-20">
    <Sezione
      // remounts when a link opens it from this same page
      key={String(apri)}
      id={`da-fare.${id}`}
      titolo={titolo}
      riassunto={riassunto}
      apri={apri}
    >
      {children}
    </Sezione>
  </div>
);

export const DaFarePagina = () => {
  const [parametri] = useSearchParams();
  const lista = (parametri.get("lista") ?? "").toUpperCase();
  const accesso = useAccessoUtile();
  const socio = accesso.data === true;
  const altre = altreListe(socio);
  const sca = useRighe<DatiScadenza>("SCA");
  const info = useInfo();
  const daFare = useDaFare([
    ...LISTE_IN_USO,
    ...altre.filter((k) => k !== "F"),
  ]);
  const scadenze = (sca.data?.righe ?? [])
    .filter((r) => !r.fatto)
    .map((r) => r.dati);
  const aperte = scadenze.filter((s) => !/fatto/.test(s.stato)).length;
  const riassunto = (k: string): string | undefined => {
    const tot = info.data?.[k]?.riepilogo?.totale;
    if (k === "F" || tot == null) return undefined;
    const resta = daFare.data?.[k];
    return resta == null ? `${tot} righe` : `${resta} da fare su ${tot}`;
  };
  const altraAperta = altre.includes(lista);
  useEffect(() => {
    if (!lista) return;
    const id =
      LISTE_IN_USO.includes(lista) || altre.includes(lista)
        ? `lista-${lista}`
        : lista.toLowerCase();
    // after the blocks are drawn: the opened list comes into view instead of staying below the screen
    const t = setTimeout(
      () =>
        document
          .getElementById(`blocco-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      150,
    );
    return () => clearTimeout(t);
  }, [lista, altre]);
  return (
    <Pagina
      titolo="Da fare"
      sotto="Le cose da fare in agenzia. Ogni riga ha Fatto e la nota, salvati per tutti."
    >
      {sca.error && <ErroreCaricamento cosa="le scadenze" errore={sca.error} />}
      {info.error && (
        <ErroreCaricamento cosa="i conteggi delle liste" errore={info.error} />
      )}
      {sca.data && <DaFare scadenze={scadenze} socio={socio} />}
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
        {/* the amounts of the decades only for the partners (decision E3, 23/11/2026) */}
        <DecadiSubagenti dentro senzaCifre={!socio} />
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
          Altre liste ({altre.length})
        </summary>
        <p className="mb-2 text-sm text-muted-foreground">
          Liste che si aggiornano da sole ma non sono state usate: restano qui,
          pronte se servono.
        </p>
        <div className="flex flex-col gap-3">
          {altre.map((k) => (
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
