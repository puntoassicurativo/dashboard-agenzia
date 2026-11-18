import { useAccessoUtile } from "./Andamento";
import AndamentoPage from "./Andamento";
import {
  DecadiSubagenti,
  EstrattiBroker,
  Scadenze,
} from "./AmministrazionePagine";
import { FatturePagamenti } from "./FatturePagamenti";
import { FattureSubagenti } from "./FattureSubagenti";
import { Lato } from "./Lato";
import { Mutui } from "./Mutui";
import { PerLoStudio } from "./PerLoStudio";
import { SimulaTassePagina } from "./SimulaTassePagina";
import { Personale } from "./Personale";
import { Ritenute } from "./Ritenute";
import { SezioniPage } from "./Sezioni";
import { TutteLeFatture } from "./TutteLeFatture";
import { ChiediCondizioni } from "./ChiediCondizioni";

/** Contabilita' (numbers, partners only: the data is protected by RLS, the menu entry is hidden too). */
export const ContabilitaPage = () => {
  const accesso = useAccessoUtile();
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
        // Fabio 17/11/2026 and decision 11 of Lorenzo (18/11/2026): Contabilita' opens on all the invoices
        {
          chiave: "tutte-le-fatture",
          titolo: "Tutte le fatture",
          elemento: <TutteLeFatture />,
        },
        {
          chiave: "andamento",
          titolo: "Andamento mese",
          elemento: <AndamentoPage />,
        },
        {
          chiave: "fatture",
          titolo: "Fatture e pagamenti",
          elemento: <FatturePagamenti />,
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

/** Amministrazione (things to do, everyone). */
export const AmministrazionePage = () => (
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
      {
        chiave: "fatture-subagenti",
        titolo: "Fatture subagenti",
        elemento: <FattureSubagenti />,
      },
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
