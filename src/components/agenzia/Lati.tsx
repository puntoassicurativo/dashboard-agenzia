/**
 * The two partners' pages with side tabs (23/11/2026): Utile e costi and Tasse. The old Contabilita' and Amministrazione
 * pages were removed with the review of 23/11/2026 (R026): their addresses open the new pages (Indirizzi.tsx).
 */
import { PerSoci } from "./accesso";
import { EstrattiBroker } from "./AmministrazionePagine";
import { UtileFiscaleSolo } from "./CruscottoDettaglio";
import { Lato } from "./Lato";
import { Mutui } from "./Mutui";
import { PerLoStudio } from "./PerLoStudio";
import { Personale } from "./Personale";
import { Ritenute } from "./Ritenute";
import { SimulaTassePagina } from "./SimulaTassePagina";
import { TasseAnno } from "./TasseAnno";
import { UtileBlocchi } from "./UtileCosti";

/** Utile e costi (partners, 23/11/2026): the profit in blocks first, then the pages of the costs. */
export const UtileCostiPage = () => (
  <PerSoci>
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
  </PerSoci>
);

/** Tasse (partners, 23/11/2026): taxes of the year, the simulator, the questions for the studio, the taxable profit. */
export const TassePage = () => (
  <PerSoci>
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
  </PerSoci>
);
