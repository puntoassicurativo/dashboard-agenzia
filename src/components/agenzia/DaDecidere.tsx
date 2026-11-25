/**
 * "Da decidere" at the top of the Cruscotto (proposal of 25/11/2026, step 3): what waits for a partner, gathered from the
 * pages where it lives (late deadlines from Da fare, invoices to pay or to check from Fatture, payments of the premium
 * account to confirm from Utile e costi). Each line opens the right place. Hidden when nothing waits: on a normal day
 * the Cruscotto stays quiet. Partners only, like the Cruscotto (the blocks are protected by RLS).
 */
import { Link } from "react-router";

import { useBlocchi, useRighe } from "./datiLati";
import { nonPagate } from "./FattureNonPagate";
import type { FatturaCassetto } from "./fattureUnite";
import { dataIt, euroIntero as euro } from "./formato";
import type { AlberoUtile, InAttesa } from "./utileBlocchi";

export interface VoceDecidere {
  testo: string;
  dove: string;
  /** late deadline: shown with a warning label, first in the list */
  ritardo?: string;
}
interface ScadenzaAperta {
  scadenza: string;
  cosa: string;
  stato: string;
}
interface FatturaStato {
  stato: string;
  importo: number | null;
}

const tondo = (v: number): number => Math.round(v * 100) / 100;
const totale = (v: { importo: number | null }[]): number =>
  tondo(v.reduce((s, r) => s + (r.importo ?? 0), 0));
const fatture = (n: number) => (n === 1 ? "1 fattura" : `${n} fatture`);

/** Late deadlines older than this stay in Da fare only: here they would just be noise. */
export const GIORNI_SCADENZE = 30;

const isoMenoGiorni = (iso: string, giorni: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - giorni);
  return d.toISOString().slice(0, 10);
};

/**
 * Pure: the lines of "Da decidere", most urgent first. `oggi` is an ISO date.
 * Late deadlines are one line with the count (they are mostly files to collect, the list is in Da fare); the money
 * decisions are one line each. First run on real data (25/11/2026): 13 deadlines "in ritardo", some two months old,
 * would have filled the band.
 */
export const vociDaDecidere = (
  oggi: string,
  scadenze: ScadenzaAperta[],
  daFatture: FatturaStato[],
  inAttesa: { mese: string; righe: InAttesa[] }[],
): VoceDecidere[] => {
  const out: VoceDecidere[] = [];
  const dal = isoMenoGiorni(oggi, GIORNI_SCADENZE);
  const late = scadenze
    .filter(
      (s) =>
        !/fatto/i.test(s.stato) &&
        (/ritardo/i.test(s.stato) || s.scadenza < oggi) &&
        s.scadenza >= dal,
    )
    .sort((a, b) => a.scadenza.localeCompare(b.scadenza));
  if (late.length > 0)
    out.push({
      testo:
        late.length === 1
          ? late[0].cosa
          : `${late.length} scadenze in ritardo nell'ultimo mese`,
      dove: "/da-fare?lista=scadenze",
      ritardo:
        late.length === 1
          ? `scadenza ${dataIt(late[0].scadenza)}`
          : `la più vecchia del ${dataIt(late[0].scadenza)}`,
    });
  const daPagare = daFatture.filter((f) => f.stato === "da pagare");
  if (daPagare.length > 0)
    out.push({
      testo: `${fatture(daPagare.length)} da pagare, ${euro(totale(daPagare))}`,
      dove: "/fatture?stato=da%20pagare",
    });
  const attesa = inAttesa.flatMap((a) =>
    a.righe.map((r) => ({ ...r, mese: a.mese })),
  );
  if (attesa.length > 0)
    out.push({
      testo: `${attesa.length === 1 ? "1 pagamento" : `${attesa.length} pagamenti`} del conto premi da confermare, ${euro(totale(attesa))}`,
      // all in one month: that month; spread over months: the default period of Utile e costi (from January, whole
      // months), the running month shows its own ones
      dove:
        new Set(attesa.map((a) => a.mese)).size === 1
          ? `/utile-costi?periodo=${attesa[0].mese}`
          : "/utile-costi",
    });
  const daVerificare = daFatture.filter((f) => f.stato === "da verificare");
  if (daVerificare.length > 0)
    out.push({
      testo: `${fatture(daVerificare.length)} da verificare, ${euro(totale(daVerificare))}`,
      dove: "/fatture?stato=da%20verificare",
    });
  return out;
};

const oggiIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const DaDecidere = () => {
  const sca = useRighe<ScadenzaAperta>("SCA");
  const fat = useBlocchi<{ fatture?: FatturaCassetto[] }, unknown>("fatture");
  const utile = useBlocchi<AlberoUtile, unknown>("utile_blocchi");
  // a block that fails or is still loading leaves its lines out: the band never blocks the Cruscotto
  const scadenze = (sca.data?.righe ?? [])
    .filter((r) => !r.fatto)
    .map((r) => r.dati);
  const voci = vociDaDecidere(
    oggiIso(),
    scadenze,
    nonPagate(fat.data?.mesi ?? {}),
    Object.entries(utile.data?.mesi ?? {}).map(([mese, a]) => ({
      mese,
      righe: a.in_attesa_222 ?? [],
    })),
  );
  if (voci.length === 0) return null;
  return (
    <section aria-labelledby="da-decidere" className="flex flex-col gap-1.5">
      <h2
        id="da-decidere"
        className="text-xs font-bold uppercase tracking-wider text-pa-blu"
      >
        Da decidere{" "}
        <span className="font-normal normal-case tracking-normal text-muted-foreground">
          cose che aspettano un socio
        </span>
      </h2>
      <ul className="overflow-hidden rounded-xl border border-amber-300 border-l-4 border-l-amber-500 bg-card text-sm">
        {voci.map((v) => (
          <li
            key={`${v.dove}-${v.testo}`}
            className="border-t first:border-t-0"
          >
            <Link
              to={v.dove}
              className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-foreground no-underline hover:bg-muted/60"
            >
              <span className="min-w-0 flex-1 font-medium">
                {v.testo}
                {v.ritardo && (
                  <span className="ml-2 inline-flex items-center rounded bg-pa-rosso-chiaro px-1.5 py-0.5 text-xs font-semibold text-pa-rosso">
                    ⚠ in ritardo, {v.ritardo}
                  </span>
                )}
              </span>
              <span className="text-pa-blu" aria-hidden>
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
