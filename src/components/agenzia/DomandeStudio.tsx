/**
 * Questions for the accountant (Fabio, call of 18/11/2026): every accounting doubt that comes out while checking the
 * figures goes into one list, with the page it came from, so the studio sees that every item is checked. The list is
 * kept by the agent (domande_studio.json, block "studio_domande", partners only); answered questions stay in the
 * list. The open ones can be copied as a ready text for the e-mail to the studio.
 */
import { useState } from "react";

import { useBlocchi } from "./datiLati";

export interface DomandaStudio {
  id: string;
  tema: string;
  domanda: string;
  pagina: string;
  dal: string;
  stato: "aperta" | "chiesta" | "risposta";
  risposta?: string;
  risposta_il?: string;
}
interface InfoDomande {
  domande: DomandaStudio[];
  conta: Record<DomandaStudio["stato"], number>;
  nota: string;
}

const STATO: Record<DomandaStudio["stato"], string> = {
  aperta: "Da chiedere",
  chiesta: "Chiesta, in attesa",
  risposta: "Risposta",
};
const COLORE: Record<DomandaStudio["stato"], string> = {
  aperta: "bg-pa-rosso-chiaro text-pa-rosso",
  chiesta: "bg-amber-100 text-amber-800",
  risposta: "bg-pa-verde-chiaro text-pa-verde",
};
const INTRO =
  "Abbiamo rilevato una serie di operazioni che vi segnaliamo per una verifica della vostra contabilità.";

const dataIt = (iso: string): string =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Text to paste in the e-mail to the studio: the questions not answered yet, numbered "1)" on their own line. */
export const testoDaCopiare = (domande: DomandaStudio[]): string => {
  const aperte = domande.filter((d) => d.stato !== "risposta");
  return [INTRO, ...aperte.map((d, i) => `${i + 1}) ${d.domanda}`)].join("\n");
};

export const ElencoDomande = ({ domande }: { domande: DomandaStudio[] }) => {
  const [copiato, setCopiato] = useState(false);
  const aperte = domande.filter((d) => d.stato !== "risposta").length;
  const copia = async () => {
    try {
      await navigator.clipboard.writeText(testoDaCopiare(domande));
      setCopiato(true);
    } catch {
      setCopiato(false);
    }
  };
  return (
    <div className="rounded-lg border bg-card p-4 text-sm flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Domande per lo studio</h2>
        {aperte > 0 && (
          <button
            className="rounded-md border px-3 py-1 font-medium hover:bg-muted"
            onClick={copia}
          >
            {copiato
              ? "Copiato"
              : aperte === 1
                ? "Copia la domanda da fare"
                : `Copia le ${aperte} domande da fare`}
          </button>
        )}
      </div>
      <p className="text-muted-foreground">
        Ogni dubbio che esce controllando i conti finisce qui, con la pagina
        dove è nato. Quando lo studio risponde la domanda resta, con la
        risposta.
      </p>
      <ol className="flex flex-col gap-2">
        {domande.map((d) => (
          <li key={d.id} className="border-t pt-2 flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORE[d.stato]}`}
              >
                {STATO[d.stato]}
              </span>
              <span className="text-xs text-muted-foreground">
                {d.tema} · {d.pagina} · dal {dataIt(d.dal)}
              </span>
            </div>
            <span>{d.domanda}</span>
            {d.risposta && (
              <span className="text-muted-foreground">
                Risposta{d.risposta_il ? ` del ${dataIt(d.risposta_il)}` : ""}.{" "}
                {d.risposta}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};

export const DomandeStudio = () => {
  const q = useBlocchi<unknown, InfoDomande>("studio_domande");
  if (q.isPending || q.error || !q.data.info) return null;
  return <ElencoDomande domande={q.data.info.domande} />;
};
