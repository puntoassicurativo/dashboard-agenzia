import { useAccessoUtile } from "./Andamento";
import AndamentoPage from "./Andamento";
import {
  DecadiSubagenti,
  EstrattiBroker,
  Scadenze,
} from "./AmministrazionePagine";
import { FatturePagamenti } from "./FatturePagamenti";
import { Lato } from "./Lato";
import { PerLoStudio } from "./PerLoStudio";
import { Personale } from "./Personale";
import { Ritenute } from "./Ritenute";
import { SezioniPage } from "./Sezioni";

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
          chiave: "studio",
          titolo: "Per lo studio",
          elemento: <PerLoStudio />,
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
      { chiave: "sezioni", titolo: "Sezioni A-H", elemento: <SezioniPage /> },
      {
        chiave: "decadi",
        titolo: "Decadi subagenti",
        elemento: <DecadiSubagenti />,
      },
      {
        chiave: "broker",
        titolo: "Estratti broker",
        elemento: <EstrattiBroker />,
      },
    ]}
  />
);
