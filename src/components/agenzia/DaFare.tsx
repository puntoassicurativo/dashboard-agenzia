import { useRighe } from "./datiLati";
import { dataIt, nomeMese } from "./formato";

/**
 * First screen of Amministrazione (Fabio, 16/11/2026): what needs doing now, without amounts (every logged-in user
 * sees it). Decades without the transfer or with a different one, sub-agent invoices missing or unpaid, deadlines of
 * the week. The details stay in the tabs.
 */
interface Decade {
  decade: string;
  subagente: string;
  stato: string;
  versamento?: string | null;
}
interface Fattura {
  mese: string;
  subagente: string;
  arrivata: boolean;
  pagata: boolean;
  pagata_diversa?: boolean;
  con_decadi: boolean;
}
export interface ScadenzaDaFare {
  scadenza: string;
  cosa: string;
  stato: string;
}

const GIORNI_DECADI = 45;
const GIORNO_FATTURA = 10;

const isoMeno = (oggi: Date, giorni: number) =>
  new Date(oggi.getTime() - giorni * 86_400_000).toISOString().slice(0, 10);

export const cosaDaFare = (
  oggi: Date,
  decadi: Decade[],
  fatture: Fattura[],
  scadenze: ScadenzaDaFare[],
): string[] => {
  const out: string[] = [];
  const limite = isoMeno(oggi, GIORNI_DECADI);
  decadi
    .filter((d) => d.decade >= limite)
    .sort((a, b) => a.decade.localeCompare(b.decade))
    .forEach((d) => {
      if (d.versamento === "non_arrivato")
        out.push(
          `${d.subagente}, decade del ${dataIt(d.decade)}: versamento non arrivato`,
        );
      else if (d.versamento === "diverso")
        out.push(
          `${d.subagente}, decade del ${dataIt(d.decade)}: versamento diverso dalla mail`,
        );
      else if (d.stato === "mail da mandare")
        out.push(
          `${d.subagente}, decade del ${dataIt(d.decade)}: mail da mandare`,
        );
    });
  const primo = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
  const ultimoMese = isoMeno(primo, 1).slice(0, 7);
  const dueMesi = isoMeno(primo, 40).slice(0, 7);
  fatture
    .filter((f) => f.mese >= dueMesi)
    .sort((a, b) => a.mese.localeCompare(b.mese))
    .forEach((f) => {
      if (!f.arrivata) {
        if (
          f.con_decadi &&
          f.mese === ultimoMese &&
          oggi.getDate() > GIORNO_FATTURA
        )
          out.push(
            `${f.subagente}: fattura di ${nomeMese(f.mese)} non ancora arrivata`,
          );
      } else if (f.pagata_diversa)
        out.push(
          `${f.subagente}: fattura di ${nomeMese(f.mese)} pagata con un importo diverso`,
        );
      else if (!f.pagata)
        out.push(
          `${f.subagente}: fattura di ${nomeMese(f.mese)} non ancora pagata`,
        );
    });
  const dal = isoMeno(oggi, 7);
  const al = isoMeno(oggi, -7);
  scadenze
    .filter(
      (s) => !/fatto/.test(s.stato) && s.scadenza >= dal && s.scadenza <= al,
    )
    .sort((a, b) => a.scadenza.localeCompare(b.scadenza))
    .forEach((s) => out.push(`${dataIt(s.scadenza)} ${s.cosa} (${s.stato})`));
  return out;
};

export const DaFare = ({ scadenze }: { scadenze: ScadenzaDaFare[] }) => {
  const sub = useRighe<Decade>("SUB");
  const sft = useRighe<Fattura>("SFT");
  if (!sub.data || !sft.data) return null;
  const voci = cosaDaFare(
    new Date(),
    sub.data.righe.map((r) => r.dati),
    sft.data.righe.map((r) => r.dati),
    scadenze,
  );
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="font-medium">Cosa c'è da fare adesso</div>
      {voci.length === 0 ? (
        <div className="text-muted-foreground">
          Niente: decadi, fatture e scadenze della settimana sono a posto.
        </div>
      ) : (
        <ul className="mt-1 list-disc pl-5 space-y-0.5">
          {voci.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
