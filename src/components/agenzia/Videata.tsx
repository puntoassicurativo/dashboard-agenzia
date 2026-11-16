/**
 * First screen of the Andamento page (Fabio, 16/11/2026): the main figures fit in 1366x768 without scrolling.
 * Commissions and surplus of the chosen month (Saldi blocks), projected taxable profit against Fabio's target
 * (fiscale block, partners only) and premiums collected this year against last year (cruscotto table).
 */
import { useCruscotto } from "./Cruscotto";
import { useBloccoFiscale } from "./Fiscale";
import { euro } from "./formato";
import { useBlocchiSaldi } from "./MeseVirtuoso";

const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];
const meseNome = (m: string) => MESI[parseInt(m.slice(5, 7), 10) - 1];
const intero = (v: number | null | undefined) => euro(v, 0);
const pct = (v: number | null | undefined) =>
  v == null
    ? "n.d."
    : `${v >= 0 ? "+" : ""}${v.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;

const Numero = ({
  titolo,
  valore,
  nota,
  colore,
}: {
  titolo: string;
  valore: string;
  nota?: string;
  colore?: "verde" | "rosso";
}) => (
  <div className="rounded-lg border bg-card p-3 flex flex-col gap-0.5 min-w-0">
    <div className="text-sm text-muted-foreground">{titolo}</div>
    <div
      className={`text-xl sm:text-2xl font-semibold tabular-nums tracking-tight ${
        colore === "verde"
          ? "text-green-700 dark:text-green-400"
          : colore === "rosso"
            ? "text-red-700 dark:text-red-400"
            : ""
      }`}
    >
      {valore}
    </div>
    {nota && (
      <div className="text-xs text-muted-foreground tabular-nums">{nota}</div>
    )}
  </div>
);

export const VideataAndamento = ({ mese }: { mese: string }) => {
  const saldi = useBlocchiSaldi();
  const fiscale = useBloccoFiscale();
  const cruscotto = useCruscotto();
  const v = saldi.data?.mesi.find((m) => m.mese === mese)?.v;
  const f = fiscale.data;
  const inc = cruscotto.data?.valori.incassi;
  const nm = meseNome(mese);
  const provv = v?.mv_provv?.valore ?? v?.provvigioni;
  const obiettivo = f ? (f.obiettivo ?? f.soglia) : null;
  const mancanti =
    f?.proiezione && obiettivo != null
      ? (f.costi_mancanti ?? f.proiezione.utile_fiscale - obiettivo)
      : null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Numero
        titolo={`Provvigioni di ${nm}`}
        valore={intero(provv)}
        nota={
          v?.mv_provv?.fonte === "bo" ? "da BO" : v ? "dal foglio Saldi" : ""
        }
      />
      <Numero
        titolo={`Avanzo di ${nm}`}
        valore={intero(v?.avanzo)}
        colore={v ? (v.avanzo >= 0 ? "verde" : "rosso") : undefined}
        nota={v ? `da gennaio ${intero(v.avanzo_da_gennaio)}` : ""}
      />
      <Numero
        titolo="Utile fiscale previsto a fine anno"
        valore={intero(f?.proiezione?.utile_fiscale)}
        nota={
          mancanti == null
            ? ""
            : mancanti > 0
              ? `obiettivo ${intero(obiettivo)}: mancano circa ${intero(mancanti)} di costi`
              : `obiettivo ${intero(obiettivo)} raggiunto`
        }
      />
      <Numero
        titolo="Incassi da inizio anno"
        valore={intero(inc?.totale)}
        nota={
          inc
            ? `auto ${pct(inc.cresc_auto)}, RE ${pct(inc.cresc_re)} sull'anno prima`
            : ""
        }
      />
    </div>
  );
};
