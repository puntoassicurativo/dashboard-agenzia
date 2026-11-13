import { type RigaLato, FattoNota, TestoCopia, useRighe } from "./datiLati";
import { ErroreCaricamento } from "./ErroreCaricamento";
import { dataIt, euro, nomeMese } from "./formato";
import { Pagina } from "./Lato";

const Aggiornato = ({ iso }: { iso?: string }) =>
  iso ? (
    <p className="text-xs text-muted-foreground">
      Aggiornato il {new Date(iso).toLocaleString("it-IT")}
    </p>
  ) : null;

const colore = (stato: string) =>
  /fatto|ricevuta|contabile arrivat|mandate a tutti/i.test(stato)
    ? "text-green-700"
    : /ritardo|nessuna risposta|da mandare/i.test(stato)
      ? "text-red-700"
      : "text-amber-700";

// ------------------------------------------------------------------ decadi dei subagenti

interface DatiDecade {
  decade: string;
  subagente: string;
  stato: string;
  mail_di_fabio: string | null;
  contabile: { data: string } | null;
  numeri_mail: Record<string, number> | null;
  calcolato: { provv_decade: number; incassi: number; titoli: number } | null;
  differenza: { provv_decade: number; incassi: number | null } | null;
  testo: string;
}

const SchedaDecade = ({ r }: { r: RigaLato<DatiDecade> }) => {
  const d = r.dati;
  return (
    <div
      className={`rounded-lg border bg-card p-3 text-sm flex flex-col gap-2 ${r.fatto ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-semibold">
          {d.subagente}, decade del {dataIt(d.decade)}
        </span>
        <span className={colore(d.stato)}>{d.stato}</span>
      </div>
      {d.calcolato && (
        <div className="text-muted-foreground tabular-nums">
          Dai file della decade: {d.calcolato.titoli} titoli, incassi{" "}
          {euro(d.calcolato.incassi)}, provvigione decade{" "}
          {euro(d.calcolato.provv_decade)}
          {d.differenza &&
            (Math.abs(d.differenza.provv_decade) < 0.01
              ? ", uguale alla mail di Fabio"
              : `, differenza con la mail ${euro(d.differenza.provv_decade)}`)}
        </div>
      )}
      <TestoCopia testo={d.testo} />
      <FattoNota r={r} />
    </div>
  );
};

export const DecadiSubagenti = () => {
  const q = useRighe<DatiDecade>("SUB");
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const decadi = [...new Set(q.data.righe.map((r) => r.dati.decade))]
    .sort()
    .reverse();
  return (
    <Pagina titolo="Decadi dei subagenti" sotto={q.data.info?.riepilogo.nota}>
      {decadi.length === 0 && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          Nessuna decade ancora.
        </div>
      )}
      {decadi.map((dec, i) => (
        <details key={dec} open={i === 0} className="flex flex-col gap-2">
          <summary className="cursor-pointer select-none text-base font-semibold py-1">
            Decade del {dataIt(dec)}
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {q.data.righe
              .filter((r) => r.dati.decade === dec)
              .map((r) => (
                <SchedaDecade key={r.chiave} r={r} />
              ))}
          </div>
        </details>
      ))}
      <Aggiornato iso={q.data.info?.aggiornato_il} />
    </Pagina>
  );
};

// ------------------------------------------------------------------ estratti conto broker

interface DatiBroker {
  mese: string;
  broker: string;
  stato: string;
  estratto_mandato: string | null;
  fattura: string | null;
  contabile: string | null;
}

export const EstrattiBroker = () => {
  const q = useRighe<DatiBroker>("BRK");
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const mesi = [...new Set(q.data.righe.map((r) => r.dati.mese))]
    .sort()
    .reverse();
  return (
    <Pagina titolo="Estratti conto broker" sotto={q.data.info?.riepilogo.nota}>
      {mesi.map((mese) => (
        <div key={mese} className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{nomeMese(mese)}</h2>
          {q.data.righe
            .filter((r) => r.dati.mese === mese)
            .map((r) => (
              <div
                key={r.chiave}
                className={`rounded-lg border bg-card p-3 text-sm flex flex-col gap-1 ${r.fatto ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{r.dati.broker}</span>
                  <span className={colore(r.dati.stato)}>{r.dati.stato}</span>
                </div>
                <div className="text-muted-foreground">
                  Estratto{" "}
                  {r.dati.estratto_mandato
                    ? `mandato il ${dataIt(r.dati.estratto_mandato)}`
                    : "non mandato"}
                  {r.dati.fattura && `, fattura del ${dataIt(r.dati.fattura)}`}
                  {r.dati.contabile &&
                    `, contabile del ${dataIt(r.dati.contabile)}`}
                </div>
                <FattoNota r={r} />
              </div>
            ))}
        </div>
      ))}
      <Aggiornato iso={q.data.info?.aggiornato_il} />
    </Pagina>
  );
};

// ------------------------------------------------------------------ scadenze

interface DatiScadenza {
  scadenza: string;
  cosa: string;
  stato: string;
  dettaglio: string;
}

export const Scadenze = () => {
  const q = useRighe<DatiScadenza>("SCA");
  if (q.isPending)
    return <div className="p-4 text-muted-foreground">Carico i dati...</div>;
  if (q.error) return <ErroreCaricamento errore={q.error} />;
  const righe = [...q.data.righe].sort((a, b) =>
    a.dati.scadenza.localeCompare(b.dati.scadenza),
  );
  const aperte = righe.filter((r) => !r.fatto && !/fatto/.test(r.dati.stato));
  const chiuse = righe.filter((r) => r.fatto || /fatto/.test(r.dati.stato));
  const Riga = ({ r }: { r: RigaLato<DatiScadenza> }) => (
    <div className="rounded-lg border bg-card p-3 text-sm flex flex-col gap-1">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-medium">
          {dataIt(r.dati.scadenza)} {r.dati.cosa}
        </span>
        <span className={colore(r.fatto ? "fatto" : r.dati.stato)}>
          {r.fatto ? "fatto" : r.dati.stato}
        </span>
      </div>
      <div className="text-muted-foreground">{r.dati.dettaglio}</div>
      <FattoNota r={r} />
    </div>
  );
  return (
    <Pagina titolo="Scadenze" sotto={q.data.info?.riepilogo.nota}>
      <h2 className="text-base font-semibold">Da fare ({aperte.length})</h2>
      {aperte.map((r) => (
        <Riga key={r.chiave} r={r} />
      ))}
      <details>
        <summary className="cursor-pointer select-none text-base font-semibold">
          Fatte ({chiuse.length})
        </summary>
        <div className="flex flex-col gap-2 mt-2">
          {chiuse.map((r) => (
            <Riga key={r.chiave} r={r} />
          ))}
        </div>
      </details>
      <Aggiornato iso={q.data.info?.aggiornato_il} />
    </Pagina>
  );
};
