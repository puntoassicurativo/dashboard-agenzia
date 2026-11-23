import { useAccessoUtile } from "./accesso";
import { useBlocchi } from "./datiLati";
import { dataIt, euro, nomeMese } from "./formato";

interface RigaBroker {
  broker: string;
  mese: string;
  provvigioni: number;
  ritenuta: number;
  netto: number;
  tipo: string;
  arrivato: string;
  mese_saldi: string;
  uscita_saldi: number | null;
  differenza: number | null;
}

const MESI_MOSTRATI = 4;

/**
 * Partners only (andamento_blocchi "broker_saldi", RLS): Fabio's answer 8 of 16/11/2026, the Saldi outflow of the next
 * month against the net amount (commissions minus withholding) of the broker's statement or invoice.
 */
export const BrokerSaldi = () => {
  const accesso = useAccessoUtile();
  const q = useBlocchi<{ righe: RigaBroker[] }, { nota: string }>(
    "broker_saldi",
  );
  if (accesso.data !== true || !q.data) return null;
  const mesi = Object.keys(q.data.mesi)
    .sort()
    .reverse()
    .slice(0, MESI_MOSTRATI);
  if (mesi.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="font-medium">
        Uscita del foglio Saldi contro il broker
      </div>
      <div className="text-muted-foreground">{q.data.info?.nota}</div>
      <ul className="mt-2 space-y-1 tabular-nums">
        {mesi.flatMap((m) =>
          q.data.mesi[m].righe.map((r) => {
            // Fabio 18/11/2026: under 1 euro it counts as equal; the cents stay written in grey
            const uguale = r.differenza != null && Math.abs(r.differenza) < 1;
            const centesimi = uguale && Math.abs(r.differenza ?? 0) >= 0.01;
            return (
              <li key={`${m}-${r.broker}`} className="border-t pt-1">
                <span className="font-medium">
                  {r.broker}, {nomeMese(r.mese)}
                </span>
                <span
                  className={`block ${uguale ? "text-green-700" : r.differenza == null ? "text-muted-foreground" : "text-red-700"}`}
                >
                  {r.tipo === "fattura" ? "Fattura" : "Estratto"} del{" "}
                  {dataIt(r.arrivato)}: provvigioni {euro(r.provvigioni)} meno
                  ritenuta {euro(r.ritenuta)} = {euro(r.netto)}.{" "}
                  {r.uscita_saldi == null
                    ? `Nel foglio Saldi di ${nomeMese(r.mese_saldi)} non c'è ancora.`
                    : uguale
                      ? `Uguale al foglio Saldi di ${nomeMese(r.mese_saldi)}${centesimi ? ` (differenza di ${euro(r.differenza)})` : ""}.`
                      : `Foglio Saldi di ${nomeMese(r.mese_saldi)}: ${euro(r.uscita_saldi)}, differenza ${euro(r.differenza)}.`}
                </span>
              </li>
            );
          }),
        )}
      </ul>
    </div>
  );
};
