import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router";

import { useAccessoUtile } from "./Andamento";
import { UtileFiscaleSolo } from "./CruscottoDettaglio";
import { TasseAnno } from "./TasseAnno";
import { UtileBlocchi } from "./UtileCosti";
import AndamentoPage from "./Andamento";
import {
  DecadiSubagenti,
  EstrattiBroker,
  Scadenze,
} from "./AmministrazionePagine";
import { FattureSubagenti } from "./FattureSubagenti";
import { Lato } from "./Lato";
import { Mutui } from "./Mutui";
import { PerLoStudio } from "./PerLoStudio";
import { SimulaTassePagina } from "./SimulaTassePagina";
import { Personale } from "./Personale";
import { Ritenute } from "./Ritenute";
import { SezioniPage } from "./Sezioni";
import { ChiediCondizioni } from "./ChiediCondizioni";

/** Old addresses of the three invoice pages (P4 of the 21/11/2026 plan): they all open the one Fatture page. */
const VECCHIE_FATTURE = ["tutte-le-fatture", "fatture"];

/** Contabilita' (numbers, partners only: the data is protected by RLS, the menu entry is hidden too). */
export const ContabilitaPage = () => {
  const accesso = useAccessoUtile();
  const { voce } = useParams();
  if (voce && VECCHIE_FATTURE.includes(voce))
    return <Navigate to="/fatture" replace />;
  if (accesso.isPending)
    return <div className="p-4 text-muted-foreground">Carico...</div>;
  if (!accesso.data)
    return (
      <div className="p-4 text-muted-foreground">
        Questa parte e' riservata ai soci.
      </div>
    );
  return (
    <Lato
      base="/contabilita"
      voci={[
        // 22/11/2026: the invoices moved to their own page, first entry of the menu (/fatture)
        {
          chiave: "andamento",
          titolo: "Andamento mese",
          elemento: <AndamentoPage />,
        },
        {
          chiave: "personale",
          titolo: "Personale e contributi",
          elemento: <Personale />,
        },
        { chiave: "ritenute", titolo: "Ritenute", elemento: <Ritenute /> },
        {
          chiave: "mutui",
          titolo: "Mutui e finanziamenti",
          elemento: <Mutui />,
        },
        {
          chiave: "studio",
          titolo: "Per lo studio",
          elemento: <PerLoStudio />,
        },
        // Fabio 18/11/2026: the tax simulator next to Per lo studio, in a clearer page of its own
        {
          chiave: "simula-tasse",
          titolo: "Simula tasse",
          elemento: <SimulaTassePagina />,
        },
      ]}
    />
  );
};

/** Common guard of the partners' pages: the data is protected by RLS, the menu entry is hidden too. */
const SoloSoci = ({ children }: { children: ReactNode }) => {
  const accesso = useAccessoUtile();
  if (accesso.isPending)
    return <div className="p-4 text-muted-foreground">Carico...</div>;
  if (!accesso.data)
    return (
      <div className="p-4 text-muted-foreground">
        Questa parte e' riservata ai soci.
      </div>
    );
  return <>{children}</>;
};

/** Utile e costi (partners, 23/11/2026): the profit in blocks first, then the pages of the costs. */
export const UtileCostiPage = () => (
  <SoloSoci>
    <Lato
      base="/utile-costi"
      voci={[
        {
          chiave: "blocchi",
          titolo: "Utile a blocchi",
          elemento: <UtileBlocchi />,
        },
        {
          chiave: "personale",
          titolo: "Personale e contributi",
          elemento: <Personale />,
        },
        { chiave: "ritenute", titolo: "Ritenute", elemento: <Ritenute /> },
        {
          chiave: "mutui",
          titolo: "Mutui e finanziamenti",
          elemento: <Mutui />,
        },
        {
          chiave: "broker",
          titolo: "Estratti broker",
          elemento: <EstrattiBroker />,
        },
      ]}
    />
  </SoloSoci>
);

/** Tasse (partners, 23/11/2026): taxes of the year, the simulator, the questions for the studio, the taxable profit. */
export const TassePage = () => (
  <SoloSoci>
    <Lato
      base="/tasse"
      voci={[
        { chiave: "anno", titolo: "Tasse dell'anno", elemento: <TasseAnno /> },
        {
          chiave: "simula-tasse",
          titolo: "Simula tasse",
          elemento: <SimulaTassePagina />,
        },
        {
          chiave: "studio",
          titolo: "Per lo studio",
          elemento: <PerLoStudio />,
        },
        {
          chiave: "utile-fiscale",
          titolo: "Utile fiscale",
          elemento: <UtileFiscaleSolo />,
        },
      ]}
    />
  </SoloSoci>
);

/** Amministrazione (things to do, everyone). Partners find the sub-agents' invoices in Fatture; the others keep the
 * page without amounts here. */
export const AmministrazionePage = () => {
  const { voce } = useParams();
  const { data: socio } = useAccessoUtile();
  if (socio && voce === "fatture-subagenti")
    return <Navigate to="/fatture?tipo=subagenti" replace />;
  return (
    <Lato
      base="/amministrazione"
      voci={[
        { chiave: "scadenze", titolo: "Scadenze", elemento: <Scadenze /> },
        { chiave: "sezioni", titolo: "Sezioni A-L", elemento: <SezioniPage /> },
        {
          chiave: "decadi",
          titolo: "Decadi subagenti",
          elemento: <DecadiSubagenti />,
        },
        ...(socio
          ? []
          : [
              {
                chiave: "fatture-subagenti",
                titolo: "Fatture subagenti",
                elemento: <FattureSubagenti />,
              },
            ]),
        {
          chiave: "broker",
          titolo: "Estratti broker",
          elemento: <EstrattiBroker />,
        },
        {
          chiave: "condizioni",
          titolo: "Chiedi alle condizioni",
          elemento: <ChiediCondizioni />,
        },
      ]}
    />
  );
};
